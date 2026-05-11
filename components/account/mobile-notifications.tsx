// TODO: backend wiring — needs notification_settings table
// All toggle states are placeholders (static mockup).

export function MobileNotifications() {
  return (
    <div className="flex flex-col pb-6">
      {/* Quiet hours */}
      <div className="mx-4 mt-4">
        <div
          className="flex items-center gap-3 rounded-2xl p-4 text-white"
          style={{ background: 'linear-gradient(135deg, #1A2238 0%, #2A1F3A 100%)' }}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">
            🌙
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold">방해금지 22:00 — 08:00</div>
            <div className="mt-0.5 text-xs text-white/60">거래 안전 알림만 발송</div>
          </div>
          <MToggle on />
        </div>
      </div>

      {/* Channel cards */}
      <div className="mt-4 flex flex-col gap-3 px-4">
        {[
          {
            i: '📱',
            n: '앱 푸시',
            c: '#E8EEF8',
            on: true,
            sub: 'iPhone 15 · 활성',
            items: [
              { l: '거래 단계 변경', on: true, imp: true },
              { l: '시세 알림', on: true },
              { l: '찜 매물 등록', on: true },
              { l: '이벤트 / 혜택', on: false },
            ],
          },
          {
            i: '💬',
            n: '카카오 알림톡',
            c: '#FFE812',
            on: true,
            sub: '010-****-****',
            items: [
              { l: '거래 단계 변경', on: true, imp: true },
              { l: '입금 / 출금 완료', on: true, imp: true },
              { l: '검수 결과', on: true },
              { l: '공지 / 정책', on: true },
            ],
          },
          {
            i: '✉️',
            n: '이메일',
            c: '#E8F4ED',
            on: false,
            sub: '가입 이메일',
            items: [
              { l: '월간 리포트', on: false },
              { l: '정산 명세서', on: true },
              { l: '보안 알림', on: true, imp: true },
              { l: '뉴스레터', on: false },
            ],
          },
        ].map((ch) => (
          <div key={ch.n} className="border-border overflow-hidden rounded-xl border bg-white">
            <div className="border-warm-100 flex items-center gap-3 border-b px-4 py-3">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{ background: ch.c }}
              >
                {ch.i}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{ch.n}</div>
                <div className="text-muted-foreground text-xs">{ch.sub}</div>
              </div>
              <MToggle on={ch.on} />
            </div>
            <div className="px-4">
              {ch.items.map((it, i, arr) => (
                <div
                  key={it.l}
                  className={`flex items-center gap-2 py-2.5 ${i < arr.length - 1 ? 'border-warm-100 border-b' : ''}`}
                >
                  <span className="flex-1 text-sm font-semibold">{it.l}</span>
                  {it.imp && (
                    <span className="bg-destructive/10 text-destructive rounded px-1 py-px text-[10px] font-extrabold tracking-wider">
                      필수
                    </span>
                  )}
                  <MToggle on={it.on} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Marketing */}
        <div className="bg-warm-50 rounded-xl p-3">
          <div className="text-muted-foreground mb-3 text-[11px] font-bold tracking-widest uppercase">
            마케팅 정보 수신
          </div>
          <div className="flex items-center border-b border-black/4 py-2">
            <span className="flex-1 text-sm font-semibold">혜택 / 이벤트 알림</span>
            <MToggle on />
          </div>
          <div className="flex items-center py-2">
            <span className="flex-1 text-sm font-semibold">맞춤 추천 알림</span>
            <MToggle on={false} />
          </div>
          <div className="text-muted-foreground mt-1.5 text-xs">거부해도 거래에 영향 없음</div>
        </div>
      </div>
    </div>
  );
}

function MToggle({ on }: { on?: boolean }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: 34,
        height: 19,
        borderRadius: 999,
        background: on ? 'var(--ticketa-blue-500)' : 'var(--warm-200)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 15 : 2,
          width: 15,
          height: 15,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}
