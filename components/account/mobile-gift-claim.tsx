import { DeptMark, type Department } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs gifts table (see desktop-gift-claim.tsx for schema notes)
// TODO: backend wiring — needs claim_gift RPC
// TODO: backend wiring — needs convert_gift_to_mileage RPC

export type GiftClaimStub = {
  giftCode: string;
  senderName: string;
  dept: Department;
  skuLabel: string;
  faceValue: number;
  expiresAt: string;
  message: string;
  expiresInLabel: string;
};

const STUB: GiftClaimStub = {
  giftCode: 'GFT-2026-00821',
  senderName: '박서연',
  dept: 'hyundai',
  skuLabel: '현대백화점 30만원권',
  faceValue: 300000,
  expiresAt: '2027.11.06',
  message: '지민아 생일 진심으로 축하해 🎂 올해는 백화점에서 마음껏 쇼핑하길!',
  expiresInLabel: '4일 13시간',
};

export function MobileGiftClaim({ className }: { className?: string }) {
  const g = STUB;

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
        <span className="flex-1 text-center text-sm font-extrabold tracking-tight">선물 받기</span>
        <div className="size-8" />
      </div>

      {/* Scrollable content */}
      <div className="bg-background flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="p-3.5 pb-0">
          <div
            className="relative overflow-hidden rounded-[18px] border px-4.5 pt-4.5 pb-4"
            style={{
              background: 'linear-gradient(140deg, #FFF6E2 0%, #FFE9C0 45%, #FAD08A 100%)',
              borderColor: 'rgba(212,162,76,0.35)',
              padding: '18px 18px 16px',
            }}
          >
            <div
              className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 65%)',
              }}
            />

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#11161E] px-2.5 py-1 text-[12px] font-extrabold tracking-widest text-[#FAD08A]">
              🎁 GIFT
            </span>
            <div className="text-warm-700 mt-3.5 text-sm font-bold">{g.senderName}님이 보낸</div>
            <div className="mt-0.5 text-[22px] leading-tight font-black tracking-tight text-[#3F2A0A]">
              현대백화점
              <br />
              30만원권
            </div>

            {/* Voucher row */}
            <div
              className="mt-3.5 flex items-center gap-2.5 rounded-xl border bg-white p-3"
              style={{ borderColor: 'rgba(212,162,76,0.30)' }}
            >
              <DeptMark dept={g.dept} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">
                  {g.skuLabel.replace('백화점 ', '\n').split('\n')[0]}권
                </div>
                <div className="text-muted-foreground text-xs">유효 ~{g.expiresAt}</div>
              </div>
              <div className="text-base font-black tabular-nums">
                {g.faceValue.toLocaleString('ko-KR')}
                <span className="text-muted-foreground ml-0.5 text-[12px] font-bold">원</span>
              </div>
            </div>

            {/* Message */}
            <div
              className="mt-3 rounded-xl border p-3"
              style={{
                background: 'rgba(255,255,255,0.55)',
                borderColor: 'rgba(212,162,76,0.40)',
                borderStyle: 'dashed',
              }}
            >
              <div className="text-ticketa-gold-700 mb-1.5 text-[12px] font-extrabold tracking-widest uppercase">
                FROM {g.senderName}
              </div>
              <p className="text-sm leading-snug font-semibold text-[#3F2A0A]">{g.message}</p>
            </div>
          </div>
        </div>

        {/* Claim options */}
        <div className="px-3.5 pt-3.5">
          <div className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wider uppercase">
            받는 방법 선택
          </div>
          <div className="flex flex-col gap-2">
            {/* Physical card — selected */}
            <div
              className="rounded-xl border-2 bg-white p-3.5"
              style={{ borderColor: 'var(--ticketa-gold-700)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-lg text-sm"
                  style={{ background: 'rgba(212,162,76,0.16)', color: 'var(--ticketa-gold-700)' }}
                >
                  🎫
                </span>
                <span className="text-sm font-extrabold">실물 카드로 받기</span>
                <span className="bg-ticketa-gold-100 text-ticketa-gold-700 inline-flex items-center rounded-sm px-1.5 py-0.5 text-[12px] font-bold">
                  추천
                </span>
                <span
                  className="ml-auto inline-flex size-[18px] items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                  style={{ background: 'var(--ticketa-gold-700)' }}
                >
                  ✓
                </span>
              </div>
              <div className="text-muted-foreground mt-1.5 text-xs">등기 발송 · 영업일 +1 출고</div>
            </div>

            {/* Mileage */}
            <div className="rounded-xl border bg-white p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="text-ticketa-blue-700 inline-flex size-7 items-center justify-center rounded-lg text-sm"
                  style={{ background: 'var(--ticketa-blue-50)' }}
                >
                  ₩
                </span>
                <span className="text-sm font-extrabold">마일리지로 보관</span>
                <span className="border-warm-300 ml-auto inline-flex size-[18px] rounded-full border-[1.5px]" />
              </div>
              <div className="text-muted-foreground mt-1.5 text-xs">
                {g.faceValue.toLocaleString('ko-KR')}M 입금 · 다른 거래에 사용 가능
              </div>
            </div>
          </div>
        </div>

        {/* Expiry notice */}
        <p className="text-muted-foreground pt-3.5 pb-4 text-center text-xs">
          받기 만료까지 <b className="text-destructive">{g.expiresInLabel}</b> 남았어요
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="border-t bg-white px-3.5 pt-2.5 pb-4">
        <button
          className="h-[50px] w-full rounded-xl text-sm font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, #11161E, #1A2230)', border: 0 }}
        >
          {/* TODO: wire to claim_gift RPC */}
          실물 카드 받기 →
        </button>
      </div>
    </div>
  );
}
