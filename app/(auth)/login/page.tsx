import Link from 'next/link';
import { LogoLockup } from '@/components/landing/logo';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = typeof next === 'string' && next.startsWith('/') ? next : '/';

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel — hidden on mobile */}
      <div
        className="relative hidden flex-col overflow-hidden p-14 text-white lg:flex lg:w-[54%]"
        style={{
          background: 'linear-gradient(140deg, #11161E 0%, #1A2230 60%, #142823 100%)',
        }}
      >
        {/* Decorative glows */}
        <div
          className="pointer-events-none absolute"
          style={{
            right: -120,
            top: -100,
            width: 460,
            height: 460,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(212,162,76,0.22), transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            left: -80,
            bottom: -120,
            width: 360,
            height: 360,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(0,102,255,0.18), transparent 70%)',
          }}
        />

        <LogoLockup symbolSize={32} wordmarkHeight={20} color="#fff" />

        <div className="mt-auto max-w-[460px]">
          <div className="text-[13px] font-bold tracking-[0.12em]" style={{ color: '#E5C387' }}>
            SAFE EXCHANGE
          </div>
          <h1 className="mt-3 text-[38px] leading-[1.18] font-extrabold tracking-[-0.025em]">
            백화점 상품권을
            <br />
            가장 안전하게 거래하는 방법
          </h1>
          <p className="mt-3.5 text-base leading-[1.7]" style={{ color: 'rgba(255,255,255,0.66)' }}>
            실물 카드는 에이전트가 검수해서 보관하고, 결제 완료 후에만 출고돼요. 거래 분쟁이
            일어나면 24시간 내 중재합니다.
          </p>
          <div className="mt-7 flex gap-6">
            {(
              [
                ['평균 검수', '12분'],
                ['누적 거래', '240억'],
                ['분쟁 발생률', '0.04%'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k}>
                <div
                  className="text-[13px] font-bold tracking-[0.06em]"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {k.toUpperCase()}
                </div>
                <div className="mt-0.5 text-lg font-extrabold tracking-[-0.018em] tabular-nums">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="border-border flex flex-1 flex-col justify-center border-l bg-white px-6 py-10 sm:px-14 lg:px-14">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/" aria-label="Ticketa 홈">
            <LogoLockup symbolSize={28} wordmarkHeight={17} />
          </Link>
        </div>

        <div className="w-full lg:mx-auto lg:max-w-[400px]">
          <div className="text-ticketa-blue-700 text-[13px] font-bold tracking-[0.12em]">
            LOG IN
          </div>
          <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.022em]">
            다시 만나서 반가워요
          </h2>

          <div className="mt-7">
            <LoginForm nextPath={nextPath} />
          </div>

          {/* Divider */}
          <div className="text-muted-foreground my-5 flex items-center gap-3 text-[15px] font-semibold">
            <div className="bg-border h-px flex-1" />
            <span>또는 간편 로그인</span>
            <div className="bg-border h-px flex-1" />
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-2">
            <SocialBtn name="카카오" bg="#FFE812" textColor="#3B1E1E" emoji="💬" />
            <SocialBtn name="네이버" bg="#03C75A" textColor="#fff" emoji="N" />
            <SocialBtn name="애플" bg="#000" textColor="#fff" emoji="" />
          </div>
        </div>

        <p className="text-muted-foreground mt-8 w-full text-left text-[15px] lg:mx-auto lg:max-w-[400px] lg:text-center">
          아직 회원이 아니신가요?{' '}
          <Link href="/signup" className="text-ticketa-blue-700 font-bold hover:underline">
            회원가입 →
          </Link>
        </p>
      </div>
    </div>
  );
}

function SocialBtn({
  name,
  bg,
  textColor,
  emoji,
}: {
  name: string;
  bg: string;
  textColor: string;
  emoji: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="border-border flex h-[46px] cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border text-[15px] font-bold opacity-60"
      style={{
        background: bg,
        color: textColor,
        borderColor: bg === '#000' ? undefined : undefined,
      }}
      title="소셜 로그인 준비 중"
    >
      {emoji && <span className="text-[15px]">{emoji}</span>}
      <span className="text-[15px]">{name}로 계속하기</span>
    </button>
  );
}
