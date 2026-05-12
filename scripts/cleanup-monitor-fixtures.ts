/**
 * Monitor 페이지 fixture 정리. seed-monitor-fixtures.ts 와 짝.
 * - monfixseller 가 만든 listing 전부 삭제
 * - monfixseller / monfixbuyer auth 계정도 함께 삭제 (선택)
 *
 * Usage: pnpm dlx tsx scripts/cleanup-monitor-fixtures.ts
 *        pnpm dlx tsx scripts/cleanup-monitor-fixtures.ts --keep-users  (계정은 유지)
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const SELLER_EMAIL = 'monfixseller@ticketa.local';
const BUYER_EMAIL = 'monfixbuyer@ticketa.local';

async function findUser(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email === email) ?? null;
}

async function main() {
  const keepUsers = process.argv.includes('--keep-users');

  const seller = await findUser(SELLER_EMAIL);
  const buyer = await findUser(BUYER_EMAIL);

  if (!seller && !buyer) {
    console.log('fixture 사용자 없음. 이미 정리됨.');
    return;
  }

  if (seller) {
    const { error: delErr, count } = await admin
      .from('listing')
      .delete({ count: 'exact' })
      .eq('seller_id', seller.id);
    if (delErr) {
      console.error('listing 삭제 실패:', delErr.message);
    } else {
      console.log(`✓ listing ${count ?? 0}건 삭제 (seller=${SELLER_EMAIL})`);
    }
  }

  if (!keepUsers) {
    for (const u of [seller, buyer]) {
      if (!u) continue;
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) console.error(`auth 계정 삭제 실패 (${u.email}):`, error.message);
      else console.log(`✓ auth 계정 삭제: ${u.email}`);
    }
  } else {
    console.log('--keep-users : auth 계정 유지');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
