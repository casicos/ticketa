-- 0008_payout.sql
-- Phase 5: 정산 시스템 — payout 자동 생성 트리거 + 정산 drift 감지 + release_payout 실구현
-- 참조: .omc/plans/b2c-giftcard-broker-mvp.md Section 6 payouts, Section 8 Phase 5 step 36-39,
--       Pre-mortem C (정산 drift), AC 9.5
--
-- 원칙
--   * order_items.status = 'fulfilled' 진입 시점에 payout 자동 생성 (pending)
--   * bank_code / account_number_last4 는 생성 시점 스냅샷 (계좌 변경 영향 없음)
--   * 활성 정산계좌 없으면 빈 문자열 스냅샷으로 payout 생성 (릴리즈 시 경고)
--   * release_payout 전이 전 drift 재검증 (order_item_sum vs payout_sum)
--   * admin role 은 user_roles.role = 'admin' AND revoked_at IS NULL 기준

-- ------------------------------------------------------------------
-- 1) create_payout_on_fulfilled — order_items fulfilled 전이 시 payout 자동 생성
-- ------------------------------------------------------------------

create or replace function public.create_payout_on_fulfilled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_acct record;
begin
    if new.status = 'fulfilled' and (old.status is distinct from 'fulfilled') then
        -- 활성 정산계좌 스냅샷 (없으면 v_acct.* = null)
        select bank_code, account_number_last4
          into v_acct
          from public.seller_payout_accounts
         where user_id = new.seller_id and is_active
         limit 1;

        -- 계좌 없어도 payout 은 생성 (bank_code/last4 이 빈 문자열이면 릴리즈 UI 에서 경고)
        insert into public.payouts (
            seller_id, order_item_id, gross_amount, commission_amount,
            status, bank_code, account_number_last4
        ) values (
            new.seller_id,
            new.id,
            new.quantity * new.unit_price,
            new.quantity * new.commission_per_unit,
            'pending',
            coalesce(v_acct.bank_code, ''),
            coalesce(v_acct.account_number_last4, '')
        )
        on conflict (order_item_id) do nothing;

        insert into public.audit_events (
            actor_id, entity_type, entity_id, event, to_state, metadata
        ) values (
            null,
            'payout',
            new.id,
            'payout_created:pending',
            'pending',
            jsonb_build_object('order_item_id', new.id)
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_create_payout_on_fulfilled on public.order_items;
create trigger trg_create_payout_on_fulfilled
    after update of status on public.order_items
    for each row execute function public.create_payout_on_fulfilled();

-- ------------------------------------------------------------------
-- 2) assert_payout_drift — 정산 drift 실시간 감지 (Pre-mortem C)
-- ------------------------------------------------------------------

create or replace function public.assert_payout_drift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_items_sum int;
    v_payouts_sum int;
begin
    if new.status = 'released' and (old.status is distinct from 'released') then
        select coalesce(sum(quantity * unit_price), 0)
          into v_items_sum
          from public.order_items
         where id = new.order_item_id;

        select coalesce(sum(gross_amount), 0)
          into v_payouts_sum
          from public.payouts
         where order_item_id = new.order_item_id;

        if v_items_sum <> v_payouts_sum then
            insert into public.error_log (
                route, server_action, error_code, message, metadata
            ) values (
                'db-trigger',
                'assert_payout_drift',
                'PAYOUT_DRIFT',
                format(
                    'order_item=% drift order_item_sum=% payout_sum=%',
                    new.order_item_id, v_items_sum, v_payouts_sum
                ),
                jsonb_build_object(
                    'payout_id', new.id,
                    'order_item_id', new.order_item_id
                )
            );
            raise exception 'PAYOUT_DRIFT on order_item % (sum=%, payout=%)',
                new.order_item_id, v_items_sum, v_payouts_sum;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_assert_payout_drift on public.payouts;
create trigger trg_assert_payout_drift
    before update of status on public.payouts
    for each row execute function public.assert_payout_drift();

-- ------------------------------------------------------------------
-- 3) release_payout — 실구현 (0004 의 "not implemented yet" 덮어쓰기)
-- ------------------------------------------------------------------

create or replace function public.release_payout(p_payout uuid, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_payout record;
    v_admin_role boolean;
begin
    -- admin role 검증
    select exists(
        select 1 from public.user_roles
         where user_id = p_admin and role = 'admin' and revoked_at is null
    ) into v_admin_role;
    if not v_admin_role then
        raise exception 'FORBIDDEN: admin role required' using errcode = 'P0001';
    end if;

    select * into v_payout from public.payouts where id = p_payout for update;
    if not found then
        raise exception 'PAYOUT_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_payout.status <> 'pending' then
        raise exception 'NON_RELEASABLE_STATE: %', v_payout.status using errcode = 'P0001';
    end if;

    update public.payouts
       set status = 'released',
           released_at = now(),
           released_by = p_admin
     where id = p_payout;

    insert into public.audit_events (
        actor_id, entity_type, entity_id, event, from_state, to_state, metadata
    ) values (
        p_admin,
        'payout',
        p_payout,
        'status_change:released',
        'pending',
        'released',
        jsonb_build_object(
            'gross', v_payout.gross_amount,
            'commission', v_payout.commission_amount,
            'net', v_payout.net_amount
        )
    );
end;
$$;
