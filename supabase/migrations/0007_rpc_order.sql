-- 0007_rpc_order.sql
-- Phase 4-A: 주문 RPC 실구현 (create_order_transaction + restore_listing_stock)
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 4.2, 6, 6.1, Phase 4 step 27-33, Pre-mortem A, AC 9.3
--
-- 원칙
--   * 재고 잠금: SELECT ... FOR UPDATE 로 행 단위 잠금 (이중 판매 차단)
--   * 최저가/FIFO 매칭: ORDER BY unit_price ASC, listed_at ASC
--   * 자기 매입 차단: seller_id <> p_buyer
--   * signature 는 저장·감사용 (엄밀 비교는 프런트에서 클라이언트 signMatch 재계산으로)
--   * audit_events 에 상태 전이 기록

-- ------------------------------------------------------------------
-- 1) create_order_transaction
-- ------------------------------------------------------------------

create or replace function public.create_order_transaction(
    p_buyer uuid,
    p_items jsonb,           -- [{sku_id: uuid, quantity: int}, ...]
    p_preview_signature text,
    p_shipping jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order_id uuid;
    v_total int := 0;
    v_item jsonb;
    v_sku_id uuid;
    v_need int;
    v_allocated jsonb := '[]'::jsonb;
    v_allocation jsonb;
    v_canonical text;
    v_computed_sig text;
    v_listing record;
    v_take int;
    v_subtotal int;
    v_listing_id uuid;
    v_qty int;
begin
    if p_buyer is null then
        raise exception 'UNAUTHENTICATED';
    end if;

    -- 구매자 agent role 검증
    perform 1 from public.user_roles
     where user_id = p_buyer and role = 'agent' and revoked_at is null;
    if not found then
        raise exception 'FORBIDDEN: agent role required' using errcode = 'P0001';
    end if;

    -- 1단계: 각 sku_id 에 대해 listing 최저가 우선 매칭 (SELECT FOR UPDATE)
    for v_item in select * from jsonb_array_elements(p_items) loop
        v_sku_id := (v_item->>'sku_id')::uuid;
        v_need := (v_item->>'quantity')::int;

        if v_need is null or v_need <= 0 then
            raise exception 'INVALID_QUANTITY for sku %', v_sku_id;
        end if;

        -- 자기 매입 차단 + 재고 잠금
        for v_listing in
            select id, unit_price, quantity_remaining, seller_id, listed_at
              from public.listing
             where sku_id = v_sku_id
               and status = 'listed'
               and quantity_remaining > 0
               and seller_id <> p_buyer
             order by unit_price asc, listed_at asc
             for update
        loop
            exit when v_need = 0;
            v_take := least(v_need, v_listing.quantity_remaining);
            v_subtotal := v_take * v_listing.unit_price;
            v_need := v_need - v_take;
            v_total := v_total + v_subtotal;
            v_allocation := jsonb_build_object(
                'listing_id', v_listing.id,
                'seller_id',  v_listing.seller_id,
                'sku_id',     v_sku_id,
                'unit_price', v_listing.unit_price,
                'quantity',   v_take
            );
            v_allocated := v_allocated || jsonb_build_array(v_allocation);
        end loop;

        if v_need > 0 then
            raise exception 'STOCK_EMPTY: 재고 부족 sku=%', v_sku_id using errcode = 'P0002';
        end if;
    end loop;

    -- 2단계: signature 재계산 (저장·감사용)
    -- canonical 포맷: 'listing_id:unit_price:quantity' 를 listing_id 기준 정렬 후 '|' join
    -- client signMatch (JSON 직렬화 sha256) 와 포맷은 다르며, 엄밀 비교는 하지 않음.
    -- preview_matches 는 DB-self 기준 hint 로만 반환. PREVIEW_STALE 판정은 프런트에서.
    select string_agg(
               (a->>'listing_id') || ':' || (a->>'unit_price') || ':' || (a->>'quantity'),
               '|' order by (a->>'listing_id')
           )
      into v_canonical
      from jsonb_array_elements(v_allocated) a;

    v_computed_sig := encode(digest(coalesce(v_canonical, ''), 'sha256'), 'hex');

    -- 3단계: orders insert
    insert into public.orders (
        buyer_id, total_amount, status, payment_due_at, shipping_address
    ) values (
        p_buyer, v_total, 'pending_payment', now() + interval '24 hours', p_shipping
    ) returning id into v_order_id;

    -- 4단계: order_items insert + listing.quantity_remaining 감소
    for v_allocation in select * from jsonb_array_elements(v_allocated) loop
        v_listing_id := (v_allocation->>'listing_id')::uuid;
        v_qty := (v_allocation->>'quantity')::int;

        update public.listing
           set quantity_remaining = quantity_remaining - v_qty,
               status = case
                   when quantity_remaining - v_qty = 0 then 'sold_out'
                   else status
               end,
               closed_at = case
                   when quantity_remaining - v_qty = 0 then now()
                   else closed_at
               end
         where id = v_listing_id;

        insert into public.order_items (
            order_id, listing_id, sku_id, seller_id,
            quantity, unit_price, commission_per_unit, status
        ) values (
            v_order_id,
            v_listing_id,
            (v_allocation->>'sku_id')::uuid,
            (v_allocation->>'seller_id')::uuid,
            v_qty,
            (v_allocation->>'unit_price')::int,
            400,
            'pending'
        );
    end loop;

    -- 5단계: audit_events
    insert into public.audit_events (
        actor_id, entity_type, entity_id, event, to_state, metadata
    ) values (
        p_buyer,
        'order',
        v_order_id,
        'status_change:pending_payment',
        'pending_payment',
        jsonb_build_object(
            'preview_signature', p_preview_signature,
            'computed_signature', v_computed_sig,
            'total_amount', v_total,
            'allocation_count', jsonb_array_length(v_allocated)
        )
    );

    return jsonb_build_object(
        'order_id', v_order_id,
        'total_amount', v_total,
        'allocations', v_allocated,
        'computed_signature', v_computed_sig,
        'preview_matches', (p_preview_signature is null or p_preview_signature = v_computed_sig)
    );
end;
$$;

-- ------------------------------------------------------------------
-- 2) restore_listing_stock
-- ------------------------------------------------------------------

create or replace function public.restore_listing_stock(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order record;
    v_item record;
begin
    select id, status, buyer_id
      into v_order
      from public.orders
     where id = p_order
     for update;

    if not found then
        raise exception 'ORDER_NOT_FOUND';
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
            v_order.buyer_id,
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
        v_order.buyer_id,
        'order',
        p_order,
        'status_change:cancelled',
        v_order.status,
        'cancelled',
        '{}'::jsonb
    );
end;
$$;
