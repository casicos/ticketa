/**
 * 발송 완료 매물에 표기되는 송장 정보 카드.
 * 디자인: screens-p0-additions::ShipmentInfoCard
 */
import { cn } from '@/lib/utils';

const CARRIER_VISUAL: Record<string, { label: string; short: string; bg: string; fg?: string }> = {
  kpost: { label: '우체국', short: '우체', bg: '#E4032E' },
  cj: { label: 'CJ대한통운', short: 'CJ', bg: '#A50034' },
  hanjin: { label: '한진택배', short: '한진', bg: '#0067B5' },
  lotte: { label: '롯데택배', short: '롯데', bg: '#E50012' },
  logen: { label: '로젠택배', short: '로젠', bg: '#1B7F3B' },
  cvs_cu: { label: '편의점 · CU', short: 'CU', bg: '#5A2989' },
  cvs_gs25: { label: '편의점 · GS25', short: 'GS', bg: '#005CAA' },
  cvs_emart24: { label: '편의점 · 이마트24', short: '이마', bg: '#FFCD0E', fg: '#1B1B1B' },
  cvs_seven: { label: '편의점 · 세븐일레븐', short: '세븐', bg: '#008C44' },
  etc: { label: '기타', short: '기타', bg: '#57534E' },
};

export function ShipmentInfoCard({
  carrier,
  trackingNo,
  shippedAt,
  adminMemo,
  showAdminMemo = false,
  className,
}: {
  carrier: string;
  trackingNo: string;
  shippedAt?: string | null;
  adminMemo?: string | null;
  /** 어드민 화면이면 true (구매자/판매자에게는 노출하지 않음). */
  showAdminMemo?: boolean;
  className?: string;
}) {
  const v = CARRIER_VISUAL[carrier] ?? { label: carrier, short: '?', bg: '#888' };
  const shippedAtLabel = shippedAt
    ? new Date(shippedAt).toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className={cn('border-border overflow-hidden rounded-[14px] border bg-white', className)}>
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-lg text-white"
            style={{ background: '#1F6B43' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3.5 7 12 3.5 20.5 7v9.5L12 20.5 3.5 16.5z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M3.5 7 12 11l8.5-4M12 11v9.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <div className="text-muted-foreground text-[14px] font-bold tracking-[0.04em]">
              배송 정보
            </div>
            <div className="text-[16px] font-extrabold tracking-[-0.014em]">
              발송 완료{shippedAtLabel ? ` · ${shippedAtLabel}` : ''}
            </div>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-extrabold tracking-[0.04em] whitespace-nowrap"
          style={{ background: 'rgba(46,124,82,0.10)', color: '#1F6B43' }}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-[#1F6B43]" />
          배송 중
        </span>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 px-5 py-5 text-[14px]">
        <span className="text-muted-foreground font-semibold">택배사</span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex size-[22px] items-center justify-center rounded-md text-[12px] font-black"
            style={{ background: v.bg, color: v.fg ?? '#fff' }}
          >
            {v.short}
          </span>
          <span className="font-bold">{v.label}</span>
        </span>

        <span className="text-muted-foreground font-semibold">송장번호</span>
        <span className="inline-flex items-center gap-2.5">
          <span className="font-mono text-[15px] font-bold tracking-[0.02em] tabular-nums">
            {trackingNo}
          </span>
        </span>

        {showAdminMemo && adminMemo && (
          <>
            <span className="text-muted-foreground font-semibold">발송 메모</span>
            <span className="text-warm-700 text-[14px] leading-[1.5]">
              {adminMemo}
              <span className="bg-warm-100 text-muted-foreground ml-1.5 rounded-[4px] px-1.5 py-0.5 text-[12px] font-bold">
                어드민 전용
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
