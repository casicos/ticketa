# Launch Checklist

## 🚦 Production 배포 직전 필수 (blocker)

- [ ] **약관 / 개인정보처리방침 법무 검토판 교체** (`app/(public)/signup/signup-form.tsx` 의 링크 문구)
- [ ] **프로덕션 Supabase 프로젝트 생성** (Seoul `ap-northeast-2`) + `supabase link` + `supabase db push` 로 0001~0010 마이그레이션 전체 적용
- [ ] **Vercel production env** 완료:
  - `NEXT_PUBLIC_SUPABASE_URL` (prod 프로젝트)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (prod publishable)
  - `SUPABASE_SECRET_KEY` (prod secret)
  - `ACCOUNT_NUMBER_ENC_KEY` (32+ 바이트 랜덤, prod/stg 분리)
  - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
  - **`ENABLE_DEV_OTP` 미설정** (프로덕션에서 절대 true 금지. 이중 가드로 NODE_ENV=production 이면 무시되지만, 애초에 세팅 자체를 하지 않음)
- [ ] **test phone numbers production 제거 확인** — Supabase 대시보드 Auth → Phone → Test OTP 비어있음
- [ ] **첫 admin 계정 생성** + agent 권한 수동 seed (`scripts/seed-admin.ts` 를 prod env 로 실행)
- [ ] **계좌번호 암호화 M1 적용** — 현재 MVP 는 평문 bytea 저장. prod 투입 전 반드시 `pgp_sym_encrypt` 적용 (`app/(verified)/sell/actions.ts:121-123` 참조). 플랜 마일스톤 M1 에 명시.
- [ ] 어드민/판매자 사이드바 네비게이션 완성 (`app/(admin)/admin/layout.tsx`, `app/(verified)/sell/layout.tsx`) — 현재 placeholder
- [ ] 어드민 대시보드 카운터 / 어드민 카탈로그 페이지 본문 / 어드민 회원 관리 페이지 조립 — 컴포넌트는 존재하나 page.tsx 미연결

## 🧪 릴리즈 게이트 (CI 또는 수동 확인)

- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` 모두 green
- [ ] `pnpm test:e2e` 17 passed + 1 skipped (critical-path signup scenario 는 `E2E_SIGNUP=1 pnpm test:e2e` 로 로컬 Supabase 에 대해 별도 검증)
- [ ] 부하 테스트 — k6 50 vu × 3분, 카탈로그 p95 < 1.5s, 체크아웃 p95 < 1s, 0 errors
- [ ] security-review 에이전트 재실행 — 고위험 0건
- [ ] pgTAP RLS 매트릭스 100% green (현재 skeleton — 마일스톤에서 본격 활성화)
- [ ] E2E critical path 3회 연속 green
- [ ] UAT 9 시나리오 (`docs/uat-checklist.md`) 모두 pass

## 🔐 보안 리뷰 잔여 이슈 (수정 권장)

- [ ] **Open Redirect** — `sanitizeRedirectPath()` 적용됨. 테스트 추가 권장 (`tests/unit/sanitizeRedirectPath.test.ts`)
- [ ] **audit_events RLS 우회** — 판매자 컨텍스트의 `audit_events` insert 가 RLS (`audit_admin_only`) 로 차단되어 try/catch 로 무시됨. 감사 로그 누락 가능. service-role RPC 로 래핑하거나 INSERT-only 정책 추가 필요 (M1)
- [ ] **에러 메시지 누출** — `withServerAction` 이 `e.message` 를 그대로 반환. production 환경에서 generic 메시지로 대체하는 로직 추가 권장 (M1)
- [ ] **Preview signature HMAC 적용** — 현재 plain SHA-256. HMAC + server secret 도입으로 비공개 키 기반 신뢰 회복 (M1)
- [ ] **중복된 `insertAuditEvent`, `formatKRW`, `shortId`, `handleResult` 유틸 통합** (M1 정비)

## 📊 운영 준비

- [ ] `docs/ops/intake.md`, `docs/ops/payment.md`, `docs/ops/settlement.md` SOP 최종 승인
- [ ] 어드민 SLA 문구 대시보드 게시 (입금 4h / 발송 다음날 / 정산 3영업일)
- [ ] Sentry release track 활성화
- [ ] 어드민 비밀번호 강제 재설정 정책

## 🌐 배포 후 스모크

- [ ] 프로덕션 도메인 접속 → 카탈로그 노출 + SKU 상세 렌더링
- [ ] Sentry 스모크: `scripts/sentry-smoke.ts` 자동 통과
- [ ] Vercel Analytics 데이터 수집 확인

## 🦶 풋터 / 보조 페이지 (현재 비활성화 — 클릭 시 "준비중" 토스트)

footer 의 다음 항목은 현재 disabled. `components/landing/landing-footer.tsx` 의 FOOTER_LINKS / MOBILE_FOOTER_LINKS 에서 `disabled: true` 제거 + 실제 페이지/액션 연결 필요.

- [ ] **회사소개** — 별도 페이지 (또는 랜딩 내 섹션 링크)
- [ ] **청소년 보호정책** — 법령 의무 (정보통신망법) 페이지 작성 후 연결
- [ ] **이메일 무단수집 거부** — 정책 페이지 작성 + 메타태그
- [ ] **에이전트 입점 문의** — 입점 신청 폼 또는 안내 페이지
- [ ] **제휴 문의** — 제휴 폼 또는 contact 페이지
- [ ] **고객센터 / 1:1 채팅 상담** — 채팅 시스템 연결 (외부 SaaS 도입 검토: Channel.io, Crisp 등)
- [ ] **버전 표시 / 언어 선택** — 풋터 bottom bar 의 v2026.05 / 한국어 토글은 v2 마일스톤에 i18n 도입 시 부활
