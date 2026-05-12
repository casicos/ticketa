import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 한국 은행 표준 코드.
 * - DB 마스터: `public.banks` (0030 마이그레이션)
 * - 아래 하드코딩은 동기 코드 경로 폴백 / 시드 일치성 보장용. 어드민에서 banks 테이블에
 *   행 추가/비활성화 시 fetchBanks() 로 동적 조회 권장.
 */
export const KOREAN_BANKS = [
  { code: '004', name: 'KB국민', brand_color: '#FFB100' },
  { code: '088', name: '신한', brand_color: '#0046FF' },
  { code: '020', name: '우리', brand_color: '#1E5BC6' },
  { code: '081', name: '하나', brand_color: '#008C95' },
  { code: '011', name: '농협', brand_color: '#009A4E' },
  { code: '003', name: '기업', brand_color: '#1E64A8' },
  { code: '090', name: '카카오뱅크', brand_color: '#FEE500' },
  { code: '089', name: '케이뱅크', brand_color: '#FF0066' },
  { code: '092', name: '토스뱅크', brand_color: '#0064FF' },
  { code: '007', name: '수협', brand_color: '#0083CB' },
  { code: '071', name: '우체국', brand_color: '#D52229' },
] as const;

export type KoreanBankCode = (typeof KOREAN_BANKS)[number]['code'];

export type Bank = {
  code: string;
  name: string;
  brand_color: string | null;
  thumbnail_url: string | null;
};

export function bankNameByCode(code: string): string {
  const found = KOREAN_BANKS.find((b) => b.code === code);
  return found?.name ?? code;
}

export function bankBrandColor(code: string): string {
  const found = KOREAN_BANKS.find((b) => b.code === code);
  return found?.brand_color ?? '#6B7280';
}

/** banks 테이블에서 활성 은행 목록 조회. RLS public read 라 anon 도 가능. */
export async function fetchBanks(supabase: SupabaseClient): Promise<Bank[]> {
  const { data } = await supabase
    .from('banks')
    .select('code, name, brand_color, thumbnail_url')
    .eq('is_active', true)
    .order('display_order', { ascending: false });
  if (!data || data.length === 0) {
    // DB 비어있을 때 하드코딩 폴백
    return KOREAN_BANKS.map((b) => ({
      code: b.code,
      name: b.name,
      brand_color: b.brand_color,
      thumbnail_url: null,
    }));
  }
  return data as Bank[];
}

/** 단일 은행 조회 (with fallback). */
export async function fetchBankByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<Bank | null> {
  const { data } = await supabase
    .from('banks')
    .select('code, name, brand_color, thumbnail_url')
    .eq('code', code)
    .maybeSingle<Bank>();
  if (data) return data;
  const fb = KOREAN_BANKS.find((b) => b.code === code);
  if (!fb) return null;
  return { code: fb.code, name: fb.name, brand_color: fb.brand_color, thumbnail_url: null };
}
