# Settlement SOP (판매자 정산)

## Steps

1. `/admin/payouts` 열기
2. payment_confirmed 이후 fulfilled된 order_items 리스트 확인
3. 판매자별 그룹 확인 → gross/commission/net 합계 검증
4. 은행 이체 실행 (수동, 플랫폼 계좌 → 판매자 계좌)
5. "정산 완료" 2단계 모달 → 사유/은행 거래번호 입력 → status=released
6. 판매자에게 알림 자동 발송

## SLA

- 정산: payment_confirmed 후 3영업일 이내

## 체크리스트

- [ ] commission_amount = quantity × 400
- [ ] 계좌번호 마지막 4자리 매칭
- [ ] 음수 금액 없음

Reviewed by: \***\*\_\_\_\*\*** Date: \***\*\_\_\_\*\***
