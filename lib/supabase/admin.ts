import { createClient } from '@supabase/supabase-js';

// WARNING: secret key 사용 (sb_secret_...). app/(admin)/** 및 lib/domain/admin/** 외부에서 import 금지.
// ESLint boundaries 규칙으로 강제됨.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error('Supabase admin env not configured');
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
