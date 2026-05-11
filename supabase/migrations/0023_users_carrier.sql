-- 0023_users_carrier.sql
-- 본인인증 단계에서 받은 통신사 정보를 users 테이블에 저장.
-- 값: skt | kt | lgu | mvno_skt | mvno_kt (verify-phone-form.tsx 의 CARRIERS 와 일치)
-- 향후 PASS 본인인증·KISA 신고 시 통신사 매핑이 필요해서 보관.

alter table public.users
  add column if not exists carrier text;

alter table public.users
  drop constraint if exists users_carrier_check;
alter table public.users
  add constraint users_carrier_check
    check (carrier is null or carrier in ('skt', 'kt', 'lgu', 'mvno_skt', 'mvno_kt'));
