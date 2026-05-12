/**
 * Phase 1 middleware smoke test.
 * Usage: pnpm dlx tsx scripts/smoke-middleware.ts
 * 전제: pnpm dev 이 http://localhost:3000 에서 구동 중
 */
const BASE = 'http://localhost:3000';

type Check = { path: string; expect: 'redirect-login' | 'redirect-verify' | '200' };

const checks: Check[] = [
  { path: '/', expect: '200' },
  { path: '/signup', expect: '200' },
  { path: '/login', expect: '200' },
  { path: '/catalog', expect: '200' },
  { path: '/sell', expect: 'redirect-login' },
  { path: '/sell/new', expect: 'redirect-login' },
  { path: '/buy', expect: 'redirect-login' },
  { path: '/buy/orders', expect: 'redirect-login' },
  { path: '/admin', expect: 'redirect-login' },
  { path: '/admin/members', expect: 'redirect-login' },
  { path: '/verify-phone', expect: 'redirect-login' },
  { path: '/account', expect: 'redirect-login' },
];

function describe(res: Response): string {
  if (res.status === 200) return '200';
  const loc = res.headers.get('location') ?? '';
  if (res.status >= 300 && res.status < 400) {
    if (loc.includes('/login')) return 'redirect-login';
    if (loc.includes('/verify-phone')) return 'redirect-verify';
    if (loc.includes('/no-access')) return 'redirect-no-access';
    return `redirect(${res.status})→${loc}`;
  }
  return `status ${res.status}`;
}

async function main() {
  let fail = 0;
  for (const c of checks) {
    const res = await fetch(BASE + c.path, { redirect: 'manual' });
    const actual = describe(res);
    const ok = actual === c.expect;
    if (!ok) fail++;
    const mark = ok ? '✓' : '✗';
    console.log(`${mark} ${c.path.padEnd(20)} expected=${c.expect.padEnd(18)} actual=${actual}`);
  }

  const nr = await fetch(BASE + '/no-access?reason=agent-required');
  const html = await nr.text();
  const hasAgentRequired = /agent|에이전트/i.test(html);
  console.log(
    `${nr.status === 200 && hasAgentRequired ? '✓' : '✗'} /no-access?reason=agent-required 200 + 메시지`,
  );
  if (!(nr.status === 200 && hasAgentRequired)) fail++;

  console.log(fail === 0 ? '\n✅ 전부 통과' : `\n❌ ${fail}건 실패`);
  process.exit(fail);
}
main();
