export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '-';
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '-';
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 짧은 ID 표시 (UUID 앞 8자 대문자) */
export function shortId(id: string | null | undefined): string {
  if (!id) return '-';
  return id.slice(0, 8).toUpperCase();
}

/** 판매자 익명화 코드 */
export function sellerCode(sellerId: string | null | undefined): string {
  if (!sellerId) return '판매자 ?';
  return `판매자 ${shortId(sellerId)}`;
}

/**
 * E.164(`+821012345678`) 또는 원본 숫자를 국내 표기(`010-1234-5678`)로 변환.
 * 국내 내수용이라 국가코드 `+82` 는 표시하지 않고 `0` 접두어로 복원.
 */
export function formatKoreanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  // +82 로 시작 → 0 복원 (82 10... → 010...)
  if (digits.startsWith('82')) digits = '0' + digits.slice(2);
  // 01X 10자리 (휴대폰)
  if (digits.length === 11 && digits.startsWith('01')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  // 02 서울 (9~10자리) 또는 기타 국번
  if (digits.length === 10 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }
  return digits;
}

/** 국내 포맷 + 가운데 4자리 마스킹. 예: `010-****-5678`. */
export function maskKoreanPhone(phone: string | null | undefined): string {
  const f = formatKoreanPhone(phone);
  if (!f) return '';
  const parts = f.split('-');
  if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
  // fallback: 뒤 4자리만 남기고 마스킹
  const last4 = f.slice(-4);
  return '*'.repeat(Math.max(f.length - 4, 0)) + last4;
}
