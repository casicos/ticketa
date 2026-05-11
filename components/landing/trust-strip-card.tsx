/**
 * Trust strip card — 4분할 (검수율/거래량/분쟁률/에스크로 등) 카드.
 * accent 로 kicker 색만 분기 (gold | blue).
 */
export function TrustStripCard({
  kicker,
  value,
  sub,
  accent = 'gold',
}: {
  kicker: string;
  value: string;
  sub: string;
  accent?: 'gold' | 'blue';
}) {
  const kickerColor = accent === 'gold' ? 'text-ticketa-gold-700' : 'text-ticketa-blue-700';

  return (
    <div className="border-border flex flex-col gap-1 rounded-xl border bg-white px-4 py-3.5">
      <span className={`text-[13px] font-bold tracking-[0.06em] uppercase ${kickerColor}`}>
        {kicker}
      </span>
      <span className="text-foreground text-base font-extrabold tracking-tight">{value}</span>
      <span className="text-muted-foreground text-[15px] leading-snug">{sub}</span>
    </div>
  );
}
