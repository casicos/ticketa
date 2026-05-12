-- 0012_mileage_refactor.sql
-- Wave 1: 마일리지(1 mileage = 1 KRW) 통화 + 6단계 리스팅 상태머신 + SKU별 수수료 설정
-- 참조: b2c-giftcard-broker-mvp Wave 1
--
-- 원칙
--   * 모든 거래는 마일리지로 일어남 (충전 → 매입 → 정산 → 출금)
--   * listing 6단계: submitted → purchased → handed_over → received → verified → completed (+ cancelled)
--   * SKU별 수수료 설정 (fixed 정량 / percent 요율, basis points)
--   * 기존 orders/order_items/payouts 테이블은 보존 (deprecated, c2c M4에서 재활용 예정)
--   * 기존 RPC (create_order_transaction, restore_listing_stock, release_payout)는 deprecated 예외로 덮음
--   * 기존 payout 자동 생성 / drift 감지 트리거는 drop (새 플로우에선 fire 안 됨)

-- ------------------------------------------------------------------
-- 1. SKU 수수료 설정 컬럼 추가
-- ------------------------------------------------------------------

alter table public.sku
  add column if not exists commission_type text not null default 'fixed',
  add column if not exists commission_amount int not null default 400,
  add column if not exists commission_charged_to text not null default 'seller';

-- 기존 체크 없이 새 체크 제약 추가 (add column 시 default 로 이미 valid)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'sku_commission_type_check'
  ) then
    alter table public.sku
      add constraint sku_commission_type_check
      check (commission_type in ('fixed', 'percent'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'sku_commission_charged_to_check'
  ) then
    alter table public.sku
      add constraint sku_commission_charged_to_check
      check (commission_charged_to in ('seller', 'buyer', 'both'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'sku_commission_amount_nonneg'
  ) then
    alter table public.sku
      add constraint sku_commission_amount_nonneg
      check (commission_amount >= 0);
  end if;
end $$;

-- ------------------------------------------------------------------
-- 2. listing 상태 enum 변경 + buyer/수수료 스냅샷 컬럼 추가
-- ------------------------------------------------------------------

-- 2-1. 기존 status 값 매핑 (listed/sold_out 는 MVP 데이터 거의 없음)
update public.listing
   set status = 'submitted'
 where status in ('listed', 'sold_out');

-- 2-2. 기존 CHECK 제거 + 새 CHECK
alter table public.listing drop constraint if exists listing_status_check;
alter table public.listing
  add constraint listing_status_check check (
    status in (
      'submitted',    -- 판매자 등록
      'purchased',    -- 매입 확정 (마일리지 차감됨)
      'handed_over',  -- 판매자 인계 확인
      'received',     -- 중간업체(어드민) 수령
      'verified',     -- 검증 완료
      'completed',    -- 구매자 인수 확인 (정산 완료)
      'cancelled'     -- 어드민 취소
    )
  );

-- 2-3. buyer/스냅샷 컬럼 추가
alter table public.listing
  add column if not exists buyer_id uuid references public.users(id),
  add column if not exists purchased_at timestamptz,
  add column if not exists handed_over_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists commission_type text,
  add column if not exists commission_amount int,
  add column if not exists commission_charged_to text,
  add column if not exists gross_amount int,
  add column if not exists commission_total int,
  add column if not exists seller_net_amount int;

create index if not exists ix_listing_buyer on public.listing (buyer_id);
create index if not exists ix_listing_status on public.listing (status);

-- ------------------------------------------------------------------
-- 3. 마일리지 계좌 + 원장
-- ------------------------------------------------------------------

create table if not exists public.mileage_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 전 사용자에게 0 잔액 시드
insert into public.mileage_accounts (user_id, balance)
  select id, 0 from public.users
  on conflict (user_id) do nothing;

-- users insert 시 mileage_accounts 자동 생성
create or replace function public.handle_new_user_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mileage_accounts (user_id, balance)
    values (new.id, 0)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_new_user_mileage on public.users;
create trigger trg_new_user_mileage
  after insert on public.users
  for each row execute function public.handle_new_user_mileage();

-- 마일리지 원장 (모든 변동 이력)
create table if not exists public.mileage_ledger (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('charge','spend','refund','settle','withdraw','adjust')),
  amount int not null,  -- 양수: 잔액 증가, 음수: 감소
  balance_after int not null,
  related_listing_id uuid references public.listing(id) on delete set null,
  related_charge_id bigint,    -- charge_requests.id
  related_withdraw_id bigint,  -- withdraw_requests.id
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists ix_mileage_ledger_user
  on public.mileage_ledger (user_id, created_at desc);
create index if not exists ix_mileage_ledger_listing
  on public.mileage_ledger (related_listing_id);

-- RLS
alter table public.mileage_accounts enable row level security;

drop policy if exists mileage_accounts_self on public.mileage_accounts;
create policy mileage_accounts_self on public.mileage_accounts
  for select using (user_id = auth.uid());

drop policy if exists mileage_accounts_admin on public.mileage_accounts;
create policy mileage_accounts_admin on public.mileage_accounts
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

alter table public.mileage_ledger enable row level security;

drop policy if exists mileage_ledger_self on public.mileage_ledger;
create policy mileage_ledger_self on public.mileage_ledger
  for select using (user_id = auth.uid());

drop policy if exists mileage_ledger_admin on public.mileage_ledger;
create policy mileage_ledger_admin on public.mileage_ledger
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- 4. 충전/출금 요청
-- ------------------------------------------------------------------

create table if not exists public.charge_requests (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  amount int not null check (amount > 0),
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer','pg')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled')),
  depositor_name text,
  admin_memo text,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.users(id),
  cancelled_at timestamptz,
  cancel_reason text
);

create index if not exists ix_charge_requests_status
  on public.charge_requests (status, requested_at);

alter table public.charge_requests enable row level security;

drop policy if exists cr_self on public.charge_requests;
create policy cr_self on public.charge_requests
  for select using (user_id = auth.uid());

drop policy if exists cr_self_insert on public.charge_requests;
create policy cr_self_insert on public.charge_requests
  for insert with check (user_id = auth.uid());

drop policy if exists cr_admin on public.charge_requests;
create policy cr_admin on public.charge_requests
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

create table if not exists public.withdraw_requests (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  amount int not null check (amount > 0),
  fee int not null default 0 check (fee >= 0),
  bank_code text not null,
  account_number_last4 text not null,
  account_holder text not null,
  status text not null default 'requested'
    check (status in ('requested','processing','completed','rejected')),
  admin_memo text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  processed_by uuid references public.users(id)
);

create index if not exists ix_withdraw_requests_status
  on public.withdraw_requests (status, requested_at);

alter table public.withdraw_requests enable row level security;

drop policy if exists wr_self on public.withdraw_requests;
create policy wr_self on public.withdraw_requests
  for select using (user_id = auth.uid());

drop policy if exists wr_self_insert on public.withdraw_requests;
create policy wr_self_insert on public.withdraw_requests
  for insert with check (user_id = auth.uid());

drop policy if exists wr_admin on public.withdraw_requests;
create policy wr_admin on public.withdraw_requests
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- 5. 거래 취소 요청
-- ------------------------------------------------------------------

create table if not exists public.cancellation_requests (
  id bigserial primary key,
  listing_id uuid not null references public.listing(id) on delete cascade,
  requested_by uuid not null references public.users(id),
  role_at_request text not null check (role_at_request in ('seller','buyer')),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id),
  admin_memo text
);

create index if not exists ix_cancellation_requests_status
  on public.cancellation_requests (status, requested_at);

alter table public.cancellation_requests enable row level security;

drop policy if exists cxr_self on public.cancellation_requests;
create policy cxr_self on public.cancellation_requests
  for select using (requested_by = auth.uid());

drop policy if exists cxr_self_insert on public.cancellation_requests;
create policy cxr_self_insert on public.cancellation_requests
  for insert with check (requested_by = auth.uid());

drop policy if exists cxr_admin on public.cancellation_requests;
create policy cxr_admin on public.cancellation_requests
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- 6. app 설정 테이블
-- ------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

insert into public.app_settings(key, value) values
  ('withdraw_fee_krw', '{"type":"fixed","amount":0}'::jsonb)
  on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings
  for select using (true);

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- ------------------------------------------------------------------
-- 7. 기존 RPC/트리거 deprecation
-- ------------------------------------------------------------------
-- MVP 에선 이 경로 사용 안 함. c2c M4 에서 재활용 예정.

create or replace function public.create_order_transaction(
  p_buyer uuid,
  p_items jsonb,
  p_preview_signature text,
  p_shipping jsonb
)
returns jsonb
language plpgsql
as $$
begin
  raise exception 'deprecated: use purchase_listing for MVP mileage flow';
end;
$$;

create or replace function public.restore_listing_stock(p_order uuid)
returns void
language plpgsql
as $$
begin
  raise exception 'deprecated: MVP mileage flow uses cancel_listing';
end;
$$;

-- 기존 payout 자동 생성 트리거도 새 플로우에선 fire 안 됨
drop trigger if exists trg_create_payout_on_fulfilled on public.order_items;
drop trigger if exists trg_assert_payout_drift on public.payouts;

-- 기존 order/order_items 기반 notification 트리거도 새 플로우에선 fire 안 됨 (orders 경로 미사용)
drop trigger if exists trg_notify_order_status on public.orders;
drop trigger if exists trg_notify_new_order_seller on public.order_items;
drop trigger if exists trg_notify_payout_released on public.payouts;

-- ------------------------------------------------------------------
-- 8. 새 마일리지 RPC
-- ------------------------------------------------------------------

-- 8-1. debit_mileage: 차감. 잔액 부족 시 SHORT_BALANCE 예외
create or replace function public.debit_mileage(
  p_user_id uuid,
  p_amount int,
  p_type text,
  p_related_listing uuid,
  p_memo text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select balance
    into v_balance
    from public.mileage_accounts
   where user_id = p_user_id
   for update;

  if v_balance is null then
    insert into public.mileage_accounts(user_id, balance)
      values (p_user_id, 0)
      on conflict (user_id) do nothing;
    v_balance := 0;
  end if;

  if v_balance < p_amount then
    raise exception 'SHORT_BALANCE: need=% have=%', p_amount, v_balance;
  end if;

  update public.mileage_accounts
     set balance = balance - p_amount,
         updated_at = now()
   where user_id = p_user_id
  returning balance into v_balance;

  insert into public.mileage_ledger(
    user_id, type, amount, balance_after, related_listing_id, memo
  ) values (
    p_user_id,
    coalesce(p_type, 'spend'),
    -p_amount,
    v_balance,
    p_related_listing,
    p_memo
  );

  return v_balance;
end;
$$;

-- 8-2. credit_mileage: 증가
create or replace function public.credit_mileage(
  p_user_id uuid,
  p_amount int,
  p_type text,
  p_related_listing uuid,
  p_related_charge bigint,
  p_related_withdraw bigint,
  p_memo text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.mileage_accounts(user_id, balance)
    values (p_user_id, 0)
    on conflict (user_id) do nothing;

  update public.mileage_accounts
     set balance = balance + p_amount,
         updated_at = now()
   where user_id = p_user_id
  returning balance into v_balance;

  insert into public.mileage_ledger(
    user_id, type, amount, balance_after,
    related_listing_id, related_charge_id, related_withdraw_id, memo
  ) values (
    p_user_id,
    coalesce(p_type, 'credit'),
    p_amount,
    v_balance,
    p_related_listing,
    p_related_charge,
    p_related_withdraw,
    p_memo
  );

  return v_balance;
end;
$$;

-- 8-3. purchase_listing: 매입 확정 (상태 submitted → purchased, 구매자 마일리지 차감)
create or replace function public.purchase_listing(
  p_buyer uuid,
  p_listing uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_sku record;
  v_balance int;
  v_gross int;
  v_commission int;
  v_seller_net int;
begin
  if p_buyer is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  -- agent 또는 admin 역할 필수
  if not exists (
    select 1 from public.user_roles
     where user_id = p_buyer
       and role in ('agent','admin')
       and revoked_at is null
  ) then
    raise exception 'FORBIDDEN: agent or admin role required';
  end if;

  select * into v_listing
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_listing.status <> 'submitted' then
    raise exception 'INVALID_STATE: %', v_listing.status;
  end if;

  if v_listing.seller_id = p_buyer then
    raise exception 'SELF_PURCHASE_FORBIDDEN';
  end if;

  select * into v_sku from public.sku where id = v_listing.sku_id;
  if not found then
    raise exception 'SKU_NOT_FOUND';
  end if;

  v_gross := v_listing.quantity_offered * v_listing.unit_price;

  -- 수수료 계산
  if v_sku.commission_type = 'fixed' then
    v_commission := v_sku.commission_amount * v_listing.quantity_offered;
  else
    -- percent (basis points). 10000 = 100.00%
    v_commission := (v_gross * v_sku.commission_amount) / 10000;
  end if;

  v_seller_net := v_gross - v_commission;

  -- balance 확인 (부족 시 SHORT_BALANCE ok:false 구조로 반환)
  select balance
    into v_balance
    from public.mileage_accounts
   where user_id = p_buyer
   for update;

  if v_balance is null or v_balance < v_gross then
    return jsonb_build_object(
      'ok', false,
      'code', 'SHORT_BALANCE',
      'needed', v_gross,
      'balance', coalesce(v_balance, 0),
      'shortage', v_gross - coalesce(v_balance, 0)
    );
  end if;

  -- 차감
  perform public.debit_mileage(
    p_buyer,
    v_gross,
    'spend',
    p_listing,
    format('매입: listing=%s', p_listing)
  );

  -- listing 업데이트
  update public.listing
     set status = 'purchased',
         buyer_id = p_buyer,
         purchased_at = now(),
         commission_type = v_sku.commission_type,
         commission_amount = v_sku.commission_amount,
         commission_charged_to = v_sku.commission_charged_to,
         gross_amount = v_gross,
         commission_total = v_commission,
         seller_net_amount = v_seller_net
   where id = p_listing;

  -- audit
  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_buyer,
    'listing',
    p_listing,
    'status_change:purchased',
    'submitted',
    'purchased',
    jsonb_build_object(
      'gross', v_gross,
      'commission', v_commission,
      'seller_net', v_seller_net
    )
  );

  -- 판매자 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (
    v_listing.seller_id,
    'listing_purchased',
    '매물이 매입됐어요',
    '매물이 매입 확정됐습니다. 실물을 안내받은 주소로 발송 후 인계 확인해주세요.',
    format('/sell/listings/%s', p_listing)
  );

  return jsonb_build_object(
    'ok', true,
    'listing_id', p_listing,
    'gross', v_gross,
    'commission', v_commission,
    'seller_net', v_seller_net
  );
end;
$$;

-- 8-4. complete_listing: 구매자 인수 확인 → 판매자 정산
create or replace function public.complete_listing(
  p_actor uuid,
  p_listing uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
begin
  select * into v_listing
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_listing.status <> 'verified' then
    raise exception 'INVALID_STATE: %', v_listing.status;
  end if;

  if v_listing.buyer_id is null or v_listing.buyer_id <> p_actor then
    raise exception 'FORBIDDEN';
  end if;

  update public.listing
     set status = 'completed',
         completed_at = now()
   where id = p_listing;

  -- 판매자 정산 (seller_net_amount)
  if v_listing.seller_net_amount is not null and v_listing.seller_net_amount > 0 then
    perform public.credit_mileage(
      v_listing.seller_id,
      v_listing.seller_net_amount,
      'settle',
      p_listing,
      null,
      null,
      format(
        '정산: listing=%s gross=%s commission=%s',
        p_listing, v_listing.gross_amount, v_listing.commission_total
      )
    );
  end if;

  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_actor,
    'listing',
    p_listing,
    'status_change:completed',
    'verified',
    'completed',
    jsonb_build_object('settled_amount', v_listing.seller_net_amount)
  );

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (
    v_listing.seller_id,
    'listing_settled',
    '정산이 완료됐어요',
    format('%s 마일리지가 적립됐습니다.', v_listing.seller_net_amount),
    format('/sell/listings/%s', p_listing)
  );
end;
$$;

-- 8-5. cancel_listing: 어드민 수동 취소 → 구매자 환불
create or replace function public.cancel_listing(
  p_admin uuid,
  p_listing uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_prev_status text;
begin
  if not exists (
    select 1 from public.user_roles
     where user_id = p_admin
       and role = 'admin'
       and revoked_at is null
  ) then
    raise exception 'FORBIDDEN: admin role required';
  end if;

  select * into v_listing
    from public.listing
   where id = p_listing
   for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND';
  end if;

  if v_listing.status = 'completed' then
    raise exception 'ALREADY_COMPLETED';
  end if;

  if v_listing.status = 'cancelled' then
    return;
  end if;

  v_prev_status := v_listing.status;

  -- 구매자가 이미 결제한 상태면 환불
  if v_listing.buyer_id is not null and v_listing.gross_amount is not null and v_listing.gross_amount > 0 then
    perform public.credit_mileage(
      v_listing.buyer_id,
      v_listing.gross_amount,
      'refund',
      p_listing,
      null,
      null,
      format('취소 환불: listing=%s reason=%s', p_listing, p_reason)
    );
  end if;

  update public.listing
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = p_admin,
         cancel_reason = p_reason
   where id = p_listing;

  insert into public.audit_events(
    actor_id, entity_type, entity_id, event, from_state, to_state, metadata
  ) values (
    p_admin,
    'listing',
    p_listing,
    'status_change:cancelled',
    v_prev_status,
    'cancelled',
    jsonb_build_object('reason', p_reason, 'refund_amount', v_listing.gross_amount)
  );

  -- 판매자 알림
  insert into public.notifications(user_id, kind, title, body, link_to)
  values (
    v_listing.seller_id,
    'listing_cancelled',
    '거래가 취소됐어요',
    p_reason,
    format('/sell/listings/%s', p_listing)
  );

  -- 구매자 알림 (있는 경우)
  if v_listing.buyer_id is not null then
    insert into public.notifications(user_id, kind, title, body, link_to)
    values (
      v_listing.buyer_id,
      'listing_cancelled',
      '거래가 취소됐어요',
      format('%s 마일리지가 환불됐습니다.', coalesce(v_listing.gross_amount, 0)),
      format('/buy/orders/%s', p_listing)
    );
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 9. grants
-- ------------------------------------------------------------------

grant execute on function public.debit_mileage(uuid, int, text, uuid, text) to authenticated;
grant execute on function public.credit_mileage(uuid, int, text, uuid, bigint, bigint, text) to authenticated;
grant execute on function public.purchase_listing(uuid, uuid) to authenticated;
grant execute on function public.complete_listing(uuid, uuid) to authenticated;
grant execute on function public.cancel_listing(uuid, uuid, text) to authenticated;
