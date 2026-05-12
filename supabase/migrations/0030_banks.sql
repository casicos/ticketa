-- 0030_banks.sql
-- 은행 마스터 테이블 — 한국 은행 코드 표준.
-- 사용처:
--   * platform_settings.bank_info : 플랫폼 무통장 입금 안내 계좌
--   * seller_payout_accounts.bank_code : 판매자 정산 계좌 (FK 는 아직 추가 안함 — 데이터 정합성 확인 후 추후)
--   * withdraw_requests.bank_code : 출금 신청 스냅샷
-- 어드민이 향후 별도 페이지에서 은행 추가/비활성화 가능.

create table if not exists public.banks (
  code text primary key,             -- 전국은행연합회 3자리 코드
  name text not null,
  brand_color text,                  -- "#FFB100" 형식. 썸네일 없을 때 폴백 배경.
  thumbnail_url text,                -- 로고 URL. null 이면 BankMark 가 글자 폴백.
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banks enable row level security;

drop policy if exists banks_public_read on public.banks;
create policy banks_public_read on public.banks for select using (true);

drop policy if exists banks_admin_write on public.banks;
create policy banks_admin_write on public.banks
  for all
  using (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false));

-- 시드: 기존 lib/domain/banks.ts 의 11개 은행 + 각 은행 브랜드 컬러
insert into public.banks (code, name, brand_color, display_order) values
  ('004', 'KB국민',     '#FFB100', 100),
  ('088', '신한',        '#0046FF', 99),
  ('020', '우리',        '#1E5BC6', 98),
  ('081', '하나',        '#008C95', 97),
  ('011', '농협',        '#009A4E', 96),
  ('003', '기업',        '#1E64A8', 95),
  ('090', '카카오뱅크',  '#FEE500', 94),
  ('089', '케이뱅크',    '#FF0066', 93),
  ('092', '토스뱅크',    '#0064FF', 92),
  ('007', '수협',        '#0083CB', 91),
  ('071', '우체국',      '#D52229', 90)
on conflict (code) do update
  set name          = excluded.name,
      brand_color   = excluded.brand_color,
      display_order = excluded.display_order;

-- platform_settings.bank_info 값 형식 마이그레이션: bank_name 문자열 → bank_code 키.
update public.platform_settings
  set value = jsonb_build_object(
    'bank_code', '088',                  -- 신한
    'account',   value->>'account',
    'holder',    value->>'holder'
  )
where key = 'bank_info'
  and value ? 'bank_name'
  and not (value ? 'bank_code');
