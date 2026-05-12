import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { StoreForm } from './store-form';
import { StoreEmpty } from './store-empty';

type StoreRow = {
  store_name: string | null;
  store_intro: string | null;
};

export default async function AgentStorePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect('/login?next=/agent/store');

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from('users')
    .select('store_name, store_intro')
    .eq('id', current.auth.id)
    .maybeSingle<StoreRow>();

  const params = await searchParams;
  const wantsEdit = params.edit === '1' || !row?.store_name;

  if (!row?.store_name && !wantsEdit) {
    return <StoreEmpty />;
  }

  if (!row?.store_name) {
    // 등록 전 — empty hero
    return <StoreEmpty />;
  }

  // 등록 완료 — 편집 폼
  return (
    <>
      <AdminPageHead
        title="상점 브랜드"
        sub="등록된 상점 정보를 편집할 수 있어요. 90일에 1회 변경 가능."
      />
      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <StoreForm initialName={row.store_name ?? ''} initialIntro={row.store_intro ?? ''} />

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#D4A24C]" />
            <span className="text-muted-foreground text-[13px] font-extrabold tracking-[0.08em] uppercase">
              LIVE PREVIEW
            </span>
            <span className="text-muted-foreground text-[13px]">· 구매자 카탈로그</span>
          </div>
          <div
            className="border-border rounded-[14px] border p-5"
            style={{ background: 'linear-gradient(180deg, #F8F4ED 0%, #FFFFFF 80%)' }}
          >
            <div className="text-muted-foreground text-[12px] font-bold tracking-[0.06em] uppercase">
              카탈로그 카드
            </div>
            <div className="mt-2 rounded-[12px] border border-[#E0BD7A] bg-white p-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[13px] font-bold">롯데</span>
                <span className="bg-border h-2 w-px" />
                <span
                  className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[13px] font-extrabold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #D4A24C, #B6862E)',
                    letterSpacing: '0.04em',
                  }}
                >
                  공식
                </span>
                <span className="text-[14px] font-bold">{row.store_name}</span>
              </div>
              <div className="mt-2 text-[14px] font-bold">500,000원권</div>
              <div className="mt-1 text-[18px] font-extrabold tracking-[-0.018em] tabular-nums">
                472,000<span className="text-muted-foreground ml-0.5 text-[13px]">원</span>
              </div>
            </div>

            {row.store_intro && (
              <>
                <div className="text-muted-foreground mt-5 text-[12px] font-bold tracking-[0.06em] uppercase">
                  매물 상세 · 상점 행
                </div>
                <div
                  className="mt-2 flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5"
                  style={{
                    background: 'linear-gradient(180deg, #FBF6EA, #FFFFFF)',
                    borderColor: '#ECDDB8',
                  }}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #D4A24C, #8C6321)' }}
                  >
                    {row.store_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold">{row.store_name}</div>
                    <div className="text-warm-700 mt-0.5 truncate text-[12px]">
                      {row.store_intro}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div
              className="mt-4 rounded-[8px] border border-dashed px-3 py-2.5 text-[13px] leading-[1.5]"
              style={{ borderColor: '#E0BD7A', background: '#FFFCF6', color: '#8C6321' }}
            >
              변경은 90일에 1회 가능해요.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
