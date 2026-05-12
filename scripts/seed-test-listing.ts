/**
 * Dev 매물 시드 — submitted 상태의 테스트 listing 1건 생성.
 * Usage: pnpm dlx tsx scripts/seed-test-listing.ts
 *
 * 동작:
 *   1. 테스트 판매자(testseller) 계정 생성/upsert. seller role 부여, phone_verified=true.
 *   2. 활성 SKU 중 롯데 50000원권 한 건 선정 (없으면 첫 활성 SKU).
 *   3. listing 1건 submitted 상태로 insert.
 *   4. 결과 listing.id 출력. 개발 환경 catalog 에서 즉시 노출됨.
 *
 * 재실행 안전: 이미 testseller 가 만든 submitted listing 이 있으면 skip.
 *
 * 매입 권한 안내:
 *   - /catalog/[id] 의 매입 버튼은 agent 또는 admin role 만 표시.
 *   - 일반 회원으로 매입 흐름을 검증하려면 /admin/members 에서 agent role 부여 필요.
 *   - 빠른 검증은 admin 계정(carey@drtail.us 등)으로 로그인 후 catalog 진입.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env', override: false });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;

if (!URL || !SECRET) {
  console.error('[seed-test-listing] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}

const TEST_SELLER_USERNAME = 'testseller';
const TEST_SELLER_EMAIL = `${TEST_SELLER_USERNAME}@ticketa.local`;
const TEST_SELLER_PASSWORD = 'TestSeller!2026';
const TEST_SELLER_PHONE = '+821000000099';

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureTestSeller(): Promise<string> {
  let user = await findUserByEmail(TEST_SELLER_EMAIL);
  if (!user) {
    console.log(`  · 테스트 판매자 계정 생성: ${TEST_SELLER_EMAIL}`);
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_SELLER_EMAIL,
      password: TEST_SELLER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: TEST_SELLER_USERNAME,
        full_name: '테스트 판매자',
        phone: TEST_SELLER_PHONE,
        marketing_opt_in: false,
      },
    });
    if (error) throw new Error(`createUser 실패: ${error.message}`);
    user = data.user!;
  } else {
    console.log(`  ℹ 기존 테스트 판매자 — id=${user.id}`);
  }

  // public.users 보강 — handle_new_user 트리거가 username/phone 픽업.
  // 혹시 이전 가입이라 누락 있으면 update.
  await admin
    .from('users')
    .update({
      username: TEST_SELLER_USERNAME,
      full_name: '테스트 판매자',
      phone: TEST_SELLER_PHONE,
      phone_verified: true,
    })
    .eq('id', user.id);

  // seller role 보장
  const { data: existingRole } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('role', 'seller')
    .is('revoked_at', null)
    .maybeSingle();
  if (!existingRole) {
    const { error } = await admin
      .from('user_roles')
      .insert({ user_id: user.id, role: 'seller', granted_by: user.id });
    if (error) throw new Error(`seller role insert 실패: ${error.message}`);
    console.log('  ✓ seller role 부여');
  }

  return user.id;
}

async function pickSku(): Promise<{ id: string; brand: string; denomination: number }> {
  const { data: lotteSku } = await admin
    .from('sku')
    .select('id, brand, denomination')
    .eq('brand', '롯데백화점')
    .eq('denomination', 50000)
    .eq('is_active', true)
    .maybeSingle();
  if (lotteSku) return lotteSku as { id: string; brand: string; denomination: number };

  const { data: anySku } = await admin
    .from('sku')
    .select('id, brand, denomination')
    .eq('is_active', true)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!anySku) throw new Error('활성 SKU 가 없습니다 — 0020_sku_thumbnails 적용 확인');
  return anySku as { id: string; brand: string; denomination: number };
}

async function ensureSubmittedListing(sellerId: string, skuId: string) {
  const { data: existing } = await admin
    .from('listing')
    .select('id, unit_price')
    .eq('seller_id', sellerId)
    .eq('sku_id', skuId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    console.log(`  ℹ 기존 submitted listing 재사용 — id=${existing.id}`);
    return existing.id as string;
  }

  // 50000원권 → 98.5% 시세 = 49,250원
  const unitPrice = 49250;
  const { data, error } = await admin
    .from('listing')
    .insert({
      seller_id: sellerId,
      sku_id: skuId,
      quantity_offered: 2,
      quantity_remaining: 2,
      unit_price: unitPrice,
      status: 'submitted',
    })
    .select('id')
    .single();
  if (error) throw new Error(`listing insert 실패: ${error.message}`);
  console.log(
    `  ✓ submitted listing 생성 — id=${data.id}, 단가=${unitPrice.toLocaleString('ko-KR')}원`,
  );
  return data.id as string;
}

async function main() {
  console.log('[seed-test-listing] 시작');
  const sellerId = await ensureTestSeller();
  const sku = await pickSku();
  console.log(`  · SKU: ${sku.brand} ${sku.denomination.toLocaleString('ko-KR')}원권 (${sku.id})`);
  const listingId = await ensureSubmittedListing(sellerId, sku.id);

  console.log('\n[seed-test-listing] 완료');
  console.log(`테스트 판매자 (참고용):`);
  console.log(`  · username = ${TEST_SELLER_USERNAME}`);
  console.log(`  · password = ${TEST_SELLER_PASSWORD}`);
  console.log(`매물 URL: /catalog/${listingId}`);
  console.log(`\n매입 시도하려면:`);
  console.log(`  1. /admin/members 에서 매입할 사용자에 agent role 부여`);
  console.log(`  2. 또는 admin 계정(carey 등)으로 로그인 후 /catalog/${listingId} 진입`);
}

main().catch((e) => {
  console.error('[seed-test-listing] 예외:', e);
  process.exit(1);
});
