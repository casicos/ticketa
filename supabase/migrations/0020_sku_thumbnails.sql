-- 0020_sku_thumbnails.sql
-- Add thumbnail_url column + reseed canonical 32 SKUs (5 brands × per-brand denominations).
-- 썸네일 자산: public/sku-thumbnails/{ak,galleria,hyundai,lotte,shinsegae}/{denomination}.webp
-- 디렉토리 'ssg' → brand '신세계백화점' (한국어 표기 유지). public 경로는 'shinsegae'.
-- 새 라인업에 없는 기존 SKU 는 is_active=false 로 비활성화 (delete 하면 listing FK 깨질 수 있어서 보존).

alter table public.sku add column if not exists thumbnail_url text;

-- 1) Upsert 32 canonical SKUs.
insert into public.sku (brand, denomination, display_order, is_active, thumbnail_url) values
  -- 롯데백화점 (7종)  display_order 100..94
  ('롯데백화점',     50000, 100, true, '/sku-thumbnails/lotte/50000.webp'),
  ('롯데백화점',    100000,  99, true, '/sku-thumbnails/lotte/100000.webp'),
  ('롯데백화점',     30000,  98, true, '/sku-thumbnails/lotte/30000.webp'),
  ('롯데백화점',     10000,  97, true, '/sku-thumbnails/lotte/10000.webp'),
  ('롯데백화점',      5000,  96, true, '/sku-thumbnails/lotte/5000.webp'),
  ('롯데백화점',    300000,  95, true, '/sku-thumbnails/lotte/300000.webp'),
  ('롯데백화점',    500000,  94, true, '/sku-thumbnails/lotte/500000.webp'),

  -- 현대백화점 (6종)  display_order 90..85
  ('현대백화점',     50000,  90, true, '/sku-thumbnails/hyundai/50000.webp'),
  ('현대백화점',    100000,  89, true, '/sku-thumbnails/hyundai/100000.webp'),
  ('현대백화점',     10000,  88, true, '/sku-thumbnails/hyundai/10000.webp'),
  ('현대백화점',      5000,  87, true, '/sku-thumbnails/hyundai/5000.webp'),
  ('현대백화점',    300000,  86, true, '/sku-thumbnails/hyundai/300000.webp'),
  ('현대백화점',    500000,  85, true, '/sku-thumbnails/hyundai/500000.webp'),

  -- 신세계백화점 (6종)  display_order 80..75
  ('신세계백화점',    50000,  80, true, '/sku-thumbnails/shinsegae/50000.webp'),
  ('신세계백화점',   100000,  79, true, '/sku-thumbnails/shinsegae/100000.webp'),
  ('신세계백화점',    10000,  78, true, '/sku-thumbnails/shinsegae/10000.webp'),
  ('신세계백화점',     5000,  77, true, '/sku-thumbnails/shinsegae/5000.webp'),
  ('신세계백화점',   300000,  76, true, '/sku-thumbnails/shinsegae/300000.webp'),
  ('신세계백화점',   500000,  75, true, '/sku-thumbnails/shinsegae/500000.webp'),

  -- 갤러리아백화점 (6종)  display_order 70..65
  ('갤러리아백화점',  50000,  70, true, '/sku-thumbnails/galleria/50000.webp'),
  ('갤러리아백화점', 100000,  69, true, '/sku-thumbnails/galleria/100000.webp'),
  ('갤러리아백화점',  10000,  68, true, '/sku-thumbnails/galleria/10000.webp'),
  ('갤러리아백화점',  70000,  67, true, '/sku-thumbnails/galleria/70000.webp'),
  ('갤러리아백화점', 300000,  66, true, '/sku-thumbnails/galleria/300000.webp'),
  ('갤러리아백화점', 500000,  65, true, '/sku-thumbnails/galleria/500000.webp'),

  -- AK백화점 (7종)  display_order 60..54
  ('AK백화점',        50000,  60, true, '/sku-thumbnails/ak/50000.webp'),
  ('AK백화점',       100000,  59, true, '/sku-thumbnails/ak/100000.webp'),
  ('AK백화점',        30000,  58, true, '/sku-thumbnails/ak/30000.webp'),
  ('AK백화점',        10000,  57, true, '/sku-thumbnails/ak/10000.webp'),
  ('AK백화점',         5000,  56, true, '/sku-thumbnails/ak/5000.webp'),
  ('AK백화점',       300000,  55, true, '/sku-thumbnails/ak/300000.webp'),
  ('AK백화점',       500000,  54, true, '/sku-thumbnails/ak/500000.webp')
on conflict (brand, denomination) do update set
  display_order = excluded.display_order,
  is_active     = excluded.is_active,
  thumbnail_url = excluded.thumbnail_url;

-- 2) 신규 라인업에 없는 기존 SKU 는 is_active=false (소프트 비활성화).
update public.sku set is_active = false
where (brand, denomination) not in (
    ('롯데백화점',     5000), ('롯데백화점',    10000), ('롯데백화점',    30000),
    ('롯데백화점',    50000), ('롯데백화점',   100000), ('롯데백화점',   300000),
    ('롯데백화점',   500000),
    ('현대백화점',     5000), ('현대백화점',    10000), ('현대백화점',    50000),
    ('현대백화점',   100000), ('현대백화점',   300000), ('현대백화점',   500000),
    ('신세계백화점',   5000), ('신세계백화점',  10000), ('신세계백화점',  50000),
    ('신세계백화점', 100000), ('신세계백화점', 300000), ('신세계백화점', 500000),
    ('갤러리아백화점', 10000), ('갤러리아백화점', 50000), ('갤러리아백화점', 70000),
    ('갤러리아백화점',100000), ('갤러리아백화점',300000), ('갤러리아백화점',500000),
    ('AK백화점',       5000), ('AK백화점',      10000), ('AK백화점',      30000),
    ('AK백화점',      50000), ('AK백화점',     100000), ('AK백화점',     300000),
    ('AK백화점',     500000)
  );
