// TODO: backend wiring — needs notification_settings table
// All toggle states are placeholders (static mockup).

export function DesktopNotifications() {
  return (
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">알림 설정</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">
            채널별로 받고 싶은 알림을 선택할 수 있어요 · 거래 안전 알림은 끌 수 없습니다
          </p>
        </div>
        <button
          type="button"
          className="border-border h-9 shrink-0 rounded-lg border bg-white px-4 text-[15px] font-bold"
        >
          모두 기본값으로
        </button>
      </div>

      {/* Quiet hours */}
      <div
        className="mb-4 flex items-center gap-5 rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1A2238 0%, #2A1F3A 100%)' }}
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
          🌙
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold tracking-tight">
            방해금지 시간 · 22:00 — 08:00
          </div>
          <div className="mt-0.5 text-[15px] text-white/60">
            이 시간엔 거래 안전 알림만 발송돼요 · 마케팅·할인 알림은 다음 날 아침에 모아
            보내드립니다
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-[15px] font-bold text-white"
          >
            시간 변경
          </button>
          <Toggle on />
        </div>
      </div>

      {/* Channel grid */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <ChannelCard
          icon="📱"
          name="앱 푸시"
          iconBg="#E8EEF8"
          on
          summary="iPhone 15 · 활성"
          items={[
            {
              label: '거래 단계 변경',
              hint: '검수, 입금, 정산 등 7단계 진행 알림',
              on: true,
              required: true,
            },
            { label: '시세 알림', hint: '등록한 매물의 시세 변동 시', on: true },
            { label: '찜 매물 등록', hint: '찜한 백화점에 새 매물이 올라오면', on: true },
            { label: '이벤트 / 혜택', hint: '등급 업, 쿠폰 발급 등', on: false },
          ]}
        />
        <ChannelCard
          icon="💬"
          name="카카오 알림톡"
          iconBg="#FFE812"
          on
          summary="010-****-****"
          items={[
            { label: '거래 단계 변경', on: true, required: true },
            { label: '입금 / 출금 완료', on: true, required: true },
            { label: '검수 결과 통보', on: true },
            { label: '공지 / 정책 변경', on: true },
          ]}
        />
        <ChannelCard
          icon="✉️"
          name="이메일"
          iconBg="#E8F4ED"
          on={false}
          summary="가입 이메일"
          items={[
            { label: '월간 리포트', hint: '매월 1일 발송', on: false },
            { label: '정산 명세서', hint: '정산일 +1일 발송', on: true },
            { label: '보안 알림', hint: '새 기기 로그인 등', on: true, required: true },
            { label: '뉴스레터', hint: '격주 수요일', on: false },
          ]}
        />
        <ChannelCard
          icon="📧"
          name="문자 (SMS)"
          iconBg="#FCE9C8"
          on
          summary="010-****-**** · 백업 채널"
          items={[
            { label: 'OTP 인증번호', hint: '필수 발송', on: true, required: true },
            { label: '알림톡 미수신 시 대체', hint: '2분 이내 미수신 시 SMS로 발송', on: true },
            { label: '긴급 보안 알림', on: true, required: true },
            { label: '이벤트 / 마케팅', on: false },
          ]}
        />
      </div>

      {/* Marketing consent */}
      <div className="surface-card p-5 sm:p-6">
        <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
          마케팅 정보 수신 동의
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: '혜택 / 이벤트 알림',
              desc: '등급 혜택, 쿠폰 발급, 백화점 프로모션 등 제휴사 혜택 정보를 받습니다',
              on: true,
            },
            {
              label: '맞춤 추천 알림',
              desc: '거래 패턴 분석을 바탕으로 한 맞춤 추천 매물·시세 정보를 받습니다',
              on: false,
            },
          ].map((m) => (
            <div key={m.label} className="bg-warm-50 rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[15px] font-bold">{m.label}</span>
                <Toggle on={m.on} />
              </div>
              <p className="text-muted-foreground text-[15px] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        background: on ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

function ChannelCard({
  icon,
  name,
  iconBg,
  on,
  summary,
  items,
}: {
  icon: string;
  name: string;
  iconBg: string;
  on: boolean;
  summary: string;
  items: { label: string; hint?: string; on: boolean; required?: boolean }[];
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold">{name}</div>
          <div className="text-muted-foreground text-[15px]">{summary}</div>
        </div>
        <Toggle on={on} />
      </div>
      <div className="flex flex-col">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={`flex items-start gap-2 py-2.5 ${i < items.length - 1 ? 'border-warm-100 border-b' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold">{it.label}</span>
                {it.required && (
                  <span className="bg-destructive/10 text-destructive rounded px-1 py-px text-[12px] font-extrabold tracking-wider">
                    필수
                  </span>
                )}
              </div>
              {it.hint && <div className="text-muted-foreground mt-0.5 text-[15px]">{it.hint}</div>}
            </div>
            <Toggle on={it.on} />
          </div>
        ))}
      </div>
    </div>
  );
}
