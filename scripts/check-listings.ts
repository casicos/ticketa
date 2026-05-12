import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const { data: listings, error } = await admin
    .from('listing')
    .select(
      'id, status, quantity_offered, quantity_remaining, unit_price, submitted_at, sku:sku_id(display_name), seller:seller_id(email,full_name)',
    )
    .order('submitted_at', { ascending: false });
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const l of listings ?? []) counts[l.status] = (counts[l.status] ?? 0) + 1;

  console.log('=== 상태별 카운트 ===');
  for (const [s, n] of Object.entries(counts)) console.log(`  ${s}: ${n}`);

  console.log('\n=== 매물 상세 ===');
  for (const l of (listings ?? []).slice(0, 20)) {
    const sku = (l.sku as any)?.display_name ?? '?';
    const seller = (l.seller as any)?.full_name || (l.seller as any)?.email || '?';
    console.log(
      `  [${l.status.padEnd(10)}] ${sku} · ${l.quantity_remaining}/${l.quantity_offered}장 · ${l.unit_price.toLocaleString()}원 · ${seller}`,
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
