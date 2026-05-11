'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking in production
    if (process.env.NODE_ENV !== 'development') {
      console.error(error);
    }
  }, [error]);

  const accent = '#FFB088';
  const bg = 'linear-gradient(140deg, #2A1F1F 0%, #3A1F2A 100%)';
  const reqId = error.digest ?? 'tx-2026-04829-a3f1';

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        {/* Desktop: side-by-side */}
        <div className="hidden w-full max-w-[980px] items-center gap-14 md:grid md:grid-cols-[420px_1fr]">
          {/* Glyph card */}
          <div
            className="relative flex h-[380px] flex-col justify-between overflow-hidden rounded-3xl p-10 text-white"
            style={{ background: bg }}
          >
            <div
              className="pointer-events-none absolute"
              style={{
                right: -80,
                top: -80,
                width: 280,
                height: 280,
                borderRadius: 999,
                background: `radial-gradient(circle, ${accent}33, transparent 65%)`,
              }}
            />
            <div className="text-[13px] font-extrabold tracking-[0.16em]" style={{ color: accent }}>
              SERVER ERROR
            </div>
            <div
              className="font-mono text-[220px] leading-[0.9] font-black tracking-[-0.06em]"
              style={{ color: 'transparent', WebkitTextStroke: `1.5px ${accent}` }}
            >
              500
            </div>
            <div className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              req-id: {reqId}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="text-muted-foreground text-[15px] font-bold tracking-[0.1em]">
              HTTP 500
            </div>
            <h1 className="mt-2 text-[36px] leading-[1.18] font-extrabold tracking-[-0.022em]">
              잠시 후 다시 시도해주세요
            </h1>
            <p className="text-muted-foreground mt-3.5 text-base leading-[1.7]">
              일시적인 서버 오류예요. 결제·정산 같은 거래 데이터는 안전하게 보관되니 안심하세요.
            </p>
            <div className="mt-7 flex gap-2.5">
              <button
                onClick={reset}
                className="bg-ticketa-blue-500 flex h-12 items-center rounded-[10px] px-[22px] text-[15px] font-extrabold text-white"
              >
                새로고침
              </button>
              <Link
                href="/"
                className="border-border text-foreground flex h-12 items-center rounded-[10px] border bg-white px-[22px] text-[15px] font-extrabold"
              >
                고객센터
              </Link>
            </div>
            <div className="bg-warm-50 text-muted-foreground mt-5 rounded-[10px] px-4 py-3.5 text-[15px]">
              ▶ 같은 오류가 반복되면 <strong className="text-foreground">고객센터 1666-0420</strong>
              으로 위 req-id를 알려주세요.
            </div>
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="flex w-full max-w-sm flex-col gap-4 md:hidden">
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-[18px] p-6 text-white"
            style={{ background: bg, minHeight: 260 }}
          >
            <div
              className="pointer-events-none absolute"
              style={{
                right: -50,
                top: -50,
                width: 180,
                height: 180,
                borderRadius: 999,
                background: `radial-gradient(circle, ${accent}33, transparent 65%)`,
              }}
            />
            <div className="text-[12px] font-extrabold tracking-[0.16em]" style={{ color: accent }}>
              SERVER ERROR
            </div>
            <div
              className="text-center font-mono text-[140px] leading-[0.9] font-black"
              style={{ color: 'transparent', WebkitTextStroke: `1.5px ${accent}` }}
            >
              500
            </div>
            <div>
              <div className="text-[22px] leading-[1.25] font-extrabold tracking-[-0.018em]">
                잠시 후 다시 시도해주세요
              </div>
              <div
                className="mt-2 text-[15px] leading-[1.65]"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                거래 데이터는 안전하게 보관됩니다.
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="bg-ticketa-blue-500 flex h-[52px] items-center justify-center rounded-xl text-[14px] font-extrabold text-white"
          >
            새로고침
          </button>
          <div className="text-muted-foreground text-center font-mono text-[12px]">
            req-id: {reqId}
          </div>
        </div>
      </div>
    </div>
  );
}
