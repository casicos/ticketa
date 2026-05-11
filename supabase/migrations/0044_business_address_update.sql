-- 사업장 소재지 실주소 반영.
-- 어드민 UI 가 들어오기 전까지 시드값으로 운영.
-- 향후 admin write RLS (ps_admin_write) 로 평소 update 가능.

update public.platform_settings
   set value = jsonb_build_object(
         'company',   'Ticketa (주)',
         'recipient', '검수팀',
         'phone',     '070-7882-2144',
         'zip',       '04793',
         'address1',  '서울특별시 성동구 아차산로7길 15-1',
         'address2',  '3층 3119호 (성수동2가, 제이제이빌딩)',
         'note',      '발송 시 박스 외부에 매물 ID 4자리를 큰 글씨로 적어주세요.'
       ),
       updated_at = now()
 where key = 'business_address';
