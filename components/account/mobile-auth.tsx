type Props = {
  phoneVerified: boolean;
  phone: string | null;
};

export function MobileAuth({ phoneVerified, phone }: Props) {
  return (
    <div className="flex flex-col pb-6">
      {/* Status hero */}
      <div className="mx-4 mt-4 mb-0">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white"
          style={{
            background: 'linear-gradient(135deg, #11161E 0%, #1A2230 70%, #142823 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(46,124,82,0.30), transparent 70%)' }}
          />
          <div className="relative flex items-center gap-4">
            <div
              className="flex size-13 shrink-0 items-center justify-center rounded-xl text-2xl font-black text-white"
              style={{
                width: 52,
                height: 52,
                background: phoneVerified
                  ? 'linear-gradient(135deg, #2E7C52, #1F6B43)'
                  : 'linear-gradient(135deg, #5A6070, #3A4050)',
                boxShadow: phoneVerified ? '0 6px 14px rgba(46,124,82,0.32)' : 'none',
              }}
            >
              {phoneVerified ? '✓' : '!'}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-[12px] font-bold tracking-widest"
                style={{ color: phoneVerified ? '#7DC79F' : '#FFC87A' }}
              >
                {phoneVerified ? 'VERIFIED' : 'PENDING'}
              </div>
              <div className="mt-0.5 text-sm font-extrabold tracking-tight">
                {phoneVerified ? '인증 완료 정상 회원' : '본인인증 필요'}
              </div>
              <div className="mt-0.5 text-xs text-white/60">
                {phoneVerified ? `${phone ?? '휴대폰'} · 1년 갱신` : '인증 후 거래 가능'}
              </div>
            </div>
          </div>
          {/* Limit bars */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
            {[{ l: '일일 한도' }, { l: '월 한도' }].map((t) => (
              <div key={t.l}>
                <div className="text-[12px] font-bold tracking-widest text-white/50">{t.l}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold">
                  <span className="text-[15px] leading-none font-black">∞</span>
                  한도 없음
                </div>
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 5px, rgba(255,255,255,0.08) 5px 10px)',
                  }}
                  aria-label="한도 없음"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification items */}
      <div className="mt-4 flex flex-col gap-3 px-4">
        <div className="text-muted-foreground px-1 text-[12px] font-bold tracking-widest uppercase">
          인증 항목
        </div>
        {[
          {
            l: '휴대폰 본인인증',
            s: phone ? `${phone} · KT` : '미인증',
            state: phoneVerified ? 'ok' : 'pending',
          },
          { l: '계좌 1원 인증', s: '미인증', state: 'pending' as const },
          { l: '신분증 인증', s: '미인증', state: 'pending' as const },
          {
            l: '계좌소유주 영상통화',
            s: '인증 시 한도 1,000만/일로 상향',
            state: 'pending' as const,
          },
        ].map((m) => (
          <div
            key={m.l}
            className="border-border flex items-center gap-3 rounded-xl border bg-white p-3"
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold"
              style={{
                background: m.state === 'ok' ? 'rgba(46,124,82,0.10)' : 'var(--warm-100)',
                color: m.state === 'ok' ? '#1F6B43' : 'var(--warm-700)',
              }}
            >
              {m.state === 'ok' ? '✓' : '!'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{m.l}</div>
              <div
                className="mt-0.5 truncate text-xs font-semibold"
                style={{
                  color: m.state === 'ok' ? 'var(--muted-foreground)' : 'var(--ticketa-gold-700)',
                }}
              >
                {m.s}
              </div>
            </div>
            <button
              type="button"
              className="h-7 shrink-0 rounded-lg px-3 text-xs font-bold"
              style={{
                border: m.state === 'ok' ? '1px solid var(--border)' : 'none',
                background: m.state === 'ok' ? '#fff' : 'var(--ticketa-blue-500)',
                color: m.state === 'ok' ? 'var(--foreground)' : '#fff',
              }}
            >
              {m.state === 'ok' ? '재인증' : '인증 →'}
            </button>
          </div>
        ))}

        {/* Recent log — TODO: backend wiring — needs verification_log table */}
        <div className="bg-warm-50 rounded-xl p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">최근 인증 활동</span>
            <span className="text-ticketa-blue-700 text-sm font-bold">전체보기 ›</span>
          </div>
          <div className="text-muted-foreground py-2 text-center text-xs">
            {/* TODO: backend wiring — needs verification_log table */}
            인증 이력이 없어요
          </div>
        </div>
      </div>
    </div>
  );
}
