/**
 * Ticketa 로고 — 인라인 SVG 로 color override 지원.
 * 마케팅 페이지에서 dark hero 위에 흰색 wordmark 가 필요해서 별도 컴포넌트.
 */

export function LogoSymbol({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <rect x="6" y="6" width="84" height="84" rx="22" fill="#11161E" />
      <text
        x="48"
        y="60"
        fontFamily="Pretendard, Inter, sans-serif"
        fontWeight={900}
        fontSize="36"
        fill="#fff"
        textAnchor="middle"
        letterSpacing="-1.5"
      >
        TK
      </text>
      <circle cx="74" cy="22" r="4" fill="#D4A24C" />
    </svg>
  );
}

export function LogoWordmark({
  height = 20,
  color = '#0F172A',
  dotColor = '#D4A24C',
}: {
  height?: number;
  color?: string;
  dotColor?: string;
}) {
  return (
    <svg height={height} viewBox="0 0 230 50" style={{ display: 'block' }} aria-label="Ticketa">
      <text
        x="0"
        y="38"
        fontFamily="Pretendard, Inter, sans-serif"
        fontWeight={900}
        fontSize="38"
        fill={color}
        letterSpacing="1.4"
      >
        TICKETA
      </text>
      <circle cx="184" cy="36" r="3.5" fill={dotColor} />
    </svg>
  );
}

export function LogoLockup({
  symbolSize = 28,
  wordmarkHeight = 18,
  color = '#0F172A',
}: {
  symbolSize?: number;
  wordmarkHeight?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoSymbol size={symbolSize} />
      <LogoWordmark height={wordmarkHeight} color={color} />
    </div>
  );
}
