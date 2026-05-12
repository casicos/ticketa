import type { BusinessAddress } from '@/lib/domain/platform-settings';

export type PreSendInfo = {
  address: BusinessAddress;
  listingShortId: string;
};

/**
 * 사전 송부(pre_verified) 매물이 어드민 수령 전일 때 판매자에게 보여주는 안내 카드.
 * 사업장 주소, 매물 ID 4자리 표시, 발송 시 유의사항.
 */
export function PreSendCallout({ info }: { info: PreSendInfo }) {
  const { address, listingShortId } = info;
  const oneLine = [address.address1, address.address2].filter(Boolean).join(' ');
  return (
    <section
      className="border-ticketa-gold-300 mb-4 overflow-hidden rounded-2xl border-2 bg-white"
      style={{ boxShadow: '0 0 0 4px rgba(212, 162, 76, 0.08)' }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3 text-[14px] font-extrabold tracking-[0.04em] uppercase"
        style={{
          background:
            'linear-gradient(90deg, rgba(212,162,76,0.18) 0%, rgba(212,162,76,0.06) 100%)',
          color: '#8C6321',
        }}
      >
        <span aria-hidden>📦</span>
        <span>사전 송부 안내 — 아래 주소로 보내주세요</span>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5 text-[15px] leading-[1.55]">
            <div className="text-foreground text-[16px] font-extrabold">
              {address.company} <span className="text-muted-foreground font-bold">·</span>{' '}
              {address.recipient}
            </div>
            <div className="text-foreground">
              ({address.zip}) {oneLine}
            </div>
            <div className="text-muted-foreground text-[14px]">
              연락처 <span className="text-foreground font-mono">{address.phone}</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.06em] uppercase">
              박스 표기용
            </div>
            <div className="border-ticketa-gold-300 inline-block rounded-[10px] border-2 border-dashed px-3 py-1.5 font-mono text-[20px] font-black tracking-[0.12em]">
              {listingShortId}
            </div>
          </div>
        </div>

        {address.note && (
          <div className="bg-warm-50 text-foreground rounded-[10px] px-3.5 py-2.5 text-[14px] leading-[1.55]">
            <b className="text-ticketa-blue-700">참고</b> · {address.note}
          </div>
        )}

        <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-[13px] leading-[1.55]">
          <li>실물 상품권을 위 주소로 등기/택배 발송해주세요.</li>
          <li>어드민이 수령·검수를 마치면 알림이 오고 카탈로그에 “인증” 으로 노출돼요.</li>
          <li>구매가 잡혀도 검수가 끝나야 매입 확정으로 진행돼요.</li>
        </ol>
      </div>
    </section>
  );
}
