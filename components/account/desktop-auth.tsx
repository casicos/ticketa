import Link from 'next/link';

type Props = {
  phoneVerified: boolean;
  phone: string | null;
  fullName: string;
  memberId: string;
  hasPayoutAccount: boolean;
  /** "신한 ****8472" 형태 — 옵션 (서버에서 prepare 가능) */
  payoutAccountSummary?: string;
};

type Item = {
  l: string;
  s: string;
  desc: string;
  state: 'ok' | 'pending';
  cta: string;
  /** href on action button — null = no-op (예: 준비중) */
  href: string | null;
};

export function DesktopAuth({
  phoneVerified,
  phone,
  fullName,
  memberId,
  hasPayoutAccount,
  payoutAccountSummary,
}: Props) {
  const items: Item[] = [
    {
      l: '실명인증',
      s: fullName ? `${fullName} · 통신사 명의 기반` : '미인증',
      desc: '거래 시 필수 항목입니다',
      state: phoneVerified ? 'ok' : 'pending',
      cta: phoneVerified ? '재인증' : '인증하기 →',
      href: '/verify-phone',
    },
    {
      l: '연락처 인증',
      s: phone ? `${phone} · 본인 명의` : '미인증',
      desc: '본인 명의 휴대폰 + 알림 수신 번호로 사용됩니다',
      state: phoneVerified ? 'ok' : 'pending',
      cta: phoneVerified ? '재인증' : '인증하기 →',
      href: '/verify-phone',
    },
    {
      l: '예금주 인증',
      s: hasPayoutAccount
        ? (payoutAccountSummary ?? '등록 계좌 자동 매칭')
        : '준비 중 · 임시 비활성화',
      desc: hasPayoutAccount
        ? '본인인증 명의와 자동 매칭됐어요'
        : '현재는 계좌번호만 등록하면 자동 매칭돼요',
      state: hasPayoutAccount ? 'ok' : 'pending',
      cta: hasPayoutAccount ? '재인증' : '계좌 등록 →',
      href: '/account/mileage/withdraw',
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">본인인증</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          안전거래를 위한 본인 정보 인증 상태입니다
        </p>
      </div>

      {/* Status hero */}
      <div
        className="relative mb-4 overflow-hidden rounded-2xl px-8 py-7 text-white"
        style={{
          background: 'linear-gradient(135deg, #11161E 0%, #1A2230 70%, #142823 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-10 -right-10 size-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(46,124,82,0.30), transparent 70%)' }}
        />
        <div className="relative flex items-center gap-6">
          <div
            className="flex size-[84px] shrink-0 items-center justify-center rounded-[18px] text-[40px] font-black text-white"
            style={{
              background: phoneVerified
                ? 'linear-gradient(135deg, #2E7C52, #1F6B43)'
                : 'linear-gradient(135deg, #5A6070, #3A4050)',
              boxShadow: phoneVerified
                ? '0 10px 24px rgba(46,124,82,0.32)'
                : '0 10px 24px rgba(0,0,0,0.20)',
            }}
          >
            {phoneVerified ? '✓' : '!'}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[13px] font-bold tracking-[0.08em]"
              style={{ color: phoneVerified ? '#7DC79F' : '#FFC87A' }}
            >
              {phoneVerified ? 'VERIFIED' : 'PENDING'}
            </div>
            <div className="mt-1 text-[22px] font-extrabold tracking-[-0.02em]">
              {phoneVerified ? '본인인증이 완료된 정상 회원입니다' : '본인인증이 필요합니다'}
            </div>
            <div className="mt-1 text-[15px] text-white/60">
              {phoneVerified ? (
                <>
                  통신사 명의 인증 완료 · 일일 한도{' '}
                  <b className="font-extrabold text-white">한도 없음</b>
                </>
              ) : (
                '휴대폰 인증을 완료하면 거래가 가능해요'
              )}
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[13px] font-bold tracking-[0.04em] text-white/50">회원번호</div>
            <div className="mt-0.5 text-[16px] font-extrabold tracking-[-0.012em] tabular-nums">
              {memberId}
            </div>
          </div>
        </div>
      </div>

      {/* Verification items */}
      <div className="surface-card mb-4 p-5 sm:p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
          인증 항목
        </h2>
        <div className="flex flex-col gap-2.5">
          {items.map((m) => (
            <div
              key={m.l}
              className="border-border flex items-center gap-3.5 rounded-xl border bg-white px-4 py-3.5"
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[16px] font-extrabold"
                style={{
                  background: m.state === 'ok' ? 'rgba(46,124,82,0.10)' : 'var(--warm-100)',
                  color: m.state === 'ok' ? '#1F6B43' : 'var(--warm-700)',
                }}
              >
                {m.state === 'ok' ? '✓' : '!'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">{m.l}</span>
                  <span
                    className="rounded-[4px] px-1.5 py-0.5 text-[13px] font-extrabold tracking-[0.02em]"
                    style={{
                      background:
                        m.state === 'ok' ? 'rgba(46,124,82,0.10)' : 'rgba(212,162,76,0.18)',
                      color: m.state === 'ok' ? '#1F6B43' : 'var(--ticketa-gold-700)',
                    }}
                  >
                    {m.state === 'ok' ? '인증됨' : '미인증'}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-[15px]">{m.s}</div>
                <div
                  className="mt-0.5 text-[15px]"
                  style={{
                    color: m.state === 'ok' ? 'var(--muted-foreground)' : 'var(--ticketa-gold-700)',
                    fontWeight: m.state === 'ok' ? 500 : 600,
                  }}
                >
                  {m.desc}
                </div>
              </div>
              {m.href ? (
                <Link
                  href={m.href}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg px-3.5 text-[14px] font-bold"
                  style={{
                    border: m.state === 'ok' ? '1px solid var(--border)' : 'none',
                    background: m.state === 'ok' ? '#fff' : 'var(--ticketa-blue-500)',
                    color: m.state === 'ok' ? 'var(--foreground)' : '#fff',
                  }}
                >
                  {m.cta}
                </Link>
              ) : (
                <span className="border-border bg-warm-50 text-muted-foreground inline-flex h-9 shrink-0 items-center rounded-lg border px-3.5 text-[14px] font-bold">
                  {m.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Limits */}
      <div className="surface-card mb-4 p-5 sm:p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
          거래 한도
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[{ l: '일일 거래 한도' }, { l: '월 거래 한도' }].map((t) => (
            <div key={t.l} className="bg-warm-50 rounded-xl px-4 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-[15px] font-bold">{t.l}</span>
                <span className="text-ticketa-blue-700 inline-flex items-center gap-1 text-[15px] font-extrabold">
                  <span className="text-[17px] leading-none font-black">∞</span>
                  한도 없음
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{
                  background:
                    'repeating-linear-gradient(135deg, var(--warm-200) 0 6px, var(--warm-100) 6px 12px)',
                }}
                aria-label="한도 없음"
              />
              <div className="text-muted-foreground mt-2 text-[15px]">
                별도 지정된 한도가 없어요
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification log — TODO: backend wiring */}
      <div className="surface-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            최근 본인인증 활동
          </h2>
          <button type="button" className="text-ticketa-blue-700 text-[15px] font-bold" disabled>
            전체보기
          </button>
        </div>
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-warm-50 text-muted-foreground grid grid-cols-[120px_1fr_140px_100px] border-b px-4 py-2.5 text-[13px] font-bold tracking-wider uppercase">
            <span>일시</span>
            <span>활동</span>
            <span>위치 / 기기</span>
            <span>결과</span>
          </div>
          <div className="text-muted-foreground px-4 py-6 text-center text-[15px]">
            인증 이력이 없어요
          </div>
        </div>
      </div>
    </div>
  );
}
