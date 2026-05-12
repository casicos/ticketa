-- 0029_platform_settings.sql
-- 플랫폼 설정 — key/value jsonb. 첫 사용처는 무통장입금 안내 계좌 (bank_info).
-- 어드민이 향후 별도 페이지에서 편집 (현재는 시드값 고정).

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.platform_settings enable row level security;

-- public read — 무통장 계좌 안내처럼 모든 회원에게 노출되는 정보를 다룸.
--   민감 설정은 별도 키로 두지 말고 다른 테이블 사용.
drop policy if exists ps_public_read on public.platform_settings;
create policy ps_public_read on public.platform_settings
  for select using (true);

-- admin write
drop policy if exists ps_admin_write on public.platform_settings;
create policy ps_admin_write on public.platform_settings
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- 시드: 무통장 입금 안내 계좌 — 운영 변경 시 admin 가 편집
insert into public.platform_settings (key, value)
values (
  'bank_info',
  jsonb_build_object(
    'bank_name', '신한은행',
    'account', '140-015-302230',
    'holder', '(주)명길 김광식'
  )
)
on conflict (key) do nothing;
