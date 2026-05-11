-- 0012 의 mileage_ledger.type check 가 ('charge','spend','refund','settle','withdraw','adjust')
-- 만 허용해서 0027/0035/0039 의 선물 흐름(gift_sent / gift_received) 에서
-- 23514 check_violation 이 발생. 누락된 두 타입을 추가한다.

alter table public.mileage_ledger
  drop constraint if exists mileage_ledger_type_check;

alter table public.mileage_ledger
  add constraint mileage_ledger_type_check
  check (type in (
    'charge', 'spend', 'refund', 'settle', 'withdraw', 'adjust',
    'gift_sent', 'gift_received'
  ));

comment on constraint mileage_ledger_type_check on public.mileage_ledger is
  'allowed ledger types — gift_sent/gift_received added in 0040';
