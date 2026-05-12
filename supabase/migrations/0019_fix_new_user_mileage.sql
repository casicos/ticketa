-- 0019_fix_new_user_mileage.sql
-- 0014 에서 mileage_accounts.balance 를 GENERATED ALWAYS AS (cash_balance + pg_locked) STORED
-- 컬럼으로 재정의했는데, 0012 의 handle_new_user_mileage 트리거는 아직도
-- `insert into mileage_accounts (user_id, balance) values (new.id, 0)` 로 되어 있어
-- generated column 직접 insert 불가 에러 → 회원가입 시 "Database error saving new user".
-- handle_new_user_mileage 를 cash_balance / pg_locked 기반으로 재정의.

create or replace function public.handle_new_user_mileage() returns trigger
language plpgsql security definer as $$
begin
  insert into public.mileage_accounts (user_id, cash_balance, pg_locked)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
