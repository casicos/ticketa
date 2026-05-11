/**
 * 한국 은행 표준 코드 (전국은행연합회 기준 일부).
 * 정산 계좌 등록 시 은행 선택 드롭다운에서 사용.
 *
 * TODO(M1): 저축은행/상호금융 등 나머지 코드 추가.
 */
export const KOREAN_BANKS = [
  { code: '004', name: 'KB국민' },
  { code: '088', name: '신한' },
  { code: '020', name: '우리' },
  { code: '081', name: '하나' },
  { code: '011', name: '농협' },
  { code: '003', name: '기업' },
  { code: '090', name: '카카오뱅크' },
  { code: '089', name: '케이뱅크' },
  { code: '092', name: '토스뱅크' },
  { code: '007', name: '수협' },
  { code: '071', name: '우체국' },
] as const;

export type KoreanBankCode = (typeof KOREAN_BANKS)[number]['code'];

export function bankNameByCode(code: string): string {
  const found = KOREAN_BANKS.find((b) => b.code === code);
  return found?.name ?? code;
}
