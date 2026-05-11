-- 0040 에서 gift_sent / gift_received 만 추가했지만,
-- 0027_gifts.sql 의 RPC 들이 실제로 ledger 에 적는 타입은 더 다양하다:
--   send_gift          → 'gift_sent'           (sender debit)
--   claim_gift_mileage → 'gift_claim_mileage'  (recipient credit)
--   complete_gift      → 'gift_settlement'     (agent settle credit)
--   refund_gift        → 'gift_refund'         (sender refund credit)
-- gift_received 는 audit_events event 값일 뿐 ledger 에는 안 들어감.
-- 누락분을 모두 허용.

alter table public.mileage_ledger
  drop constraint if exists mileage_ledger_type_check;

alter table public.mileage_ledger
  add constraint mileage_ledger_type_check
  check (type in (
    'charge', 'spend', 'refund', 'settle', 'withdraw', 'adjust',
    'gift_sent', 'gift_received',
    'gift_claim_mileage', 'gift_settlement', 'gift_refund'
  ));

comment on constraint mileage_ledger_type_check on public.mileage_ledger is
  'allowed ledger types — gift_* family extended in 0042';
