import { DeptMark } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs agent_inbound_requests table (see desktop-inbound.tsx for schema notes)
// TODO: backend wiring — needs submit_inbound_request RPC
// All data below is static stub placeholder.

const STEPS = 4;
const CURRENT_STEP = 2; // 1-indexed

export function MobileAgentInbound({ className }: { className?: string }) {
  return (
    <div className={`flex min-h-svh flex-col ${className ?? ''}`}>
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <button className="text-muted-foreground hover:bg-muted flex items-center justify-center rounded-lg p-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 5L7.5 10L12.5 15"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="flex-1 text-center text-sm font-extrabold tracking-tight">
          위탁 입고 신청
        </span>
        <div className="size-8" />
      </div>

      {/* Mini stepper */}
      <div className="flex items-center gap-1.5 border-b bg-white px-4 py-3">
        {Array.from({ length: STEPS }).map((_, i) => {
          const n = i + 1;
          const done = n < CURRENT_STEP;
          const active = n === CURRENT_STEP;
          return (
            <div key={n} className="flex flex-1 items-center">
              <span
                className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                style={{
                  background: done ? '#1F6B43' : active ? '#D4A24C' : 'var(--warm-200)',
                  color: done || active ? '#fff' : 'var(--warm-700)',
                }}
              >
                {done ? '✓' : n}
              </span>
              {i < STEPS - 1 && (
                <span
                  className="mx-1 h-0.5 flex-1"
                  style={{ background: done ? '#1F6B43' : 'var(--warm-100)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div className="bg-background flex-1 overflow-y-auto p-3.5">
        <div className="text-ticketa-gold-700 mb-1 text-[14px] font-extrabold tracking-wider">
          STEP {CURRENT_STEP} / {STEPS}
        </div>
        <h2 className="mb-3.5 text-[19px] font-extrabold tracking-tight">수량 · 가격</h2>

        <div className="flex flex-col gap-3">
          {/* SKU preview */}
          <div>
            <div className="text-warm-700 mb-1 text-xs font-extrabold">SKU</div>
            <div className="flex items-center gap-2.5 rounded-xl border bg-white p-3">
              <DeptMark dept="hyundai" size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">현대 10만원권</div>
                <div className="text-muted-foreground text-xs">변경하려면 1단계로</div>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div className="text-warm-700 mb-1 text-xs font-extrabold">입고 수량 *</div>
            <div className="flex items-center gap-1.5">
              <button className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-white text-lg font-extrabold">
                −
              </button>
              <input
                className="h-11 flex-1 rounded-lg border text-center text-lg font-extrabold tabular-nums"
                defaultValue="500"
                type="number"
              />
              <button className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-white text-lg font-extrabold">
                +
              </button>
              <span className="text-muted-foreground text-sm font-bold">매</span>
            </div>
          </div>

          {/* Suggested price */}
          <div>
            <div className="text-warm-700 mb-1 text-xs font-extrabold">권장 판매가 / 매 *</div>
            <input
              className="h-11 w-full rounded-lg border px-3 text-base font-bold tabular-nums"
              defaultValue="96,500원"
            />
            <div
              className="text-muted-foreground mt-1.5 rounded-lg px-2.5 py-2 text-xs"
              style={{ background: 'var(--warm-50)' }}
            >
              시세 평균 96,800원 · −0.3%
            </div>
          </div>

          {/* Revenue summary */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(212,162,76,0.08)' }}>
            <div className="text-ticketa-gold-700 mb-2 text-xs font-extrabold tracking-wider uppercase">
              예상 수익
            </div>
            <div className="text-ticketa-gold-700 text-[22px] font-black tracking-tight tabular-nums">
              47,526,250원
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              500매 × 96,500원 − 수수료 1.5%
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="flex gap-2 border-t bg-white px-3.5 pt-2.5 pb-4">
        <button className="h-[50px] flex-1 rounded-xl border bg-white text-sm font-bold">
          ← 이전
        </button>
        <button
          className="h-[50px] flex-[2] rounded-xl text-sm font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)', border: 0 }}
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
