import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type SkuTxStats = { sku_id: string; tx_count: number; tx_volume: number };

/**
 * SKU 별 누적 거래 통계 — completed 매물 기준.
 * 어드민 콘솔 카탈로그용. RLS 우회를 위해 admin client 사용.
 */
export async function fetchSkuTxStats(): Promise<Map<string, SkuTxStats>> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('listing')
    .select('sku_id, unit_price, quantity_offered')
    .eq('status', 'completed')
    .limit(10000);

  const map = new Map<string, SkuTxStats>();
  for (const l of (data ?? []) as {
    sku_id: string;
    unit_price: number;
    quantity_offered: number;
  }[]) {
    const prev = map.get(l.sku_id) ?? { sku_id: l.sku_id, tx_count: 0, tx_volume: 0 };
    prev.tx_count += 1;
    prev.tx_volume += l.unit_price * l.quantity_offered;
    map.set(l.sku_id, prev);
  }
  return map;
}
