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
    .select('sku_id, unit_price, quantity_offered, status, sku:sku_id(brand, denomination)')
    .eq('status', 'completed');
  if (error) throw error;

  console.log(`완료 매물: ${listings?.length ?? 0}건\n`);

  const bySku = new Map<string, { count: number; volume: number; brand: string; denom: number }>();
  for (const l of listings ?? []) {
    const sku = (l.sku as any) ?? {};
    const key = l.sku_id;
    const prev = bySku.get(key) ?? {
      count: 0,
      volume: 0,
      brand: sku.brand ?? '?',
      denom: sku.denomination ?? 0,
    };
    prev.count += 1;
    prev.volume += l.unit_price * l.quantity_offered;
    bySku.set(key, prev);
  }

  console.log('=== SKU 별 집계 ===');
  for (const [id, s] of bySku) {
    console.log(
      `  ${s.brand} ${s.denom.toLocaleString()}원권 · ${s.count}건 · ${s.volume.toLocaleString()}원 (${Math.round(s.volume / 10000)}만)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
