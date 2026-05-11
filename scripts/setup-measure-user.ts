/**
 * 측정 스크립트용 phone_verified 계정 보장.
 *
 * - INITIAL_ADMIN_EMAIL 의 password 를 .env.local 의 MEASURE_USER_PASSWORD (or 자동생성) 로 reset
 * - public.users.phone_verified=true 보장 (admin 계정은 verify-phone 우회용으로 강제)
 * - 결과를 stdout 으로 출력 (password 포함)
 */
import { randomBytes } from 'node:crypto';
import { config as dotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const EMAIL = process.env.INITIAL_ADMIN_EMAIL ?? 'carey@drtail.us';
const PASSWORD =
  process.env.MEASURE_USER_PASSWORD ?? randomBytes(12).toString('base64url') + 'Aa1!';

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`[setup] target email: ${EMAIL}`);

  // find user
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  const user = list.users.find((u) => u.email === EMAIL);
  if (!user) {
    console.error(`[setup] 계정 없음 — pnpm dlx tsx scripts/seed-admin.ts 먼저 실행`);
    process.exit(1);
  }
  console.log(`[setup] user.id=${user.id}`);

  // reset password
  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, { password: PASSWORD });
  if (pwErr) throw pwErr;
  console.log(`[setup] password reset OK`);

  // phone_verified 보장
  const { error: pvErr } = await admin
    .from('users')
    .update({ phone_verified: true, full_name: 'Carey Test' })
    .eq('id', user.id);
  if (pvErr) console.warn(`[setup] phone_verified update 실패: ${pvErr.message}`);
  else console.log(`[setup] phone_verified=true 보장`);

  console.log('\n[setup] credentials:');
  console.log(`  email=${EMAIL}`);
  console.log(`  password=${PASSWORD}`);
  console.log('\n사용:');
  console.log(`  export INITIAL_ADMIN_PASSWORD='${PASSWORD}'`);
  console.log(`  pnpm dlx tsx scripts/measure-ttfb.ts http://localhost:3000`);
}

main().catch((e) => {
  console.error('[setup] 예외:', e);
  process.exit(1);
});
