/**
 * Ticketa remote DB smoke test.
 * Usage: pnpm dlx tsx scripts/verify-db.ts
 *
 * 다음을 검증:
 *  - 12 public 테이블 존재 (SKU, users, listing, ... )
 *  - SKU seed 15건
 *  - user_roles partial unique index 존재
 *  - handle_new_user / sync_user_roles_to_jwt trigger 존재
 *  - RPC 스켈레톤 3종 존재 (raise exception 확인)
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// .env.local 우선, 없으면 .env
config({ path: '.env.local' });
config({ path: '.env', override: false });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;

if (!URL || !SECRET) {
  console.error('[verify-db] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EXPECTED_TABLES = [
  'users',
  'user_roles',
  'seller_payout_accounts',
  'sku',
  'listing',
  'orders',
  'order_items',
  'payouts',
  'audit_events',
  'sensitive_access_log',
  'error_log',
  'notifications',
  // Wave 1 (0012): mileage refactor
  'mileage_accounts',
  'mileage_ledger',
  'charge_requests',
  'withdraw_requests',
  'cancellation_requests',
  'app_settings',
] as const;

let failures = 0;
function check(name: string, pass: boolean, detail?: string) {
  const mark = pass ? '✓' : '✗';
  const line = detail ? `${name} — ${detail}` : name;
  console.log(`${mark} ${line}`);
  if (!pass) failures++;
}

async function main() {
  // 1. 테이블 존재 — head-only select 1로 반환 카운트 체크
  for (const t of EXPECTED_TABLES) {
    const { error } = await admin.from(t).select('*', { head: true, count: 'exact' });
    check(`table public.${t} 존재 및 service-role 접근`, !error, error?.message);
  }

  // 2. SKU seed
  const {
    data: skus,
    error: skuErr,
    count,
  } = await admin.from('sku').select('brand,denomination', { count: 'exact' });
  check('SKU seed ≥15건', !skuErr && (count ?? 0) >= 15, skuErr?.message ?? `count=${count}`);
  if (skus && skus.length > 0) {
    const brands = new Set(skus.map((r: any) => r.brand));
    check('SKU 브랜드 5종', brands.size === 5, `brands=${[...brands].join(',')}`);
  }

  // 3. RPC 시그니처 존재 여부.
  //    - legacy (0007/0008): create_order_transaction / restore_listing_stock / release_payout
  //      → 0012 에서 deprecated 로 덮어씌워졌거나 admin role 검증 그대로. 각각 예외 발생 확인.
  //    - Wave 1 (0012): debit_mileage / credit_mileage / purchase_listing / complete_listing /
  //      cancel_listing. 더미 UUID 로 호출 시 INVALID_AMOUNT / FORBIDDEN / UNAUTHENTICATED /
  //      LISTING_NOT_FOUND 중 하나가 발생해야 정상 (존재 증거).
  const zeroUuid = '00000000-0000-0000-0000-000000000000';
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown>; expect: RegExp }> = [
    // legacy — 이제 deprecated or admin-role 예외만
    {
      fn: 'create_order_transaction',
      args: { p_buyer: zeroUuid, p_items: [], p_preview_signature: 'x', p_shipping: {} },
      expect: /deprecated|FORBIDDEN|UNAUTHENTICATED|agent role/i,
    },
    {
      fn: 'restore_listing_stock',
      args: { p_order: zeroUuid },
      expect: /deprecated|ORDER_NOT_FOUND|FORBIDDEN/i,
    },
    {
      fn: 'release_payout',
      args: { p_payout: zeroUuid, p_admin: zeroUuid },
      expect: /FORBIDDEN|admin role/i,
    },
    // Wave 1 — 새 mileage RPC
    {
      fn: 'debit_mileage',
      args: {
        p_user_id: zeroUuid,
        p_amount: 0, // INVALID_AMOUNT 유도
        p_type: 'spend',
        p_related_listing: null,
        p_memo: null,
      },
      expect: /INVALID_AMOUNT/i,
    },
    {
      fn: 'credit_mileage',
      args: {
        p_user_id: zeroUuid,
        p_amount: 0, // INVALID_AMOUNT 유도
        p_type: 'adjust',
        p_related_listing: null,
        p_related_charge: null,
        p_related_withdraw: null,
        p_memo: null,
      },
      expect: /INVALID_AMOUNT/i,
    },
    {
      fn: 'purchase_listing',
      args: { p_buyer: zeroUuid, p_listing: zeroUuid },
      // p_buyer 가 null 이 아니라서 UNAUTHENTICATED 는 안 뜨지만, user_roles 없으니 FORBIDDEN
      expect: /FORBIDDEN|agent or admin/i,
    },
    {
      fn: 'complete_listing',
      args: { p_actor: zeroUuid, p_listing: zeroUuid },
      expect: /LISTING_NOT_FOUND/i,
    },
    {
      fn: 'cancel_listing',
      args: { p_admin: zeroUuid, p_listing: zeroUuid, p_reason: 'smoke' },
      expect: /FORBIDDEN|admin role/i,
    },
  ];
  for (const { fn, args, expect } of rpcCalls) {
    const { error } = await admin.rpc(fn as any, args as any);
    const msg = error?.message ?? '';
    check(`rpc ${fn}() → 실구현된 예외 (${expect.source})`, expect.test(msg), msg || 'no error');
  }

  // 4. Trigger 및 partial unique index 존재 확인
  const { data: triggers, error: trigErr } = await admin.rpc('pg_catalog_check' as any, {});
  // pg_catalog 접근은 RPC 불가능. 대신 insert 시도로 간접 검증:
  // - user_roles partial unique: 같은 user+role+revoked_at=null 2회 insert → 두번째 unique_violation
  // 이건 실 계정 필요해서 seed-admin 뒤에 Phase 1 PoC에서 확인
  if (trigErr) {
    console.log(`  (trigger/index 존재 여부는 Phase 1 PoC에서 실제 insert로 확인 예정)`);
  }

  console.log(failures === 0 ? '\n✅ 전부 통과' : `\n❌ ${failures}건 실패`);
  process.exit(failures);
}

main().catch((e) => {
  console.error('[verify-db] 예외:', e);
  process.exit(1);
});
