import { DeptMark } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs gifts table (sent/received gift records)
// TODO: backend wiring — needs send_gift RPC
// TODO: backend wiring — needs claim_gift RPC

const MOCK_RECEIVED = [
  {
    id: 1,
    dept: 'lotte' as const,
    from: '박지원',
    date: '11.10',
    face: 50000,
    msg: '생일 축하해요!',
    state: 'unclaimed',
  },
  {
    id: 2,
    dept: 'hyundai' as const,
    from: '이수진',
    date: '11.05',
    face: 30000,
    msg: '고마워요 :)',
    state: 'claimed',
  },
  {
    id: 3,
    dept: 'shinsegae' as const,
    from: '최민준',
    date: '10.28',
    face: 100000,
    msg: '잘 써요!',
    state: 'claimed',
  },
];

export function MobileGift() {
  return (
    <div className="flex flex-col pb-6">
      {/* Compose hero */}
      <div className="mx-4 mt-4">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #1A2332 0%, #2A1F1A 100%)' }}
        >
          <div
            className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,162,76,0.30), transparent 70%)',
            }}
          />
          <div className="relative">
            <div className="text-ticketa-gold-500 text-[12px] font-extrabold tracking-widest uppercase">
              상품권 보내기
            </div>
            <h2 className="mt-1.5 mb-4 text-base leading-snug font-extrabold tracking-tight">
              금액·받는사람만 정하면
              <br />
              1초만에 전송돼요.
            </h2>
            <div className="mb-3 flex gap-1.5">
              {[10000, 30000, 50000, 100000].map((a, i) => (
                <div
                  key={a}
                  className="flex flex-1 items-center justify-center rounded-lg py-2 text-xs font-bold tabular-nums"
                  style={{
                    border:
                      i === 2
                        ? '2px solid var(--ticketa-gold-500)'
                        : '1px solid rgba(255,255,255,0.18)',
                    background: i === 2 ? 'rgba(212,162,76,0.14)' : 'rgba(255,255,255,0.04)',
                    color: i === 2 ? 'var(--ticketa-gold-500)' : 'rgba(255,255,255,0.85)',
                  }}
                >
                  {a / 1000}천
                </div>
              ))}
            </div>
            {/* TODO: backend wiring — needs user search by phone RPC */}
            <div
              className="mb-3 rounded-xl border p-3 text-sm text-white/40"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              전화번호로 검색하세요
            </div>
            <button
              type="button"
              className="w-full rounded-xl py-3 text-sm font-extrabold text-[#11161E]"
              style={{ background: 'var(--ticketa-gold-500)' }}
            >
              50,000원 보내기 →
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-3">
        <div className="divide-border border-border grid grid-cols-2 divide-x overflow-hidden rounded-xl border bg-white">
          <div className="px-4 py-3">
            <div className="text-muted-foreground text-[12px] font-bold tracking-widest uppercase">
              받은 상품권
            </div>
            {/* TODO: backend wiring — needs gifts table */}
            <div className="mt-0.5 text-lg font-extrabold tabular-nums">
              180,000<span className="ml-0.5 text-xs opacity-60">원</span>
            </div>
            <div className="text-ticketa-gold-700 text-xs font-bold">미수령 1건</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-muted-foreground text-[12px] font-bold tracking-widest uppercase">
              보낸 상품권
            </div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums">
              120,000<span className="ml-0.5 text-xs opacity-60">원</span>
            </div>
            <div className="text-muted-foreground text-xs">3건 완료</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-border mx-4 mt-4 flex gap-4 border-b pb-0">
        <button type="button" className="border-foreground border-b-2 pb-2 text-sm font-extrabold">
          받은 상품권 <span className="text-muted-foreground ml-1">{MOCK_RECEIVED.length}</span>
        </button>
        <button type="button" className="text-muted-foreground pb-2 text-sm font-semibold">
          보낸 상품권 <span className="ml-1">3</span>
        </button>
      </div>

      {/* Gift cards */}
      <div className="mt-3 flex flex-col gap-3 px-4">
        {MOCK_RECEIVED.map((g) => (
          <div
            key={g.id}
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background:
                g.state === 'unclaimed'
                  ? 'linear-gradient(135deg, #FCE9C8 0%, #F4D7A8 100%)'
                  : 'var(--warm-50)',
              border:
                g.state === 'unclaimed'
                  ? '1px solid rgba(212,162,76,0.4)'
                  : '1px solid var(--border)',
            }}
          >
            {g.state === 'unclaimed' && (
              <span className="absolute top-3 right-3 rounded-full bg-[#11161E] px-2 py-0.5 text-[12px] font-extrabold tracking-widest text-white">
                NEW
              </span>
            )}
            <div className="mb-3 flex items-center gap-2.5">
              <DeptMark dept={g.dept} size={28} />
              <div>
                <div className="text-warm-700 text-xs font-semibold">{g.from}님이 보냄</div>
                <div className="text-muted-foreground text-[12px]">{g.date}</div>
              </div>
            </div>
            <div className="text-lg font-extrabold tabular-nums">
              {g.face.toLocaleString('ko-KR')}
              <span className="ml-0.5 text-sm font-bold opacity-60">원</span>
            </div>
            <div
              className="text-warm-700 mt-2 rounded-lg px-2.5 py-1.5 text-xs italic"
              style={{ background: 'rgba(255,255,255,0.45)' }}
            >
              &ldquo;{g.msg}&rdquo;
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-lg py-2 text-xs font-bold"
              style={{
                border: g.state === 'unclaimed' ? 'none' : '1px solid var(--border)',
                background: g.state === 'unclaimed' ? '#11161E' : '#fff',
                color: g.state === 'unclaimed' ? '#fff' : 'var(--warm-700)',
              }}
            >
              {g.state === 'unclaimed' ? '지금 받기 →' : '카드 정보 보기'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
