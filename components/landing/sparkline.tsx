/**
 * Sparkline — 시세 트렌드 미니 차트.
 * y 값이 작을수록 가격이 낮음을 의미 (mockup 와 동일).
 */
export function Sparkline({
  points,
  color = 'var(--ticketa-blue-500)',
  width = 220,
  height = 48,
  fill = true,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points
    .map((p, i) => `${i * stepX},${(1 - (p - min) / range) * (height - 8) + 4}`)
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {fill && (
        <polyline
          fill={color}
          fillOpacity="0.10"
          stroke="none"
          points={`0,${height} ${coords} ${width},${height}`}
        />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}
