-- 0044 적용 이후 phone 만 추가 갱신. (070-7882-2144)
-- 어드민 UI 가 들어오면 더 이상 이런 마이그레이션은 안 만들어도 됨.

update public.platform_settings
   set value = value || jsonb_build_object('phone', '070-7882-2144'),
       updated_at = now()
 where key = 'business_address';
