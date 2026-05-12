-- 0010_rpc_security.sql
-- Critical 보안 수정: restore_listing_stock 호출자 권한 검증.
--
-- 배경:
--   0007_rpc_order.sql 의 restore_listing_stock 은 SECURITY DEFINER 이지만
--   caller 권한 검증이 없어 service-role 경유가 아닌 환경에선 누구나
--   임의 주문을 취소할 수 있었다.
--
-- 정책:
--   - auth.uid() IS NULL (service-role / transaction client 경유) → 허용.
--     이 경로로 들어오는 호출은 반드시 app 레벨에서 buyer/admin 검증 후 호출한다.
--   - auth.uid() = orders.buyer_id → 허용 (본인 취소)
--   - user_roles 에 admin role 이 revoked_at IS NULL 로 존재 → 허용
--   - 그 외 → FORBIDDEN 예외

create or replace function public.restore_listing_stock(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order record;
    v_item record;
    v_caller uuid := auth.uid();
    v_is_admin boolean;
begin
    select id, status, buyer_id
      into v_order
      from public.orders
     where id = p_order
     for update;

    if not found then
        raise exception 'ORDER_NOT_FOUND';
    end if;

    -- 호출자 검증: buyer 본인 또는 admin 만
    if v_caller is null then
        -- service-role 경유 (transaction client): auth.uid() null → 허용.
        -- app 레벨에서 buyer 본인 또는 admin 검증 후 호출해야 함.
        null;
    else
        select exists(
            select 1 from public.user_roles
             where user_id = v_caller
               and role = 'admin'
               and revoked_at is null
        ) into v_is_admin;

        if v_caller <> v_order.buyer_id and not v_is_admin then
            raise exception 'FORBIDDEN: only buyer or admin can cancel'
                using errcode = 'P0001';
        end if;
    end if;

    -- 이미 취소된 주문은 무시 (idempotent)
    if v_order.status = 'cancelled' then
        return;
    end if;

    -- pending_payment / payment_confirmed 에서만 취소·재고복원 가능
    if v_order.status not in ('pending_payment', 'payment_confirmed') then
        raise exception 'CANNOT_RESTORE_IN_STATE: %', v_order.status;
    end if;

    for v_item in
        select oi.id as item_id, oi.listing_id, oi.quantity
          from public.order_items oi
         where oi.order_id = p_order
           and oi.status = 'pending'
    loop
        update public.listing
           set quantity_remaining = quantity_remaining + v_item.quantity,
               status = case
                   when status = 'sold_out' and quantity_remaining + v_item.quantity > 0 then 'listed'
                   else status
               end,
               closed_at = case
                   when status = 'sold_out' then null
                   else closed_at
               end
         where id = v_item.listing_id;

        update public.order_items
           set status = 'cancelled_item', cancelled_at = now()
         where id = v_item.item_id;

        insert into public.audit_events (
            actor_id, entity_type, entity_id, event, from_state, to_state, metadata
        ) values (
            coalesce(v_caller, v_order.buyer_id),
            'order_item',
            v_item.item_id,
            'stock_restored',
            'pending',
            'cancelled_item',
            jsonb_build_object(
                'listing_id', v_item.listing_id,
                'restored_qty', v_item.quantity,
                'order_id', p_order
            )
        );
    end loop;

    update public.orders
       set status = 'cancelled', cancelled_at = now()
     where id = p_order;

    insert into public.audit_events (
        actor_id, entity_type, entity_id, event, from_state, to_state, metadata
    ) values (
        coalesce(v_caller, v_order.buyer_id),
        'order',
        p_order,
        'status_change:cancelled',
        v_order.status,
        'cancelled',
        '{}'::jsonb
    );
end;
$$;
