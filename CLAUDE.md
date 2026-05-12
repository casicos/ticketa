# Ticketa — Claude 작업 노트

이 파일은 향후 세션에서 맥락을 빠르게 복원하기 위한 프로젝트 요약이다.
구현·배포·DB 변경 이력·의도적 결정·알려진 한계를 정리한다.

## 1. 제품 개요

**Ticketa** — 백화점 실물 상품권(롯데/현대/신세계/갤러리아/AK 등) B2C 중개 플랫폼.

- 판매자가 매물 등록 → 에이전트/어드민이 **마일리지**로 매입 → 판매자가 중간업체(어드민)에게 인계 → 어드민이 수령·검증 후 구매자에게 발송 → 구매자 인수 확인 시 판매자에게 정산 (마일리지 적립, 수수료 차감).
- 일반 사용자는 매입 권한 없음. 시세 열람만 가능. agent role 은 어드민이 수동 부여.
- c2c (에이전트 → 최종소비자 재판매)는 M4 마일스톤.

## 2. 기술 스택

- **Frontend**: Next.js 16 App Router + TypeScript strict + Tailwind v4 + shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Storage, Seoul `ap-northeast-2` `drjpcyyfavwzvkymrxyd`)
- **Deploy**: Vercel Hobby — Next.js 16 + Turbopack
- **Middleware**: Next.js 16 은 `proxy.ts` 가 표준 (`middleware.ts` 아님). `export async function proxy(req)`
- **Env key format**: 구 `anon`/`service_role` JWT 아님. 신 `sb_publishable_*` / `sb_secret_*` 키 사용 (2024+ Supabase 신규 포맷)
- **TS**: `strict: true` + `noUncheckedIndexedAccess: true`
- **보안 경계**: `lib/supabase/admin.ts` 와 `lib/supabase/transaction.ts` 는 `lib/domain/**` 및 `app/(admin)/**` 에서만 import. `eslint-plugin-boundaries` 로 강제. 위반 시 CI 실패.

## 3. 역할 모델

- `seller`, `agent`, `admin` — `user_roles` 테이블에 복수 부여 가능
- JWT `app_metadata.roles` 에 캐싱 (SECURITY DEFINER 트리거 `sync_user_roles_to_jwt`)
- **partial unique index** `ux_user_roles_active on user_roles (user_id, role) where revoked_at is null` 로 활성 역할 중복 차단
- 첫 판매 등록 시 seller role 자동 부여 (`submitListingAction`)
- agent 권한은 어드민이 `/admin/members` 에서 수동 부여
- 로그인/트리거 세션 갱신 필요: role 부여 후 클라이언트가 즉시 반영 안 되면 재로그인

## 4. 7단계 listing 상태 머신

```
submitted → purchased → handed_over → received → verified → shipped → completed
                                                                    (+ cancelled)
```

| 상태          | 의미                          | 누가 전이시킴                        |
| ------------- | ----------------------------- | ------------------------------------ |
| `submitted`   | 판매자 등록 완료, 매입 대기   | — (etalogue 에 공개)                 |
| `purchased`   | 매입 확정, 마일리지 차감      | agent/admin (RPC `purchase_listing`) |
| `handed_over` | 판매자 인계 확인              | 판매자 (`handOverListingAction`)     |
| `received`    | 중간업체 실물 수령            | admin (`markReceivedAction`)         |
| `verified`    | 진위 검증 완료                | admin (`markVerifiedAction`)         |
| `shipped`     | 구매자에게 발송 처리          | admin (`markShippedNotifyAction`)    |
| `completed`   | 구매자 인수 확인, 판매자 정산 | buyer (RPC `complete_listing`)       |
| `cancelled`   | 어드민 취소 + 마일리지 환불   | admin (RPC `cancel_listing`)         |

취소 요청: 판매자/구매자가 `cancellation_requests` pending insert → 어드민이 `/admin/cancellations` 에서 승인/반려.

## 5. 마일리지 시스템

- 1 마일리지 = 1 KRW
- **cash_balance** (즉시 출금 가능) vs **pg_locked** (거래되어야만 출금 가능, 카드깡 방지)
- `balance` 컬럼은 generated `cash_balance + pg_locked` STORED
- 차감(`debit_mileage`): pg_locked 선소진 → cash_balance
- 증가(`credit_mileage`): bucket(`cash` | `pg`) 명시 필수
  - 무통장입금 confirm → cash
  - PG 충전 confirm → pg
  - 판매 정산 / 환불 → cash (거래를 거친 돈)
- 출금 신청(`request_withdraw`): cash_balance 한정. cash 에서 hold. 승인/반려(`resolve_withdraw`) 시 반환.
- 충전 최소 단위: 100원
- 수수료: SKU별 설정 (`commission_type: fixed | percent`, `amount` int, `charged_to: seller | buyer | both`). default = fixed/400원/seller

## 6. 디렉토리 하이라이트

```
app/
  (public)/           # 공개 — 홈, 로그인, 회원가입, 시세 카탈로그
    catalog/          # 일반인도 열람 가능. 매입 버튼은 agent/admin 만 표시.
    catalog/[id]/     # listing 단위 상세 + 매입 확정 Server Action
  (verified)/         # 본인인증 필요
    account/          # 마이페이지 허브 + 프로필·비밀번호
    account/mileage/  # 잔액 허브, charge, withdraw (별도 경로)
    sell/             # 판매 등록, 내 매물, 정산 내역
    buy/              # 매입 내역 (listing.buyer_id 기준)
  (admin)/admin/
    page.tsx          # 대시보드 (SLA 경고 카운터)
    members/          # agent/admin role grant/revoke
    catalog/          # SKU CRUD (수수료 설정 포함)
    intake/           # 7단계 상태머신 관리 (handed_over→received→verified→shipped)
    mileage/          # 충전 승인 + 출금 처리
    cancellations/    # 취소 요청 승인/반려
    audit/            # audit_events 타임라인
lib/
  supabase/
    client.ts         # browser anon
    server.ts         # ssr anon
    admin.ts          # service-role ADMIN routes 전용 (ESLint 강제)
    transaction.ts    # service-role RPC 래퍼 전용 (lib/domain/ 만 import 허용)
  domain/
    mileage.ts        # RPC 래퍼 (debit/credit/purchase/complete/cancel/withdraw)
    pricing.ts        # 수수료 계산 단일 소스
    listings.ts       # 상태 머신 가드 함수
    audit.ts          # insertAuditEvent RPC 래퍼
    notifications.ts  # notifyUser / notifyUsers RPC 래퍼 (RLS 우회)
    cancellations.ts  # 취소 요청 insert + 어드민 알림
  auth/
    guards.ts         # getCurrentUser, hasRole, requireRole, requirePhoneVerified
    redirect.ts       # sanitizeRedirectPath (open redirect 방어)
  format.ts           # formatKRW, formatKoreanPhone, maskKoreanPhone, shortId, sellerCode
proxy.ts              # Next 16 middleware (라우트 게이트)
supabase/migrations/  # 0001~0019
scripts/              # seed-admin, verify-db, smoke-middleware, smoke-deploy 등
```

## 7. 마이그레이션 이력

| #    | 파일                    | 핵심 변경                                                         |
| ---- | ----------------------- | ----------------------------------------------------------------- |
| 0001 | init                    | 12 테이블 전체 스키마                                             |
| 0002 | rls_policies            | 전 테이블 RLS                                                     |
| 0003 | triggers                | handle_new_user + sync_user_roles_to_jwt (SECURITY DEFINER)       |
| 0004 | rpc_skeleton            | RPC 빈 껍데기                                                     |
| 0005 | seed_sku                | 15 SKU seed (remote 적용용)                                       |
| 0006 | fix_handle_new_user     | raw_user_meta_data 픽업                                           |
| 0007 | rpc_order               | (deprecated) order 기반 트랜잭션 — Wave 1에서 비활성              |
| 0008 | payout                  | (deprecated) 트리거                                               |
| 0009 | notifications           | (deprecated) order 기반 알림 트리거 — Wave 1에서 비활성           |
| 0010 | rpc_security            | restore_listing_stock caller 검증                                 |
| 0011 | audit_rpc               | insert_audit_event RPC (authenticated grant)                      |
| 0012 | **mileage_refactor**    | 7단계 상태머신 + 마일리지 계좌/원장 + 5 신규 RPC                  |
| 0013 | listing_rls_mvp         | 공개/본인 SELECT 정책                                             |
| 0014 | **pg_withdrawal_guard** | cash/pg 버킷 분리, 카드깡 방지, request_withdraw/resolve_withdraw |
| 0015 | public_catalog_view     | /catalog 전체 공개 열람 허용                                      |
| 0016 | notify_rpc              | notify_user/notify_users SECURITY DEFINER                         |
| 0017 | **shipped_state**       | verified → shipped → completed (7단계로 확장)                     |
| 0018 | notify_money_format     | 금액 알림 본문에 `FM999,999,999,999` 적용                         |
| 0019 | fix_new_user_mileage    | mileage_accounts generated column 대응 트리거 수정                |

## 8. 환경변수

`.env.example` 참조. 핵심:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb*publishable*...)
- `SUPABASE_SECRET_KEY` (sb*secret*..., server-only)
- `ENABLE_DEV_OTP=true` ← **진짜 production Vercel 프로젝트에는 절대 설정 금지**. (Vercel 은 dev 배포에서도 NODE_ENV=production 강제하므로 NODE_ENV 가드 사용 불가. ENABLE_DEV_OTP 단독 체크 + 콘솔 경고 + 정책으로 안전 확보)
- `ACCOUNT_NUMBER_ENC_KEY` (pgcrypto 키 — 계좌번호 암호화 M1 에서 적용 예정, 현재는 평문 bytea 저장)
- `PLATFORM_BANK_NAME/ACCOUNT/HOLDER` (충전 안내 계좌. 미설정 시 "어드민 문의" 표시)
- `NEXT_PUBLIC_SENTRY_DSN` (미설정이면 Sentry 자동 disabled)

## 9. 배포 현황

- **Vercel project**: `ticketa-dev` (project id `prj_MvJtwtlT8G6LnoWUC8TGZg0aTyUb`)
- **URL**: https://ticketa-dev.vercel.app
- **Supabase project**: `drjpcyyfavwzvkymrxyd` (ticketa-dev, Seoul)
- Vercel env: production + development 양쪽에 4종 등록됨 (기본). preview 는 git branch별 설정이라 MVP에선 사용 안 함
- **production 분리 계획**: 별도 `ticketa-prod` Vercel + Supabase. env 값만 교체 후 동일 마이그레이션 적용 시 작동.

### 배포 명령

```bash
# 재배포 (dev)
pnpm dlx vercel@latest deploy --prod --yes

# DB 마이그레이션 (remote)
pnpm exec supabase db push --yes

# env 추가 (CLI — --value + --yes 필수, production/development target)
pnpm dlx vercel@latest env add NAME production --value 'x' --yes
```

### Supabase 측 설정 (URL Configuration 완료됨)

- Site URL: `https://ticketa-dev.vercel.app`
- Redirect URLs: `https://ticketa-dev.vercel.app/**`

## 10. 첫 어드민 계정

```
carey@drtail.us      — seed-admin 으로 생성 (초기 비밀번호 로그 참조)
admin@ticketa.me     — seed-admin 으로 promote (기존 비밀번호 유지)
```

추가 promote:

```bash
INITIAL_ADMIN_EMAIL=<email> pnpm dlx tsx scripts/seed-admin.ts
```

## 11. 주요 로컬 명령

```bash
pnpm typecheck            # 0 errors 상시 유지
pnpm lint                 # ESLint boundaries 포함. 0 errors 유지
pnpm test                 # Vitest 36 tests
pnpm test:e2e             # Playwright 17 passed (+1 skipped: signup scenario)
pnpm build                # Next 16 Turbopack
pnpm dev                  # http://localhost:3000

pnpm dlx tsx scripts/verify-db.ts      # DB smoke
pnpm dlx tsx scripts/check-listings.ts # listing 상태 덤프
pnpm dlx tsx scripts/smoke-deploy.ts   # 배포 사이트 200 체크
```

## 12. 의도된 설계 결정 (바꾸기 전 재검토할 것)

- **proxy.ts ≠ middleware.ts**: Next 16 신 규약. 리뷰어가 "버그" 라고 해도 맞는 파일명
- **계좌번호 평문 bytea 저장**: MVP 수용. M1 에서 `pgp_sym_encrypt` + `ACCOUNT_NUMBER_ENC_KEY` 적용 예정. `account_number_encrypted bytea` 컬럼명은 의도 표시용.
- **order/order_items/payouts 레거시 테이블**: c2c M4 재활용 대비 drop 안 함. `create_order_transaction`/`restore_listing_stock`/`release_payout` 은 deprecated + exception raise
- **carry-over 금지**: 판매 정산/취소 환불은 전부 `cash` bucket 으로 들어감 (거래 세탁으로 간주) — 카드깡 방지 규칙 외 복잡도 추가하지 않기로 결정
- **generated `balance` 컬럼**: insert 시점에 직접 값 지정 금지. trigger/app 코드 모두 cash_balance + pg_locked 만 조작.
- **어드민 대시보드 "수탁 대기"** = `handed_over` (실물 수령 대기). `submitted` 는 "매입 대기 매물" 로 별도 표기.
- **/catalog 공개**: 비로그인도 시세 열람 허용. 매입 버튼만 agent/admin 게이팅.
- **cancel 요청 범위**: shipped 단계는 현실적으로 회수 복잡 → 판매자/구매자 요청 UI 제외. 어드민 직접 취소 (cancel_listing RPC) 는 여전히 가능.
- **금액 포맷**: 모든 사용자 대면 알림/UI 는 `#,##0` — JS `toLocaleString('ko-KR')` 또는 `formatKRW` 사용, SQL 은 `to_char(n, 'FM999,999,999,999')`.

## 13. M1+ 마일스톤

### M1 — 본인인증·결제 프로덕션화

- SMS 실발송 (Aligo/Nurigo) + ENABLE_DEV_OTP 제거
- OAuth (구글/카카오/네이버)
- 토스페이먼츠 PG 연동 (`/account/mileage/charge` 에 disabled 라디오 이미 존재)
- 계좌번호 `pgp_sym_encrypt` 적용 + `sensitive_access_log` 기반 어드민 "복호화 보기" UI
- 약관/개인정보처리방침 법무 검토판 교체

### M2 — 상품 디테일

- 상품권 일련번호 입력·중복 검증
- 유효기간 관리, 만료 임박 경보
- 진위 검수 이미지 업로드 (Supabase Storage)

### M3 — 운영/경험

- 어드민 통계 대시보드 (GMV, DAU)
- SMS·카카오 알림톡
- submitted/pending 타임아웃 자동 취소

### M4 — 확장

- c2c (agent → 최종소비자 재판매) — 기존 order/order_items/payouts 테이블 재활용
- 판매자 등급 / 위탁재고 특권 / KYC 레벨
- 별도 어드민 앱 분리
- 모바일 네이티브 (React Native)
