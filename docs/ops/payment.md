# Payment SOP (입금 확인)

## Steps

1. `/admin/orders` → pending_payment 탭
2. 은행 앱/홈뱅킹에서 입금자명·금액 대조
3. 일치 시 "입금 확인" 버튼 → status=payment_confirmed (자동 발송 큐 진입)
4. 불일치 시 주문 상세의 메모란에 기록, 에이전트에게 이메일 알림

## SLA

- 입금 확인: 주문 생성 후 4시간 이내

Reviewed by: \***\*\_\_\_\*\*** Date: \***\*\_\_\_\*\***
