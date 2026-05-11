-- 0024_listing_pre_verified_shipping.sql
--
-- 시나리오 [3] (P2P 사전검수 → [인증] 매물) 와 시나리오 [1] (에이전트 매물 빠른 발송)
-- 흐름을 위해 listing 에 다음 컬럼을 추가:
--   pre_verified bool   — 등록 시 사전 송부 옵션을 켰거나 (P2P 인증), 에이전트 매물.
--                          true 면 매입 즉시 verified 단계로 점프 → admin 발송으로 직행.
--   shipping_carrier    — 어드민이 발송 처리 시 입력. enum-like 텍스트.
--   tracking_no         — 송장번호. 어드민이 발송 처리 시 입력.
--
-- pre_verified 매물의 catalog 노출 규칙:
--   submitted AND (pre_verified = false OR verified_at IS NOT NULL)
--   → 검수 끝나기 전 매물은 카탈로그 미노출.
--

alter table public.listing
  add column if not exists pre_verified boolean not null default false;

alter table public.listing
  add column if not exists shipping_carrier text;

alter table public.listing
  add column if not exists tracking_no text;

-- 택배사 enum-like check (free text 허용 — '기타' 처리 위해 NULL/empty 허용).
alter table public.listing
  drop constraint if exists listing_shipping_carrier_check;
alter table public.listing
  add constraint listing_shipping_carrier_check
    check (
      shipping_carrier is null or shipping_carrier in (
        'kpost',         -- 우체국
        'cj',            -- CJ대한통운
        'hanjin',        -- 한진
        'lotte',         -- 롯데
        'logen',         -- 로젠
        'cvs_cu',        -- 편의점 CU
        'cvs_gs25',      -- 편의점 GS25
        'cvs_emart24',   -- 편의점 이마트24
        'cvs_seven',     -- 편의점 세븐일레븐
        'etc'            -- 기타
      )
    );

-- 카탈로그 공개 뷰가 있다면 갱신 필요 (현재는 listing 직접 조회). RLS 는 그대로.
comment on column public.listing.pre_verified is
  '사전검수 매물 (에이전트 또는 P2P 사전송부). true 면 매입 시 검수 단계 스킵하고 verified 로 직행.';
comment on column public.listing.shipping_carrier is
  '어드민이 발송 처리 시 선택한 택배사 코드.';
comment on column public.listing.tracking_no is
  '어드민이 발송 처리 시 입력한 송장번호.';
