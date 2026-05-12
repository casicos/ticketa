-- 0015_public_catalog_view.sql
-- /catalog 를 공개 시세 뷰로 변경. 비로그인 / 일반 사용자도 submitted 매물 목록을
-- 조회할 수 있어야 한다 (매입 권한은 agent/admin 으로 여전히 제한).

-- 기존 agent/admin 만 허용하던 정책 제거
drop policy if exists listing_catalog_readable on public.listing;

-- 누구나(anon/authenticated) submitted 상태 매물 SELECT 가능
create policy listing_public_catalog on public.listing
  for select using (status = 'submitted');
