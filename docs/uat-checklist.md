# UAT Checklist — MVP Launch

Each scenario: 사용자 행동 단계 | 기대 결과

## Seller (3)

| #   | Action                                           | Expected                                         |
| --- | ------------------------------------------------ | ------------------------------------------------ |
| S1  | 가입 → 본인인증 → 판매 등록 (정산계좌 동시 등록) | listing status=submitted, 판매자 히스토리에 표시 |
| S2  | submitted 매물 취소                              | status=cancelled, audit_events 기록              |
| S3  | agent 권한 받은 후 구매 가능                     | /buy 접근 가능, 체크아웃 완료                    |

## Agent (3)

| #   | Action                                              | Expected                                             |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| A1  | 로그인 → 카탈로그 → 10장 장바구니 → 체크아웃 → 입금 | 주문 생성, 24h 타이머, 어드민 입금 확인 후 상태 전이 |
| A2  | 프리뷰 후 체크아웃 직전 재고 소진                   | PREVIEW_STALE 모달, 새 매칭 수락                     |
| A3  | 주문 완료 → delivered 확인                          | 주문 상태 delivered, 알림 수신                       |

## Admin (3)

| #   | Action                          | Expected                                          |
| --- | ------------------------------- | ------------------------------------------------- |
| D1  | 회원에게 agent role 부여 → 취소 | user_roles insert/revoked_at 반영, JWT claim 갱신 |
| D2  | 수탁 → 검수 → 발송 → 정산       | 각 상태 전이 + audit_events 12건 이상             |
| D3  | 계좌 전체 복호화 조회           | sensitive_access_log 기록 + 대시보드 배지 +1      |
