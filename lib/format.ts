export function formatKRW(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return `${amount.toLocaleString('ko-KR')}원`;
}

const KOR_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'] as const;
const KOR_SUB_UNITS = ['', '십', '백', '천'] as const; // ones · tens · hundreds · thousands
const KOR_LARGE_UNITS = ['', '만', '억', '조'] as const;

function group4Korean(n: number): string {
  // n: 0..9999
  let s = '';
  const digits = [
    Math.floor(n / 1000) % 10,
    Math.floor(n / 100) % 10,
    Math.floor(n / 10) % 10,
    n % 10,
  ];
  for (let i = 0; i < 4; i++) {
    const d = digits[i]!;
    if (d === 0) continue;
    const unit = KOR_SUB_UNITS[3 - i]!;
    // 십/백/천 앞의 1 은 생략 ("일십" 대신 "십")
    if (d === 1 && unit) s += unit;
    else s += KOR_DIGITS[d]! + unit;
  }
  return s;
}

/**
 * 정수를 한국어 한자식 읽기로 변환. 양의 정수에 한해 동작.
 *   500000 → "오십만"
 *   1234567 → "백이십삼만사천오백육십칠"
 *   10000 → "만" (관용적으로 "일만" 생략)
 */
export function koreanNumberWord(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '';
  let num = Math.floor(n);
  if (num === 0) return '영';

  const parts: string[] = [];
  let unitIdx = 0;
  while (num > 0 && unitIdx < KOR_LARGE_UNITS.length) {
    const group = num % 10000;
    if (group > 0) {
      let s = group4Korean(group);
      // 일만 → 만, 일억 → 억 (상위 단위 앞의 단순 1 생략)
      if (s === '일' && unitIdx > 0) s = '';
      parts.unshift(s + KOR_LARGE_UNITS[unitIdx]!);
    }
    num = Math.floor(num / 10000);
    unitIdx++;
  }
  return parts.join('');
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

/**
 * 액면가를 한국식 짧은 단위로 표기.
 *   5_000      → "5천원"
 *   10_000     → "1만원"
 *   30_000     → "3만원"
 *   500_000    → "50만원"
 *   100_000_000 → "1억원"
 * `0.5만원` 같은 소수 표기를 피하고 한 단계 낮은 단위(천원)로 자연스럽게 표시.
 */
export function formatDenomination(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0원';
  if (value >= 100_000_000 && value % 100_000_000 === 0) {
    return `${(value / 100_000_000).toLocaleString('ko-KR')}억원`;
  }
  if (value >= 10_000) {
    return `${(value / 10_000).toLocaleString('ko-KR')}만원`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('ko-KR')}천원`;
  }
  return `${value.toLocaleString('ko-KR')}원`;
}

/** 액면가 + "권" 접미. 예: 5000 → "5천원권", 50000 → "5만원권". */
export function formatDenominationLabel(value: number): string {
  return `${formatDenomination(value)}권`;
}

/**
 * 마일리지 원장 memo 를 일반 사용자에게 보기 좋게 정리.
 *  - ` [cash bucket]` / ` [pg bucket]` 접미사 제거 (DB 내부 분기 표식, bucket 컬럼에 이미 있음)
 *  - `listing=<uuid>` / `(listing=<uuid>)` 등 UUID 토큰과 빈 괄호 제거
 *  - 패턴별로 한국어화 + skuLabel 이 있으면 어떤 매물인지 같이 표시
 *      매입       → "매입 2매 · 롯데 5만원권"
 *      취소 환불  → "취소 환불 · 롯데 5만원권 — 사유"
 *      선물 발송  → "선물 발송 · 롯데 5만원권 → @tester01"
 */
export function formatLedgerMemo(
  memo: string | null | undefined,
  fallback?: string | null,
  skuLabel?: string | null,
): string {
  if (!memo || !memo.trim()) return fallback ?? '';
  let s = memo;

  // 버킷 접미사 제거
  s = s.replace(/\s*\[(cash|pg) bucket\]\s*/g, '').trim();

  // (listing=<uuid>) / listing=<uuid> 토큰 제거
  s = s.replace(/\s*\(\s*listing=[0-9a-f-]{8,}\s*\)/gi, '').trim();
  s = s.replace(/\s*listing=[0-9a-f-]{8,}\b/gi, '').trim();
  // 빈 괄호 정리
  s = s.replace(/\s*\(\s*\)\s*/g, ' ').trim();

  const skuSuffix = skuLabel ? ` · ${skuLabel}` : '';

  // 매입 패턴
  const purchaseMatch = s.match(/^매입\s*:?\s*(.*)$/);
  if (purchaseMatch) {
    const tail = purchaseMatch[1] ?? '';
    const qtyMatch = tail.match(/qty=(\d+)/i);
    const qtyPart = qtyMatch ? ` ${Number(qtyMatch[1]).toLocaleString('ko-KR')}매` : '';
    return `매입${qtyPart}${skuSuffix}`;
  }

  // 취소 환불 — reason= 만 남기고 SKU + 사유로 분리
  const cancelMatch = s.match(/^취소\s*환불\s*:?\s*(.*)$/);
  if (cancelMatch) {
    const tail = (cancelMatch[1] ?? '').trim();
    const reasonMatch = tail.match(/reason=(.+)$/i);
    const reason = reasonMatch ? reasonMatch[1]!.trim() : tail.replace(/^reason=/i, '').trim();
    return reason ? `취소 환불${skuSuffix} — ${reason}` : `취소 환불${skuSuffix}`;
  }

  // 선물 발송: "선물 발송 → @aaa" 또는 "선물 발송 (...) → @aaa"
  const giftSendMatch = s.match(/^선물\s*발송\s*:?\s*(?:[→\-]+\s*)?(@?[A-Za-z0-9_.-]+)?$/);
  if (giftSendMatch) {
    const rcpt = (giftSendMatch[1] ?? '').trim();
    const rcptPart = rcpt ? ` → ${rcpt.startsWith('@') ? rcpt : `@${rcpt}`}` : '';
    return `선물 발송${skuSuffix}${rcptPart}`;
  }
  // "선물 발송 → @aaa" — 화살표를 별도 토큰으로 처리
  if (/^선물\s*발송/.test(s)) {
    const arrowMatch = s.match(/(?:→|->)\s*(@?[A-Za-z0-9_.-]+)/);
    const rcpt = arrowMatch?.[1] ?? '';
    const rcptPart = rcpt ? ` → ${rcpt.startsWith('@') ? rcpt : `@${rcpt}`}` : '';
    return `선물 발송${skuSuffix}${rcptPart}`;
  }

  // 선물 마일리지 수령
  if (/^선물\s*마일리지\s*수령/.test(s)) {
    const qtyMatch = s.match(/\((\d+)\s*매\)/);
    const qtyPart = qtyMatch ? ` ${qtyMatch[1]}매` : '';
    return `선물 마일리지 수령${qtyPart}${skuSuffix}`;
  }

  // 선물 정산 / 선물 환불 일반 패턴
  const giftEtcMatch = s.match(/^(선물\s*\S+)/);
  if (giftEtcMatch) {
    return `${giftEtcMatch[1]}${skuSuffix}`;
  }

  // 정산 패턴
  const settleMatch = s.match(/^정산\s*:?\s*(.*)$/);
  if (settleMatch) {
    return `정산${skuSuffix}`;
  }

  // qty=N 단독 잔여 토큰 제거
  s = s.replace(/\s*qty=\d+\b/gi, '').trim();
  // 콜론으로 끝나는 경우 정리
  s = s.replace(/[:：]\s*$/g, '').trim();

  return s + skuSuffix || (fallback ?? '');
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
