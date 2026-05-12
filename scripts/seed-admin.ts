/**
 * 첫 어드민 계정 시드.
 * Usage: pnpm dlx tsx scripts/seed-admin.ts
 *
 * 동작:
 *   1. INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD 가져옴 (.env.local)
 *   2. supabase.auth.admin.createUser 로 계정 생성 (email_confirm=true, 즉시 로그인 가능)
 *   3. public.users 는 handle_new_user 트리거가 자동 생성
 *   4. public.user_roles 에 admin role insert → sync_user_roles_to_jwt 트리거가 auth.users.raw_app_meta_data 업데이트
 *   5. auth.users 조회하여 raw_app_meta_data.roles 에 'admin' 포함 확인 (JWT sync PoC)
 *   6. 결과 요약 출력
 *
 * 재실행 안전: 이미 같은 email 존재 시 "이미 있음" 보고 후 role만 보증.
 */
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env', override: false });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const EMAIL = process.env.INITIAL_ADMIN_EMAIL;
let PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;

if (!URL || !SECRET) {
  console.error('[seed-admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}
if (!EMAIL) {
  console.error('[seed-admin] .env.local 에 INITIAL_ADMIN_EMAIL 설정 필요');
  process.exit(1);
}
if (!PASSWORD) {
  PASSWORD = randomBytes(12).toString('base64url') + 'Aa1!';
  console.log(`[seed-admin] INITIAL_ADMIN_PASSWORD 미설정 → 자동 생성. 로그인 후 꼭 변경하세요.`);
  console.log(`[seed-admin] 생성 비밀번호: ${PASSWORD}`);
}

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureAdminRole(userId: string) {
  // 이미 활성 admin role 있으면 skip
  const { data: existing, error: findErr } = await admin
    .from('user_roles')
    .select('user_id,role,revoked_at')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .is('revoked_at', null)
    .limit(1);
  if (findErr) throw new Error(`user_roles 조회 실패: ${findErr.message}`);
  if (existing && existing.length > 0) {
    console.log('  ℹ 이미 admin role 활성 상태');
    return;
  }
  const { error: insErr } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin', granted_by: userId });
  if (insErr) throw new Error(`admin role insert 실패: ${insErr.message}`);
  console.log('  ✓ admin role 부여 (user_roles insert)');
}

async function verifyJwtSync(userId: string): Promise<{ roles: unknown; ok: boolean }> {
  // auth.users 를 직접 읽음 (service-role 이라 가능)
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  const meta = data.user.app_metadata as Record<string, unknown>;
  const roles = meta?.roles;
  const ok = Array.isArray(roles) && roles.includes('admin');
  return { roles, ok };
}

async function main() {
  console.log(`[seed-admin] target: ${EMAIL}`);

  let user = await findUserByEmail(EMAIL!);
  if (!user) {
    console.log('  · 계정 없음 → 생성');
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL!,
      password: PASSWORD!,
      email_confirm: true,
      user_metadata: { full_name: 'Initial Admin' },
    });
    if (error) throw new Error(`createUser 실패: ${error.message}`);
    user = data.user!;
    console.log(`  ✓ auth.users.id = ${user.id}`);
  } else {
    console.log(`  ℹ 기존 계정 존재 — id=${user.id}`);
  }

  // handle_new_user 트리거가 public.users 를 자동 생성했는지 확인
  const { data: pubUser, error: pubErr } = await admin
    .from('users')
    .select('id,email,full_name')
    .eq('id', user.id)
    .single();
  if (pubErr) {
    console.log(`  ✗ public.users 조회 실패: ${pubErr.message} — handle_new_user 트리거 점검 필요`);
  } else {
    console.log(
      `  ✓ public.users 존재 (handle_new_user 트리거 OK) — full_name="${pubUser.full_name}"`,
    );
  }

  // 실제 이름으로 업데이트
  await admin.from('users').update({ full_name: 'Initial Admin' }).eq('id', user.id);

  // user_roles admin insert + JWT sync 트리거 검증
  await ensureAdminRole(user.id);

  const jwt = await verifyJwtSync(user.id);
  if (jwt.ok) {
    console.log(
      `  ✓ JWT sync 트리거 OK — auth.users.app_metadata.roles = ${JSON.stringify(jwt.roles)}`,
    );
  } else {
    console.log(`  ✗ JWT sync 실패 — auth.users.app_metadata.roles = ${JSON.stringify(jwt.roles)}`);
    console.log(
      `    → sync_user_roles_to_jwt SECURITY DEFINER 권한/문법 점검 필요 (플랜 Phase 1 step 9b fallback)`,
    );
  }

  // partial unique index 검증 — 같은 user+role 2회 insert 시도 → unique_violation 기대
  const { error: dupErr } = await admin
    .from('user_roles')
    .insert({ user_id: user.id, role: 'admin', granted_by: user.id });
  if (dupErr && /duplicate key|unique/i.test(dupErr.message)) {
    console.log(`  ✓ user_roles partial unique index 동작 (중복 insert 차단)`);
  } else if (!dupErr) {
    console.log(`  ✗ partial unique index 미동작 — 중복 insert 가 성공함. 인덱스 점검 필요`);
  } else {
    console.log(`  ? 중복 insert 다른 에러: ${dupErr.message}`);
  }

  console.log('\n[seed-admin] 완료');
  console.log(`로그인 정보: ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error('[seed-admin] 예외:', e);
  process.exit(1);
});
