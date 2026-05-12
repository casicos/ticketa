-- 0028_sku_thumbnail_storage.sql
-- SKU 썸네일을 Supabase Storage 에 보관. 어드민이 SkuFormModal 에서 업로드/교체 가능.
-- public bucket — getPublicUrl 로 직접 노출되는 정적 자산.

-- 1) Bucket 생성 (idempotent)
insert into storage.buckets (id, name, public)
values ('sku-thumbnails', 'sku-thumbnails', true)
on conflict (id) do update set public = excluded.public;

-- 2) RLS — 모든 사용자(anon 포함) 읽기 허용
drop policy if exists "sku_thumbnails_public_read" on storage.objects;
create policy "sku_thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'sku-thumbnails');

-- 3) RLS — admin 만 insert/update/delete
--    JWT app_metadata.roles 에 'admin' 포함된 사용자만 통과.
drop policy if exists "sku_thumbnails_admin_write" on storage.objects;
create policy "sku_thumbnails_admin_write" on storage.objects
  for all
  using (
    bucket_id = 'sku-thumbnails'
    and coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false)
  )
  with check (
    bucket_id = 'sku-thumbnails'
    and coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin', false)
  );
