-- 0013_listing_rls_mvp.sql
-- Wave 2: /catalog 는 "매입 가능 매물" 리스트로 재편된다.
-- 새 플로우에서는 listing 상태가 submitted → purchased → handed_over → received → verified
--   → completed / cancelled 로만 전이하며, 더 이상 'listed' 상태는 존재하지 않는다.
-- 따라서 기존 listing_public_listed 정책(status='listed')은 의미가 없다.

-- 1) 기존 public listed 정책 제거
drop policy if exists listing_public_listed on public.listing;

-- 2) agent / admin 은 매입 가능한(submitted) 매물 select 가능
drop policy if exists listing_catalog_readable on public.listing;
create policy listing_catalog_readable on public.listing
  for select using (
    status = 'submitted'
    and (
      coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'agent', false)
      or coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false)
    )
  );

-- 3) buyer 본인은 자신이 매입한 listing 조회 가능
drop policy if exists listing_buyer_own on public.listing;
create policy listing_buyer_own on public.listing
  for select using (buyer_id = auth.uid());
