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

export type BusinessAddress = {
  company: string;
  recipient: string;
  phone: string;
  zip: string;
  address1: string;
  address2: string | null;
  note: string | null;
};

const FALLBACK_BIZ_ADDRESS: BusinessAddress = {
  company: 'Ticketa (주)',
  recipient: '검수팀',
  phone: '070-7882-2144',
  zip: '04793',
  address1: '서울특별시 성동구 아차산로7길 15-1',
  address2: '3층 3119호 (성수동2가, 제이제이빌딩)',
  note: '발송 시 박스 외부에 매물 ID 4자리를 큰 글씨로 적어주세요.',
};

/**
 * platform_settings.business_address — 사전 송부 매물을 보낼 사업장 소재지.
 * 값이 비어있거나 오류 시 하드코딩 기본값 반환.
 */
export async function fetchBusinessAddress(supabase: SupabaseClient): Promise<BusinessAddress> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'business_address')
    .maybeSingle<{
      value: Partial<BusinessAddress>;
    }>();
  const v = data?.value;
  if (!v) return FALLBACK_BIZ_ADDRESS;
  return {
    company: v.company ?? FALLBACK_BIZ_ADDRESS.company,
    recipient: v.recipient ?? FALLBACK_BIZ_ADDRESS.recipient,
    phone: v.phone ?? FALLBACK_BIZ_ADDRESS.phone,
    zip: v.zip ?? FALLBACK_BIZ_ADDRESS.zip,
    address1: v.address1 ?? FALLBACK_BIZ_ADDRESS.address1,
    address2: v.address2 ?? FALLBACK_BIZ_ADDRESS.address2,
    note: v.note ?? FALLBACK_BIZ_ADDRESS.note,
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
