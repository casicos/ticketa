'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { releaseConsignmentAction } from './actions';

export function ReleaseConsignmentButton({
  inventoryId,
  qtyAvailable,
  agentName,
  skuLabel,
}: {
  inventoryId: string;
  qtyAvailable: number;
  agentName: string;
  skuLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState(qtyAvailable);
  const [reason, setReason] = React.useState('');
  const [pending, start] = React.useTransition();

  if (qtyAvailable === 0) {
    return (
      <span
        title="출고 가능 수량이 0이에요 (판매중 분은 출고 불가)"
        className="text-muted-foreground border-border bg-warm-50 inline-flex h-7 cursor-not-allowed items-center rounded-[6px] border border-dashed px-2.5 text-[12px] font-bold"
      >
        출고 불가
      </span>
    );
  }

  function submit() {
    if (qty < 1 || qty > qtyAvailable) {
      toast.error(`1 ~ ${qtyAvailable} 사이로 입력해주세요`);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set('inventory_id', inventoryId);
      fd.set('qty', String(qty));
      if (reason.trim()) fd.set('reason', reason.trim());
      const r = await releaseConsignmentAction(fd);
      if (r.ok) {
        toast.success(`${qty}매 출고 처리됐어요`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(r.message ?? '출고 실패');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:bg-warm-50 inline-flex h-7 cursor-pointer items-center rounded-[6px] border bg-white px-2.5 text-[12px] font-bold"
      >
        출고
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(17,22,30,0.55)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-[14px] bg-white p-5"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
          >
            <div className="text-muted-foreground mb-1 text-[12px] font-extrabold tracking-[0.08em] uppercase">
              위탁 출고
            </div>
            <h3 className="text-[18px] font-extrabold tracking-[-0.014em]">{agentName}님께 반환</h3>
            <div className="text-muted-foreground mb-3 text-[13px]">{skuLabel}</div>

            <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
              출고 수량 (최대 {qtyAvailable})
            </label>
            <input
              type="number"
              min={1}
              max={qtyAvailable}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Math.min(qtyAvailable, Number(e.target.value) || 0)))
              }
              className="border-border focus:border-ticketa-blue-500 mb-3 h-11 w-full rounded-[10px] border bg-white px-3 text-right text-[15px] font-extrabold tabular-nums outline-none"
            />

            <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
              사유 (선택)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 에이전트 요청으로 반환"
              rows={2}
              maxLength={400}
              className="border-border focus:border-ticketa-blue-500 mb-4 w-full resize-none rounded-[10px] border bg-white px-3 py-2 text-[14px] outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-border hover:bg-warm-50 h-10 rounded-[10px] border bg-white px-3.5 text-[14px] font-bold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="bg-ticketa-blue-500 h-10 rounded-[10px] px-3.5 text-[14px] font-extrabold text-white disabled:opacity-50"
              >
                {pending ? '처리 중...' : '출고 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
