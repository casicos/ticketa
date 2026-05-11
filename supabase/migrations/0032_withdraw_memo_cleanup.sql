-- 0032_withdraw_memo_cleanup.sql
-- mileage_ledger.memo 가 클라이언트에 노출되는데 "출금 신청 #3" 같은 내부 id 포함은 어색.
-- 출금 신청/반려 RPC 가 작성하는 memo 를 사람 친화형으로 단순화.

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

  update public.mileage_accounts
    set cash_balance = cash_balance - p_amount, updated_at = now()
    where user_id = p_user_id;

  insert into public.withdraw_requests(user_id, amount, bank_code, account_number_last4, account_holder, status)
    values (p_user_id, p_amount, p_bank_code, p_account_number_last4, p_account_holder, 'requested')
    returning id into v_id;

  insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_withdraw_id, memo)
    values (p_user_id, 'withdraw', -p_amount,
            (select cash_balance + pg_locked from public.mileage_accounts where user_id = p_user_id),
            'cash', v_id, '출금 신청');

  return v_id;
end;
$$;

create or replace function public.resolve_withdraw(
  p_admin uuid,
  p_withdraw bigint,
  p_status text,
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
    update public.mileage_accounts
      set cash_balance = cash_balance + v_req.amount, updated_at = now()
      where user_id = v_req.user_id;
    insert into public.mileage_ledger(user_id, type, amount, balance_after, bucket, related_withdraw_id, memo)
      values (v_req.user_id, 'refund', v_req.amount,
              (select cash_balance + pg_locked from public.mileage_accounts where user_id = v_req.user_id),
              'cash', p_withdraw, '출금 반려 환불');
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

-- 기존 row 의 "출금 신청 #N" / "출금 반려 #N" 도 정리
update public.mileage_ledger
   set memo = '출금 신청'
 where memo ~ '^출금 신청 #';
update public.mileage_ledger
   set memo = '출금 반려 환불'
 where memo ~ '^출금 반려 #';
