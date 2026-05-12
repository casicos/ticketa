import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  // 'method=' 토큰을 포함한 기존 메모를 찾고 사람 친화형으로 교체.
  const { data: rows, error } = await admin
    .from('mileage_ledger')
    .select('id, memo')
    .like('memo', '%method=%');
  if (error) throw error;

  console.log(`대상 row: ${rows?.length ?? 0}건`);
  for (const r of rows ?? []) {
    const memo = r.memo as string;
    const isPg = /method=pg/.test(memo);
    const depMatch = memo.match(/depositor=([^\s]+)/);
    const depositor = depMatch?.[1];
    const cleaned = isPg
      ? '카드 충전 완료'
      : `무통장입금 충전 완료${depositor && depositor !== '-' ? ` · 입금자 ${depositor}` : ''}`;
    const { error: upErr } = await admin
      .from('mileage_ledger')
      .update({ memo: cleaned })
      .eq('id', r.id);
    if (upErr) {
      console.error(`  #${r.id} 실패: ${upErr.message}`);
    } else {
      console.log(`  #${r.id} → "${cleaned}"`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
