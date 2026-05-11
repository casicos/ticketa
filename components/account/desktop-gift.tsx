import { DeptMark } from '@/components/ticketa/dept-mark';

// TODO: backend wiring — needs gifts table (sent/received gift records)
// TODO: backend wiring — needs gift_balance column on mileage_accounts or separate gift ledger
// TODO: backend wiring — needs send_gift RPC
// TODO: backend wiring — needs claim_gift RPC

const MOCK_RECEIVED = [
  {
    id: 1,
    dept: 'lotte' as const,
    from: '박지원',
    date: '2026.11.10',
    face: 50000,
    msg: '생일 축하해요!',
    state: 'unclaimed',
  },
  {
    id: 2,
    dept: 'hyundai' as const,
    from: '이수진',
    date: '2026.11.05',
    face: 30000,
    msg: '고마워요 :)',
    state: 'claimed',
  },
  {
    id: 3,
    dept: 'shinsegae' as const,
    from: '최민준',
    date: '2026.10.28',
    face: 100000,
    msg: '잘 써요!',
    state: 'claimed',
  },
];

export function DesktopGift() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">선물 상품권</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          마일리지로 백화점 상품권을 보내거나 받을 수 있어요.
        </p>
      </div>

      {/* Top grid: compose + stats */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        {/* Compose card */}
        <div
          className="relative overflow-hidden rounded-2xl p-7 text-white"
          style={{ background: 'linear-gradient(135deg, #1A2332 0%, #2A1F1A 100%)' }}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-52 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,162,76,0.30), transparent 70%)',
            }}
          />
          <div className="relative">
            <div className="text-ticketa-gold-500 text-xs font-extrabold tracking-widest uppercase">
              상품권 보내기
            </div>
            <h2 className="mt-2 mb-5 text-xl leading-snug font-extrabold tracking-tight">
              금액·받는사람만 정하면
              <br />
              1초만에 전송돼요.
            </h2>
            <div className="mb-4 flex gap-2">
              {[10000, 30000, 50000, 100000].map((a, i) => (
                <div
                  key={a}
                  className="flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-bold tabular-nums"
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
            <div
              className="mb-3 rounded-xl border p-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="mb-1 text-[15px] text-white/60">받는 사람</div>
              {/* TODO: backend wiring — needs user search by phone RPC */}
              <div className="text-[15px] text-white/40">전화번호로 검색하세요</div>
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

        {/* Stats + info */}
        <div className="flex flex-col gap-3">
          <div className="surface-card grid grid-cols-2 gap-0 p-5">
            <div className="border-border border-r pr-5">
              <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                받은 상품권
              </div>
              {/* TODO: backend wiring — needs gifts table */}
              <div className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
                180,000<span className="ml-0.5 text-sm font-bold opacity-60">원</span>
              </div>
              <div className="text-ticketa-gold-700 mt-0.5 text-[15px] font-bold">
                미수령 1건 · 50,000원
              </div>
            </div>
            <div className="pl-5">
              <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                보낸 상품권
              </div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">
                120,000<span className="ml-0.5 text-sm font-bold opacity-60">원</span>
              </div>
              <div className="text-muted-foreground mt-0.5 text-[15px]">3건 전송 완료</div>
            </div>
          </div>

          <div className="surface-card flex-1 p-5">
            <div className="mb-3 text-sm font-extrabold">알아두기</div>
            <ul className="text-warm-700 flex flex-col gap-2 text-[15px] leading-relaxed">
              <li>
                · 선물 마일리지로 보내며, <strong>받는 사람의 결제수단으로 사용</strong>됩니다.
              </li>
              <li>· 미수령 7일 후 자동 취소되어 마일리지로 환불.</li>
              <li>· 익일 알림으로 받는 사람에게 SMS·앱 푸시 발송.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Received list */}
      <div className="surface-card overflow-hidden">
        <div className="border-border border-b px-5 py-4">
          <div className="flex gap-5">
            <button
              type="button"
              className="border-foreground border-b-2 pb-1 text-sm font-extrabold"
            >
              받은 상품권 <span className="text-muted-foreground ml-1">{MOCK_RECEIVED.length}</span>
            </button>
            <button type="button" className="text-muted-foreground pb-1 text-sm font-semibold">
              보낸 상품권 <span className="ml-1">3</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
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
              <div className="mb-4 flex items-center gap-2.5">
                <DeptMark dept={g.dept} size={32} />
                <div>
                  <div className="text-warm-700 text-[15px] font-semibold">{g.from}님이 보냄</div>
                  <div className="text-muted-foreground text-[15px]">{g.date}</div>
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight tabular-nums">
                {g.face.toLocaleString('ko-KR')}
                <span className="ml-0.5 text-sm font-bold opacity-60">원</span>
              </div>
              <div
                className="text-warm-700 mt-2.5 rounded-lg px-2.5 py-2 text-xs italic"
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
    </div>
  );
}
