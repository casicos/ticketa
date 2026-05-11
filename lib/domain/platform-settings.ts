import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchBankByCode } from '@/lib/domain/banks';

const DEFAULT_WITHDRAW_FEE = 1000;

export type BankInfo = {
  bank_code: string;
  bank_name: string;
  brand_color: string | null;
  thumbnail_url: string | null;
  account: string;
  holder: string;
};

const FALLBACK_BANK_CODE = '088'; // 신한
const FALLBACK_ACCOUNT = '140-015-302230';
const FALLBACK_HOLDER = '(주)명길 김광식';

/**
 * platform_settings.bank_info → banks 조인. RLS public read 라 anon 도 가능.
 * 값이 비어있거나 오류 시 하드코딩 기본값 반환 (운영 안전).
 */
export async function fetchBankInfo(supabase: SupabaseClient): Promise<BankInfo> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'bank_info')
    .maybeSingle<{
      value: { bank_code?: string; bank_name?: string; account?: string; holder?: string };
    }>();
  const v = data?.value;

  const bankCode = v?.bank_code ?? FALLBACK_BANK_CODE;
  const account = v?.account ?? FALLBACK_ACCOUNT;
  const holder = v?.holder ?? FALLBACK_HOLDER;

  const bank = await fetchBankByCode(supabase, bankCode);
  return {
    bank_code: bankCode,
    bank_name: bank?.name ?? v?.bank_name ?? '신한',
    brand_color: bank?.brand_color ?? null,
    thumbnail_url: bank?.thumbnail_url ?? null,
    account,
    holder,
  };
}

/** 출금 수수료 (원 단위). platform_settings.withdraw_fee.amount → 기본 1,000원. */
export async function fetchWithdrawFee(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'withdraw_fee')
    .maybeSingle<{ value: { amount?: number } }>();
  const v = data?.value;
  if (typeof v?.amount === 'number' && Number.isFinite(v.amount) && v.amount >= 0) {
    return Math.floor(v.amount);
  }
  return DEFAULT_WITHDRAW_FEE;
}
