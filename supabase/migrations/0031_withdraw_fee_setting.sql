-- 0031_withdraw_fee_setting.sql
-- 출금 수수료를 platform_settings 키로 관리. 어드민이 향후 별도 페이지에서 수정.

insert into public.platform_settings (key, value)
values ('withdraw_fee', jsonb_build_object('amount', 1000))
on conflict (key) do nothing;
