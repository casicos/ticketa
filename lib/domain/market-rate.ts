/**
 * 시세 베이스라인 (Market rate baseline) — Ticketa 의 브랜드별 기준가율.
 *
 * **현재**: 브랜드 단위 고정 비율 (액면가 × ratio = 추정 시세)
 * **장래**: 실거래·검수 통과 매물의 가중 평균 → 시세 알고리즘 도입 (M2~M3 마일스톤)
 *
 * 모든 시세 노출 (랜딩 sparkline, 카탈로그 비교 라벨, "시세보다 X원 저렴" 등) 은
 * 이 모듈을 통해 가져온다. 알고리즘 도입 시 본 모듈만 갈아끼우면 전체 코드 영향
 * 최소화.
 */

export type BrandKey = 'lotte' | 'hyundai' | 'shinsegae' | 'galleria' | 'ak';

/**
 * 브랜드별 기준가율 — 운영팀 판단으로 시작값 세팅. 실시간 시세 데이터 도입 전까지 사용.
 * 갱신 시: NOTES.md 또는 `docs/launch-checklist.md` 의 변경 이력에도 기록.
 */
export const BRAND_PRICE_RATIO: Record<BrandKey, number> = {
  lotte: 0.985,
  hyundai: 0.986,
  shinsegae: 0.986,
  galleria: 0.975,
  ak: 0.978,
};

/** 한글 브랜드명 → key 매핑 (DB 의 brand 컬럼이 한글이라 변환 헬퍼 필요). */
const KOREAN_TO_KEY: Record<string, BrandKey> = {
  롯데백화점: 'lotte',
  현대백화점: 'hyundai',
  신세계백화점: 'shinsegae',
  갤러리아백화점: 'galleria',
  AK백화점: 'ak',
};

export function brandKeyFromKorean(brand: string): BrandKey | null {
  return KOREAN_TO_KEY[brand] ?? null;
}

/**
 * 액면가 × 브랜드 기준가율 → 정수 원 단위로 반올림.
 * 알 수 없는 브랜드는 0.98 fallback.
 */
export function getBaselinePrice(brand: BrandKey | string, face: number): number {
  const key = (brand in BRAND_PRICE_RATIO ? brand : brandKeyFromKorean(brand)) as BrandKey | null;
  const ratio = (key && BRAND_PRICE_RATIO[key]) ?? 0.98;
  return Math.round(face * ratio);
}

/**
 * 시세 대비 변동률 (%, 소수 1자리). 양수=시세보다 비쌈, 음수=시세보다 저렴.
 * UI 에서 색상·라벨 분기에 사용.
 */
export function getPriceDiffRate(
  brand: BrandKey | string,
  face: number,
  actualPrice: number,
): number {
  const baseline = getBaselinePrice(brand, face);
  if (baseline === 0) return 0;
  return Math.round(((actualPrice - baseline) / baseline) * 1000) / 10;
}
