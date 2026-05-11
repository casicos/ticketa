# SKU 카드 이미지 출처

각 이미지는 발행사 공식 사이트에서 수집한 카드 비주얼이다. MVP 카탈로그 썸네일 (`/catalog`) 용도로 사용 중. 실제 운영 시 각 발행사와의 라이선스 협의 또는 자체 촬영 이미지로 교체할 것 (M1+ 마일스톤 후순위).

## 백화점 5사 (현재 SKU)

| 파일명                 | 권종     | 발행사         | 출처 URL                                                                                            |
| ---------------------- | -------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `lotte-50000.png`      | 5만원권  | 롯데백화점     | https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/50,000_voucher.png       |
| `lotte-100000.png`     | 10만원권 | 롯데백화점     | https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/100,000_voucher.png      |
| `lotte-300000.png`     | 30만원권 | 롯데백화점     | https://www.lotteshopping.com/resources/img/customer-service/lotte-voucher/300,000_voucher.png      |
| `shinsegae-50000.png`  | 5만원권  | 신세계백화점   | https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_50000.png  |
| `shinsegae-100000.png` | 10만원권 | 신세계백화점   | https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_100000.png |
| `shinsegae-300000.png` | 30만원권 | 신세계백화점   | https://www.shinsegae.com/resources/site/img/service/membership/certificate/ico_giftcard_300000.png |
| `hyundai-50000.png`    | 5만원권  | 현대백화점     | https://www.ehyundai.com/images/mobilehome2/gift/img_gift03.png                                     |
| `hyundai-100000.png`   | 10만원권 | 현대백화점     | https://www.ehyundai.com/images/mobilehome2/gift/img_gift04.png                                     |
| `hyundai-300000.png`   | 30만원권 | 현대백화점     | https://www.ehyundai.com/images/mobilehome2/gift/img_gift05.png                                     |
| `galleria-50000.jpg`   | 5만원권  | 갤러리아백화점 | https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-02.jpg              |
| `galleria-100000.jpg`  | 10만원권 | 갤러리아백화점 | https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-03.jpg              |
| `galleria-300000.jpg`  | 30만원권 | 갤러리아백화점 | https://dept.galleria.co.kr/assets/image/dept/card/coupon/introduction/g-coupon-04.jpg              |
| `ak-50000.png`         | 5만원권  | AK플라자       | https://img-www.akplaza.com/static/images/card/gift50000.png                                        |
| `ak-100000.png`        | 10만원권 | AK플라자       | https://img-www.akplaza.com/static/images/card/gift100000.png                                       |
| `ak-300000.png`        | 30만원권 | AK플라자       | https://img-www.akplaza.com/static/images/card/gift300000.png                                       |

## 미수집 (M2+ 확장 예정)

현재 SKU 에 없으나 사용자 요청에 포함됨. 추후 카드사 협력 또는 자체 디자인으로 보완.

| 발행사                                            | 비고                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 문화상품권 ((주)문화상품권 / 컬쳐랜드)            | 메인 페이지 카드 비주얼은 슬라이드 배너 중첩으로 단일 카드 이미지 추출 어려움. 공식 페이지 https://www.culturegift.co.kr/ |
| 도서문화상품권 (북앤라이프)                       | 공식 페이지 https://www.booknlife.com/                                                                                    |
| 해피머니 / 컬쳐랜드 / 구글플레이 등 디지털 상품권 | M4 이후 확장                                                                                                              |

## 수집 메모

- 수집 일시: 2026-05-06
- 수집 방법: Claude in Chrome 확장으로 각 발행사 공식 페이지 접속 → same-origin fetch → 브라우저 다운로드 트리거
- 백화점 5사 모두 5만/10만/30만원권 (현재 `sku` 테이블의 권종) 수집 완료
- 갤러리아만 jpg, 나머지는 png 포맷
- 파일명 컨벤션: `{brand}-{denomination}.{ext}` (denomination 은 KRW)

## 사용 시 주의

- 본 이미지는 각 발행사의 자산이며, MVP 단계에서 시각적 식별용으로만 활용.
- 운영 단계 (M1+) 에서는 각 발행사와 정식 라이선스 협의 또는 자체 촬영본으로 교체 권장.
- 변조/재가공 금지.
