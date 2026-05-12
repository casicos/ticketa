import { createClient } from '@supabase/supabase-js';

// WARNING: secret key 사용 (sb_secret_...). lib/domain/** 외부에서 import 금지.
// RPC 함수 호출(create_order_transaction, restore_listing_stock, release_payout) 래퍼 전용.
export function createSupabaseTransactionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error('Supabase transaction env not configured');
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
