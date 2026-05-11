import Link from 'next/link';

type Props = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  phoneVerified: boolean;
  memberSince: string | null;
};

export function MobileProfile({
  fullName,
  email,
  phone,
  nickname,
  phoneVerified,
  memberSince,
}: Props) {
  const initial = (fullName ?? email ?? '?')[0] ?? '?';
  const displayName = fullName || nickname || email || '회원';

  return (
    <div className="flex flex-col pb-6">
      {/* Avatar hero */}
      <div className="flex items-center gap-4 px-4 py-5">
        <div className="relative">
          <div
            className="flex size-14 items-center justify-center rounded-full text-2xl font-black text-[#11161E]"
            style={{ background: 'linear-gradient(135deg, #FCE9C8, #D4A24C)' }}
          >
            {initial.toUpperCase()}
          </div>
          <div className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#11161E] text-[12px] text-white">
            📷
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">{displayName}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-extrabold tracking-widest text-white"
              style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
            >
              GOLD
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {nickname ? `${nickname} · ` : ''}
            {memberSince ? `가입 ${memberSince}` : (email ?? '')}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3 px-4">
        <div className="border-border overflow-hidden rounded-xl border bg-white">
          {[
            { l: '이름', v: fullName ?? '—', locked: true },
            { l: '닉네임', v: nickname ?? '(미설정)', action: '변경', actionHref: '/account' },
            {
              l: '휴대폰',
              v: phone ?? '(등록 안 됨)',
              verified: phoneVerified,
              action: '변경',
              actionHref: '/verify-phone',
            },
            { l: '이메일', v: email ?? '—', verified: true, action: '변경' },
          ].map((f, i, arr) => (
            <div
              key={f.l}
              className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-warm-100 border-b' : ''}`}
            >
              <span className="text-muted-foreground w-14 shrink-0 text-sm font-semibold">
                {f.l}
              </span>
              <div className="min-w-0 flex-1 truncate text-sm font-semibold">{f.v}</div>
              {f.locked && (
                <span className="bg-warm-100 text-warm-700 rounded px-1.5 py-0.5 text-[12px] font-bold">
                  변경불가
                </span>
              )}
              {f.verified && !f.locked && (
                <span className="bg-success/10 text-success rounded px-1.5 py-0.5 text-[12px] font-bold">
                  ✓
                </span>
              )}
              {f.action &&
                (f.actionHref ? (
                  <Link
                    href={f.actionHref}
                    className="border-border h-6 rounded border bg-white px-2 text-xs leading-6 font-bold"
                  >
                    {f.action}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="border-border h-6 rounded border bg-white px-2 text-xs font-bold"
                  >
                    {f.action}
                  </button>
                ))}
            </div>
          ))}
        </div>

        {/* Address — TODO: backend wiring — needs address_book table */}
        <div className="border-border rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-extrabold tracking-tight">주소록</span>
            <span className="text-ticketa-blue-700 text-sm font-bold">+ 추가</span>
          </div>
          <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
            {/* TODO: backend wiring — needs address_book table */}
            M1에서 추가됩니다
          </div>
        </div>

        {/* Linked — TODO: backend wiring — needs oauth_connections table */}
        <div className="border-border rounded-xl border bg-white p-4">
          <div className="mb-3 text-sm font-extrabold tracking-tight">연결된 계정</div>
          <div className="flex flex-col gap-3">
            {[
              { n: '카카오', e: '💬', c: '#FFE812', t: '#3B1E1E' },
              { n: '네이버', e: 'N', c: '#03C75A', t: '#fff' },
              { n: '애플', e: '', c: '#000', t: '#fff' },
            ].map((a) => (
              <div key={a.n} className="flex items-center gap-3">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: a.c, color: a.t }}
                >
                  {a.e}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{a.n}</div>
                  <div className="text-muted-foreground text-xs">연결 안됨</div>
                </div>
                <button
                  type="button"
                  className="bg-ticketa-blue-500 h-7 rounded-md px-3 text-xs font-bold text-white"
                >
                  연결
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between px-1 pt-1">
          <span className="text-muted-foreground text-xs">
            {memberSince ? `가입 ${memberSince}` : ''}
          </span>
          <span className="text-muted-foreground text-xs font-bold underline">회원 탈퇴</span>
        </div>
      </div>
    </div>
  );
}
