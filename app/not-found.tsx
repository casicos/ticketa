import Link from 'next/link';

export default function NotFound() {
  const accent = '#7DC79F';
  const bg = 'linear-gradient(140deg, #1A2230 0%, #2A1F3A 100%)';

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
              NOT FOUND
            </div>
            <div
              className="font-mono text-[220px] leading-[0.9] font-black tracking-[-0.06em]"
              style={{ color: 'transparent', WebkitTextStroke: `1.5px ${accent}` }}
            >
              404
            </div>
            <div className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              req-id: tx-2026-04829-a3f1
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="text-muted-foreground text-[15px] font-bold tracking-[0.1em]">
              HTTP 404
            </div>
            <h1 className="mt-2 text-[36px] leading-[1.18] font-extrabold tracking-[-0.022em]">
              찾으시는 페이지가 없어요
            </h1>
            <p className="text-muted-foreground mt-3.5 text-base leading-[1.7]">
              주소가 잘못 입력되었거나, 매물이 이미 거래되어 페이지가 사라졌을 수 있어요.
            </p>
            <div className="mt-7 flex gap-2.5">
              <Link
                href="/"
                className="bg-ticketa-blue-500 flex h-12 items-center rounded-[10px] px-[22px] text-[15px] font-extrabold text-white"
              >
                홈으로
              </Link>
              <Link
                href="/catalog"
                className="border-border text-foreground flex h-12 items-center rounded-[10px] border bg-white px-[22px] text-[15px] font-extrabold"
              >
                시세 확인
              </Link>
            </div>
            <div className="text-muted-foreground mt-5 text-[15px]">
              인기 검색어:{' '}
              <Link href="/catalog" className="text-ticketa-blue-700 font-bold hover:underline">
                롯데 50만원권
              </Link>
              {' · '}
              <Link href="/catalog" className="text-ticketa-blue-700 font-bold hover:underline">
                현대 30만원권
              </Link>
              {' · '}
              <Link href="/catalog" className="text-ticketa-blue-700 font-bold hover:underline">
                신세계 10만원권
              </Link>
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
              NOT FOUND
            </div>
            <div
              className="text-center font-mono text-[140px] leading-[0.9] font-black"
              style={{ color: 'transparent', WebkitTextStroke: `1.5px ${accent}` }}
            >
              404
            </div>
            <div>
              <div className="text-[22px] leading-[1.25] font-extrabold tracking-[-0.018em]">
                찾으시는 페이지가 없어요
              </div>
              <div
                className="mt-2 text-[15px] leading-[1.65]"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                주소가 잘못되었거나 매물이 사라졌을 수 있어요.
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="bg-ticketa-blue-500 flex h-[52px] items-center justify-center rounded-xl text-[14px] font-extrabold text-white"
          >
            홈으로
          </Link>
          <Link
            href="/catalog"
            className="border-border text-foreground flex h-[44px] items-center justify-center rounded-xl border bg-white text-[14px] font-bold"
          >
            시세 확인
          </Link>
        </div>
      </div>
    </div>
  );
}
