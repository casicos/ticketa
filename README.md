# Ticketa — B2C Gift Certificate Brokerage

백화점 상품권(롯데/현대/신세계 등) 실물 B2C 중개 플랫폼.

## Stack

- Next.js 16 (App Router, TypeScript strict)
- Tailwind v4 + shadcn/ui
- Supabase (Postgres + Auth + Storage, Seoul ap-northeast-2)
- Vercel (US-East 프리티어 → Pro icn1 전환 예정)
- Sentry + Vercel Analytics + audit_events

## Docs

- 플랜: `.omc/plans/b2c-giftcard-broker-mvp.md`
- 운영 SOP: `docs/ops/`
- UAT: `docs/uat-checklist.md`
- Launch: `docs/launch-checklist.md`

## Local Development

```bash
pnpm install
cp .env.example .env.local
# .env.local 채우기 (Supabase dev 프로젝트 연결)
pnpm dev                         # http://localhost:3000
pnpm exec supabase start         # 로컬 Postgres 에뮬레이터
pnpm exec supabase db reset      # 마이그레이션 + seed 적용
```

## Tests

```bash
pnpm typecheck
pnpm lint                        # boundaries 포함
pnpm test                        # Vitest unit + integration
pnpm test:e2e                    # Playwright E2E
pnpm build                       # production build 검증
```

## Deploy

- Preview: Vercel auto-deploy on PR
- Production: `main` branch merge → Vercel 수동 promote

## Security Boundaries

- `lib/supabase/admin.ts` → `app/(admin)/**` + `lib/domain/admin/**`에서만 import (ESLint boundaries 강제)
- `lib/supabase/transaction.ts` → `lib/domain/**`에서만 import
- 계좌번호 pgcrypto 암호화, 마지막 4자리만 UI 표시
