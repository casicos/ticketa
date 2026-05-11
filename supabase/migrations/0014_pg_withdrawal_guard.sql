-- 0014_pg_withdrawal_guard.sql
-- 카드깡 방지: 충전 경로 분리 (cash vs pg).
--   cash_balance  : 무통장입금 / 판매 정산 / 환불 → 즉시 출금 가능
--   pg_locked     : PG 충전 → 거래에 쓰여야만 출금 가능 (선소진)
-- 거래 차감 시 pg_locked 먼저 차감, 부족분만 cash_balance 에서 차감.
-- 판매자가 받는 정산 / 환불로 들어오는 돈은 cash_balance 로 적립 (이미 거래를 거쳤으므로).

-- ---------------------------------------------------------------------------
-- 1. mileage_accounts 버킷 분리
-- ---------------------------------------------------------------------------
alter table public.mileage_accounts
  add column if not exists cash_balance int not null default 0 check (cash_balance >= 0),
  add column if not exists pg_locked int not null default 0 check (pg_locked >= 0);

-- 기존 balance (있을 경우)를 cash_balance 로 이전 (실제 운영 데이터 없는 MVP 초기).
update public.mileage_accounts
   set cash_balance = balance, pg_locked = 0
 where balance > 0 and cash_balance = 0;

-- balance 는 generated virtual column 으로 교체 — 레거시 호환용.
-- Postgres generated (stored) 로 덮어쓰면 기존 int 컬럼과 충돌 → 컬럼 drop 후 추가.
alter table public.mileage_accounts drop column if exists balance;
alter table public.mileage_accounts
  add column balance int generated always as (cash_balance + pg_locked) stored;

-- ---------------------------------------------------------------------------
-- 2. charge_requests 에 충전 경로 구분 (method 로 이미 구분됨)
--    승인 시 credit 대상 bucket 결정: bank_transfer → cash, pg → pg_locked
-- ---------------------------------------------------------------------------
-- charge_requests.method 는 이미 존재 ('bank_transfer' | 'pg')

-- ---------------------------------------------------------------------------
-- 3. mileage_ledger.bucket 컬럼 (어느 버킷에서 증감됐는지 추적)
-- ---------------------------------------------------------------------------
alter table public.mileage_ledger
  add column if not exists bucket text not null default 'cash'
  check (bucket in ('cash', 'pg'));

-- ---------------------------------------------------------------------------
-- 4. credit_mileage 재정의 — 구 시그니처 drop 후 버킷 인자 포함해 재생성
-- ---------------------------------------------------------------------------
drop function if exists public.credit_mileage(uuid, int, text, uuid, bigint, bigint, text);
create or replace function public.credit_mileage(
  p_user_id uuid,
  p_amount int,
  p_type text,
  p_bucket text,              -- 'cash' | 'pg'
  p_related_listing uuid,
  p_related_charge bigint,
  p_related_withdraw bigint,
  p_memo text
) returns int
language plpgsql security definer as $$
declare
  v_cash int;
  v_pg int;
  v_total int;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_bucket not in ('cash','pg') then raise exception 'INVALID_BUCKET: %', p_bucket; end if;

  insert into public.mileage_accounts(user_id, cash_balance, pg_locked) values (p_user_id, 0, 0)
    on conflict (user_id) do nothing;

  if p_bucket = 'cash' then
    update public.mileage_accounts
       set cash_balance = cash_balance + p_amount, updated_at = now()
     where user_id = p_user_id
     returning cash_balance, pg_locked into v_cash, v_pg;
  else
    update public.mileage_accounts
       set pg_locked = pg_locked + p_amount, updated_at = now()
     where user_id = p_user_id
     returning cash_balance, pg_locked into v_cash, v_pg;
  end if;

  v_total := v_cash + v_pg;
  insert into public.mileage_ledger(
    user_id, type, amount, balance_after, bucket,
    related_listing_id, related_charge_id, related_withdraw_id, memo
  ) values (
    p_user_id, coalesce(p_type, 'credit'), p_amount, v_total, p_bucket,
    p_related_listing, p_related_charge, p_related_withdraw, p_memo
  );
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. debit_mileage 재정의 — pg_locked 선소진 후 cash_balance 사용
-- ---------------------------------------------------------------------------
create or replace function public.debit_mileage(
  p_user_id uuid,
  p_amount int,
  p_type text,
  p_related_listing uuid,
  p_memo text
) returns int
language plpgsql security definer as $$
declare
  v_cash int;
  v_pg int;
  v_total int;
  v_from_pg int;
  v_from_cash int;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select cash_balance, pg_locked into v_cash, v_pg
    from public.mileage_accounts
   where user_id = p_user_id
   for update;

  if v_cash is null then
    insert into public.mileage_accounts(user_id, cash_balance, pg_locked) values (p_user_id, 0, 0)
      on conflict (user_id) do nothing;
    v_cash := 0; v_pg := 0;
  end if;

  if v_cash + v_pg < p_amount then
    raise exception 'SHORT_BALANCE: need=% have=%', p_amount, v_cash + v_pg;
  end if;

  -- pg_locked 부터 선소진
  v_from_pg := least(p_amount, v_pg);
  v_from_cash := p_amount - v_from_pg;

  update public.mileage_accounts
     set pg_locked = pg_locked - v_from_pg,
         cash_balance = cash_balance - v_from_cash,
         updated_at = now()
   where user_id = p_user_id
   returning cash_balance, pg_locked into v_cash, v_pg;
  v_total := v_cash + v_pg;

  -- 버킷별 원장 기록 (각각 insert)
  if v_from_pg > 0 then
    insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_listing_id, memo)
      values (p_user_id, coalesce(p_type,'spend'), -v_from_pg, v_total, 'pg', p_related_listing,
              coalesce(p_memo,'') || ' [pg bucket]');
  end if;
  if v_from_cash > 0 then
    insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_listing_id, memo)
      values (p_user_id, coalesce(p_type,'spend'), -v_from_cash, v_total, 'cash', p_related_listing,
              coalesce(p_memo,'') || ' [cash bucket]');
  end if;

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. purchase_listing / complete_listing / cancel_listing 재정의
--    - 차감은 신 debit_mileage (선소진 로직 자동)
--    - 정산/환불로 들어오는 마일리지는 cash 버킷으로 credit (거래를 거쳤으므로 출금 가능)
-- ---------------------------------------------------------------------------
create or replace function public.purchase_listing(
  p_buyer uuid,
  p_listing uuid
) returns jsonb
language plpgsql security definer as $$
declare
  v_listing record;
  v_sku record;
  v_balance int;
  v_cash int;
  v_pg int;
  v_gross int;
  v_commission int;
  v_seller_net int;
begin
  if p_buyer is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (select 1 from public.user_roles
    where user_id = p_buyer and role in ('agent','admin') and revoked_at is null)
  then raise exception 'FORBIDDEN: agent or admin role required'; end if;

  select * into v_listing from public.listing where id = p_listing for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.status <> 'submitted' then raise exception 'INVALID_STATE: %', v_listing.status; end if;
  if v_listing.seller_id = p_buyer then raise exception 'SELF_PURCHASE_FORBIDDEN'; end if;

  select * into v_sku from public.sku where id = v_listing.sku_id;
  if not found then raise exception 'SKU_NOT_FOUND'; end if;

  v_gross := v_listing.quantity_offered * v_listing.unit_price;
  if v_sku.commission_type = 'fixed' then
    v_commission := v_sku.commission_amount * v_listing.quantity_offered;
  else
    v_commission := (v_gross * v_sku.commission_amount) / 10000;
  end if;
  v_seller_net := v_gross - v_commission;

  select cash_balance, pg_locked into v_cash, v_pg
    from public.mileage_accounts where user_id = p_buyer for update;
  v_balance := coalesce(v_cash,0) + coalesce(v_pg,0);
  if v_balance < v_gross then
    return jsonb_build_object(
      'ok', false, 'code', 'SHORT_BALANCE',
      'needed', v_gross, 'balance', v_balance,
      'shortage', v_gross - v_balance
    );
  end if;

  -- 신 debit_mileage 가 pg 먼저, 부족 시 cash 로 선소진
  perform public.debit_mileage(p_buyer, v_gross, 'spend', p_listing,
    format('매입: listing=%s', p_listing));

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

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_buyer, 'listing', p_listing, 'status_change:purchased', 'submitted', 'purchased',
          jsonb_build_object('gross', v_gross, 'commission', v_commission, 'seller_net', v_seller_net));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_purchased', '매물이 매입됐어요',
          '실물을 안내받은 주소로 발송 후 인계 확인해주세요.',
          format('/sell/listings/%s', p_listing));

  return jsonb_build_object('ok', true, 'listing_id', p_listing, 'gross', v_gross,
                            'commission', v_commission, 'seller_net', v_seller_net);
end;
$$;

create or replace function public.complete_listing(
  p_actor uuid,
  p_listing uuid
) returns void
language plpgsql security definer as $$
declare v_listing record;
begin
  select * into v_listing from public.listing where id = p_listing for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.status <> 'verified' then raise exception 'INVALID_STATE: %', v_listing.status; end if;
  if v_listing.buyer_id <> p_actor then raise exception 'FORBIDDEN'; end if;

  update public.listing set status = 'completed', completed_at = now() where id = p_listing;

  -- 판매자 정산: cash 버킷 (거래 완료 → 출금 가능한 돈)
  perform public.credit_mileage(
    v_listing.seller_id, v_listing.seller_net_amount, 'settle', 'cash', p_listing, null, null,
    format('정산: listing=%s gross=%s commission=%s', p_listing, v_listing.gross_amount, v_listing.commission_total)
  );

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_actor, 'listing', p_listing, 'status_change:completed', 'verified', 'completed',
          jsonb_build_object('settled_amount', v_listing.seller_net_amount));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_settled', '정산이 완료됐어요',
          format('%s 마일리지가 적립됐습니다.', v_listing.seller_net_amount),
          format('/sell/listings/%s', p_listing));
end;
$$;

create or replace function public.cancel_listing(
  p_admin uuid,
  p_listing uuid,
  p_reason text
) returns void
language plpgsql security definer as $$
declare v_listing record;
begin
  if not exists (select 1 from public.user_roles where user_id = p_admin and role = 'admin' and revoked_at is null)
  then raise exception 'FORBIDDEN'; end if;
  select * into v_listing from public.listing where id = p_listing for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.status = 'completed' then raise exception 'ALREADY_COMPLETED'; end if;
  if v_listing.status = 'cancelled' then return; end if;

  -- 구매자 환불: cash 버킷 (이미 거래 진행 → 세탁 완료로 간주. 운영 결정 가능한 지점이지만
  -- MVP 는 환불된 돈도 출금 가능하게 — 구매자 보호 우선)
  if v_listing.buyer_id is not null and v_listing.gross_amount is not null then
    perform public.credit_mileage(
      v_listing.buyer_id, v_listing.gross_amount, 'refund', 'cash', p_listing, null, null,
      format('취소 환불: listing=%s reason=%s', p_listing, p_reason)
    );
  end if;

  update public.listing set status = 'cancelled', cancelled_at = now(),
    cancelled_by = p_admin, cancel_reason = p_reason
    where id = p_listing;

  insert into public.audit_events(actor_id, entity_type, entity_id, event, from_state, to_state, metadata)
  values (p_admin, 'listing', p_listing, 'status_change:cancelled', v_listing.status, 'cancelled',
          jsonb_build_object('reason', p_reason, 'refund_amount', v_listing.gross_amount));

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_listing.seller_id, 'listing_cancelled', '거래가 취소됐어요', p_reason, format('/sell/listings/%s', p_listing));
  if v_listing.buyer_id is not null then
    insert into public.notifications(user_id, kind, title, body, link_to)
    values (v_listing.buyer_id, 'listing_cancelled', '거래가 취소됐어요',
            format('%s 마일리지가 환불됐습니다.', v_listing.gross_amount), format('/buy/orders/%s', p_listing));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. 출금 신청 검증 RPC — cash_balance >= amount 만 허용
-- ---------------------------------------------------------------------------
create or replace function public.request_withdraw(
  p_user_id uuid,
  p_amount int,
  p_bank_code text,
  p_account_number_last4 text,
  p_account_holder text
) returns bigint
language plpgsql security definer as $$
declare
  v_cash int;
  v_id bigint;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select cash_balance into v_cash from public.mileage_accounts where user_id = p_user_id for update;
  if v_cash is null or v_cash < p_amount then
    raise exception 'INSUFFICIENT_WITHDRAWABLE: cash=%, need=%', coalesce(v_cash,0), p_amount;
  end if;

  -- 출금 신청 시점에 cash_balance 에서 hold (차감). 상태 rejected 시 복원.
  update public.mileage_accounts
    set cash_balance = cash_balance - p_amount, updated_at = now()
    where user_id = p_user_id;

  insert into public.withdraw_requests(user_id, amount, bank_code, account_number_last4, account_holder, status)
    values (p_user_id, p_amount, p_bank_code, p_account_number_last4, p_account_holder, 'requested')
    returning id into v_id;

  insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_withdraw_id, memo)
    values (p_user_id, 'withdraw', -p_amount,
            (select cash_balance + pg_locked from public.mileage_accounts where user_id = p_user_id),
            'cash', v_id, format('출금 신청 #%s', v_id));

  return v_id;
end;
$$;

-- 어드민이 출금 완료/반려
create or replace function public.resolve_withdraw(
  p_admin uuid,
  p_withdraw bigint,
  p_status text,           -- 'completed' | 'rejected' | 'processing'
  p_memo text
) returns void
language plpgsql security definer as $$
declare v_req record;
begin
  if not exists (select 1 from public.user_roles where user_id = p_admin and role = 'admin' and revoked_at is null)
  then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('completed','rejected','processing') then raise exception 'INVALID_STATUS'; end if;

  select * into v_req from public.withdraw_requests where id = p_withdraw for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_req.status = 'completed' then raise exception 'ALREADY_COMPLETED'; end if;

  if p_status = 'rejected' then
    -- 홀드된 cash 복원
    update public.mileage_accounts
      set cash_balance = cash_balance + v_req.amount, updated_at = now()
      where user_id = v_req.user_id;
    insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_withdraw_id, memo)
      values (v_req.user_id, 'refund', v_req.amount,
              (select cash_balance + pg_locked from public.mileage_accounts where user_id = v_req.user_id),
              'cash', p_withdraw, format('출금 반려 #%s', p_withdraw));
  end if;

  update public.withdraw_requests
    set status = p_status,
        processed_by = p_admin,
        admin_memo = coalesce(p_memo, admin_memo),
        completed_at = case when p_status = 'completed' then now() else completed_at end
    where id = p_withdraw;

  insert into public.notifications(user_id, kind, title, body, link_to)
  values (v_req.user_id, 'withdraw_' || p_status,
    case p_status
      when 'completed' then '출금이 완료됐어요'
      when 'rejected' then '출금 신청이 반려됐어요'
      else '출금 처리 중'
    end,
    coalesce(p_memo, ''),
    '/account/mileage');
end;
$$;

grant execute on function public.credit_mileage to authenticated;
grant execute on function public.debit_mileage to authenticated;
grant execute on function public.request_withdraw to authenticated;
grant execute on function public.resolve_withdraw to authenticated;
