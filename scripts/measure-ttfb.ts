/**
 * TTFB 측정 스크립트.
 *
 * 사용법:
 *   pnpm dlx tsx scripts/measure-ttfb.ts [baseUrl] [labelTag]
 *   pnpm dlx tsx scripts/measure-ttfb.ts http://localhost:3000 baseline
 *   pnpm dlx tsx scripts/measure-ttfb.ts http://localhost:3000 after
 *
 * 동작:
 *   1. .env.local 의 Supabase 키 + INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD 로 로그인
 *   2. Supabase REST 토큰 발급 → Supabase ssr 쿠키 포맷으로 인코딩
 *   3. 6 페이지에 대해 5회 trial 측정 (warmup 1회 후 5회 측정)
 *   4. median, p95 와 markdown 표 출력
 *
 * Note: Supabase ssr v0.10+ 의 쿠키 포맷:
 *   - chunked 인코딩일 수 있으므로 base64 prefix `base64-` + base64encode(JSON.stringify({access_token, refresh_token, ...})) 사용
 *   - 쿠키 이름: `sb-<project_ref>-auth-token` (project_ref 는 URL 의 서브도메인)
 */
import { performance } from 'node:perf_hooks';
import { config as dotenv } from 'dotenv';

dotenv({ path: '.env.local' });

const PAGES = [
  '/',
  '/catalog',
  '/sell/new',
  '/account',
  '/account/mileage',
  '/buy/orders',
] as const;

const TRIALS = 5;
const TRIAL_DELAY_MS = 200;
const WARMUP = true;

type TrialResult = { ttfbMs: number; status: number };
type PageResult = {
  path: string;
  trials: TrialResult[];
  medianMs: number;
  p95Ms: number;
  errors: string[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : Math.round(sorted[mid]!);
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return Math.round(sorted[idx]!);
}

type SignInResp = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: { id: string; email?: string };
};

async function getSessionCookie(): Promise<{ name: string; value: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.INITIAL_ADMIN_EMAIL ?? 'carey@drtail.us';
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!supabaseUrl || !pubKey || !password) {
    console.warn(
      '[measure-ttfb] INITIAL_ADMIN_PASSWORD 미설정 → 비인증 측정. 인증 페이지는 /login 으로 302.',
    );
    return null;
  }

  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: pubKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenRes.ok) {
    console.error('[measure-ttfb] 로그인 실패:', tokenRes.status, await tokenRes.text());
    return null;
  }
  const session = (await tokenRes.json()) as SignInResp;

  // project_ref = URL host 의 첫 라벨 (e.g., https://drjpcyyfavwzvkymrxyd.supabase.co → drjpcyyfavwzvkymrxyd)
  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split('.')[0]!;
  const cookieName = `sb-${projectRef}-auth-token`;

  // Supabase ssr 쿠키 값 — JSON 직렬화 후 base64 인코딩, prefix `base64-`
  const payload = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64');
  const cookieValue = `base64-${b64}`;
  return { name: cookieName, value: cookieValue };
}

async function measureOne(
  baseUrl: string,
  path: string,
  cookieHeader: string,
): Promise<PageResult> {
  const trials: TrialResult[] = [];
  const errors: string[] = [];

  // warmup
  if (WARMUP) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      });
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    await sleep(TRIAL_DELAY_MS);
  }

  for (let i = 0; i < TRIALS; i++) {
    try {
      const start = performance.now();
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      });
      const ttfb = performance.now() - start;
      trials.push({ ttfbMs: Math.round(ttfb), status: res.status });
      await res.body?.cancel();
    } catch (e) {
      errors.push((e as Error).message);
    }
    if (i < TRIALS - 1) await sleep(TRIAL_DELAY_MS);
  }
  const ttfbValues = trials.map((t) => t.ttfbMs);
  return { path, trials, medianMs: median(ttfbValues), p95Ms: p95(ttfbValues), errors };
}

async function main() {
  const baseUrl = process.argv[2] ?? 'http://localhost:3000';
  const label = process.argv[3] ?? 'measurement';
  console.log(`[measure-ttfb] target=${baseUrl} label=${label} trials=${TRIALS} warmup=${WARMUP}`);

  const session = await getSessionCookie();
  const cookieHeader = session ? `${session.name}=${session.value}` : '';
  console.log(`[measure-ttfb] auth: ${session ? 'ON' : 'OFF'}`);

  const results: PageResult[] = [];
  for (const path of PAGES) {
    process.stdout.write(`  measuring ${path}… `);
    const r = await measureOne(baseUrl, path, cookieHeader);
    results.push(r);
    const statuses = Array.from(new Set(r.trials.map((t) => t.status))).join(',');
    process.stdout.write(
      `median=${r.medianMs}ms p95=${r.p95Ms}ms status=${statuses} trials=[${r.trials.map((t) => t.ttfbMs).join(',')}]\n`,
    );
    if (r.errors.length > 0) console.log(`    errors: ${r.errors.join('; ')}`);
  }

  console.log('\n## Markdown table\n');
  console.log('| Page | Median TTFB | p95 TTFB | Trials (ms) | Status |');
  console.log('|------|-------------|----------|-------------|--------|');
  for (const r of results) {
    const trialsStr = r.trials.map((t) => `${t.ttfbMs}`).join(', ');
    const statuses = Array.from(new Set(r.trials.map((t) => t.status))).join(',');
    console.log(`| \`${r.path}\` | ${r.medianMs}ms | ${r.p95Ms}ms | ${trialsStr} | ${statuses} |`);
  }
}

main().catch((e) => {
  console.error('[measure-ttfb] 예외:', e);
  process.exit(1);
});
