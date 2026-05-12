-- 출금 수수료 운영 정책 변경: 1,000원 → 0원 (당분간 무료 운영).
-- platform_settings.withdraw_fee.amount 만 갱신하면 request_withdraw RPC 가
-- 자동으로 신규 요청부터 fee=0 로 적용. 기존 pending 행은 그대로 둠.

update public.platform_settings
   set value = jsonb_build_object('amount', 0),
       updated_at = now()
 where key = 'withdraw_fee';
