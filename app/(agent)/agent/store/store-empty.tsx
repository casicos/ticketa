import { AdminPageHead } from '@/components/admin/admin-shell';
import { StoreForm } from './store-form';

export function StoreEmpty() {
  return (
    <>
      <AdminPageHead
        title="상점 브랜드"
        sub="구매자에게 노출되는 상점명을 등록하면 카탈로그에서 [공식] 라벨로 식별돼요"
      />

      <div
        className="relative mb-5 overflow-hidden rounded-[14px] border"
        style={{
          background: 'linear-gradient(180deg, #FBF6EA 0%, #FFFFFF 60%)',
          borderColor: '#ECDDB8',
        }}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(212,162,76,0.18), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-[640px] px-8 py-12 text-center">
          <div
            className="mx-auto mb-5 flex size-20 items-center justify-center rounded-[18px] text-white"
            style={{
              background: 'linear-gradient(135deg, #D4A24C, #8C6321)',
              boxShadow: '0 14px 32px -10px rgba(140,99,33,0.45)',
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 8.5 5 4h14l2 4.5M3 8.5h18M3 8.5v10.5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-[24px] font-extrabold tracking-[-0.022em]">
            아직 상점이 등록되지 않았어요
          </h2>
          <p className="text-warm-700 mt-2 text-[15px] leading-[1.6]">
            에이전트 매물은 <b className="text-foreground">상점명으로 노출</b>됩니다. (예:
            &ldquo;컬쳐 에이전시&rdquo;)
            <br />
            익명 코드로 표기되는 P2P 매물과 달라요. 1인 1상점, 90일에 1회 변경 가능.
          </p>

          {/* 3-step preview */}
          <div className="border-border mx-auto mt-9 flex max-w-[480px] items-center gap-3 rounded-[12px] border bg-white px-4 py-4 text-left">
            {[
              { n: 1, l: '상점명 등록', s: '2~20자', active: true },
              { n: 2, l: '소개 + 로고', s: '선택' },
              { n: 3, l: '카탈로그 노출', s: '즉시' },
            ].map((it, i, arr) => (
              <div key={it.n} className="flex flex-1 items-center gap-2">
                <span
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold"
                  style={{
                    background: it.active ? '#D4A24C' : 'var(--warm-100)',
                    color: it.active ? '#fff' : 'var(--warm-700)',
                  }}
                >
                  {it.n}
                </span>
                <div>
                  <div className="text-[13px] font-bold">{it.l}</div>
                  <div className="text-muted-foreground text-[11px]">{it.s}</div>
                </div>
                {i < arr.length - 1 && <span className="text-border ml-auto">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline registration form */}
      <div className="mx-auto max-w-[640px]">
        <StoreForm initialName="" initialIntro="" />
      </div>
    </>
  );
}
