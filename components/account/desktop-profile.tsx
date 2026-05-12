import Link from 'next/link';

type Props = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  phoneVerified: boolean;
  memberSince: string | null;
};

export function DesktopProfile({
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
    <div className="w-full">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">개인정보</h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          가입 시 등록한 정보를 관리합니다 · 본인인증 정보는 변경할 수 없어요
        </p>
      </div>

      {/* Avatar + name hero */}
      <div className="surface-card mb-4 p-5 sm:p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className="flex size-20 items-center justify-center rounded-full text-3xl font-black text-[#11161E]"
              style={{
                background: 'linear-gradient(135deg, #FCE9C8, #D4A24C)',
                boxShadow: '0 6px 18px rgba(212,162,76,0.28)',
              }}
            >
              {initial.toUpperCase()}
            </div>
            <button
              type="button"
              className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#11161E] text-sm text-white"
              aria-label="프로필 사진 변경"
            >
              📷
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-extrabold tracking-tight">{displayName}</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-widest text-white"
                style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
              >
                GOLD
              </span>
            </div>
            <div className="text-muted-foreground mt-1 text-[15px]">
              {email ?? '이메일 없음'}
              {memberSince ? ` · 가입 ${memberSince}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="border-border hover:bg-muted h-9 rounded-lg border bg-white px-4 text-sm font-bold"
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="surface-card mb-4 p-5 sm:p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
          기본 정보
        </h2>
        <div className="flex flex-col gap-3">
          <FieldRow label="이름" value={fullName ?? '—'} locked />
          <FieldRow
            label="휴대폰"
            value={phone ?? '(등록 안 됨)'}
            verified={phoneVerified}
            actionLabel="변경"
            actionHref="/verify-phone"
          />
          <FieldRow label="이메일" value={email ?? '—'} verified actionLabel="변경" />
          <FieldRow
            label="닉네임"
            value={nickname ?? '(미설정)'}
            hint="다른 회원에게 노출되는 이름이에요 · 30일에 1회 변경 가능"
            actionLabel="변경"
            actionPrimary
            actionHref="/account"
          />
        </div>
      </div>

      {/* Address book — TODO: backend wiring — needs address_book table */}
      <div className="surface-card mb-4 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            주소록
          </h2>
          <button type="button" className="text-ticketa-blue-700 text-sm font-bold">
            + 추가
          </button>
        </div>
        <div className="border-border bg-muted/30 text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-[15px]">
          {/* TODO: backend wiring — needs address_book table */}
          등록된 배송지가 없어요. M1에서 추가됩니다.
        </div>
      </div>

      {/* Linked accounts — TODO: backend wiring — needs oauth_connections table */}
      <div className="surface-card p-5 sm:p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
          연결된 계정
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { name: '카카오', emoji: '💬', bg: '#FFE812', fg: '#3B1E1E', linked: false },
            { name: '네이버', emoji: 'N', bg: '#03C75A', fg: '#fff', linked: false },
            { name: '애플', emoji: '', bg: '#000', fg: '#fff', linked: false },
          ].map((a) => (
            <div
              key={a.name}
              className="border-border flex items-center gap-3 rounded-xl border p-3.5"
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-bold"
                style={{ background: a.bg, color: a.fg }}
              >
                {a.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{a.name}</div>
                <div className="text-muted-foreground text-[15px]">
                  {/* TODO: backend wiring — needs oauth_connections table */}
                  연결되어 있지 않음
                </div>
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
    </div>
  );
}

function FieldRow({
  label,
  value,
  hint,
  locked,
  verified,
  actionLabel,
  actionHref,
  actionPrimary,
}: {
  label: string;
  value: string;
  hint?: string;
  locked?: boolean;
  verified?: boolean;
  actionLabel?: string;
  actionHref?: string;
  actionPrimary?: boolean;
}) {
  return (
    <div className="border-border flex items-start gap-4 rounded-xl border bg-white px-4 py-3.5">
      <span className="text-muted-foreground w-16 shrink-0 text-[15px] font-semibold">{label}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{value}</div>
        {hint && <div className="text-muted-foreground mt-0.5 text-[15px]">{hint}</div>}
      </div>
      {locked && (
        <span className="bg-warm-100 text-warm-700 rounded px-2 py-0.5 text-xs font-bold">
          변경불가
        </span>
      )}
      {verified && !locked && (
        <span className="bg-success/10 text-success rounded px-2 py-0.5 text-xs font-bold">
          ✓ 인증
        </span>
      )}
      {actionLabel &&
        (actionHref ? (
          <Link
            href={actionHref}
            className={`h-7 rounded-md px-3 text-xs leading-7 font-bold ${
              actionPrimary
                ? 'bg-ticketa-blue-500 text-white'
                : 'border-border text-foreground border bg-white'
            }`}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            className={`h-7 rounded-md px-3 text-xs font-bold ${
              actionPrimary
                ? 'bg-ticketa-blue-500 text-white'
                : 'border-border text-foreground border bg-white'
            }`}
          >
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
