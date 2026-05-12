'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateConsignmentUnitCostAction } from './actions';

export function EditUnitCostButton({
  inventoryId,
  currentUnitCost,
  qtyReserved,
  agentName,
  skuLabel,
}: {
  inventoryId: string;
  currentUnitCost: number;
  qtyReserved: number;
  agentName: string;
  skuLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [cost, setCost] = React.useState(currentUnitCost);
  const [reason, setReason] = React.useState('');
  const [pending, start] = React.useTransition();

  function openModal() {
    setCost(currentUnitCost);
    setReason('');
    setOpen(true);
  }

  const changed = cost !== currentUnitCost;
  const valid = cost >= 0 && cost <= 10_000_000;

  function submit() {
    if (!changed) {
      toast.info('변경 사항이 없어요');
      return;
    }
    if (!valid) {
      toast.error('0 ~ 10,000,000원 사이로 입력해주세요');
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set('inventory_id', inventoryId);
      fd.set('unit_cost', String(cost));
      if (reason.trim()) fd.set('reason', reason.trim());
      const r = await updateConsignmentUnitCostAction(fd);
      if (r.ok) {
        toast.success('정산 단가가 변경됐어요');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(r.message ?? '변경 실패');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="border-border hover:bg-warm-50 inline-flex h-7 cursor-pointer items-center rounded-[6px] border bg-white px-2.5 text-[12px] font-bold"
      >
        단가 수정
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
              정산 단가 수정
            </div>
            <h3 className="text-[18px] font-extrabold tracking-[-0.014em]">{agentName}</h3>
            <div className="text-muted-foreground mb-3 text-[13px]">{skuLabel}</div>

            {qtyReserved > 0 && (
              <div
                className="mb-3 rounded-[10px] border px-3 py-2 text-[12px]"
                style={{
                  borderColor: 'rgba(212,162,76,0.4)',
                  background: 'rgba(212,162,76,0.08)',
                  color: '#8C6321',
                }}
              >
                현재 판매중 <b>{qtyReserved.toLocaleString('ko-KR')}매</b>는 이미 가격이 정해져
                있어서 영향 받지 않아요. 이후 등록되는 판매부터 새 단가가 적용돼요.
              </div>
            )}

            <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
              현재 단가
            </label>
            <div className="text-muted-foreground mb-3 text-[15px] font-extrabold tabular-nums">
              {currentUnitCost.toLocaleString('ko-KR')}원
            </div>

            <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
              새 단가
            </label>
            <div className="relative mb-3">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-bold">
                ₩
              </span>
              <input
                type="number"
                min={0}
                max={10_000_000}
                step={100}
                value={cost}
                onChange={(e) => setCost(Number(e.target.value) || 0)}
                onBlur={() => {
                  if (cost < 0) setCost(0);
                  if (cost > 10_000_000) setCost(10_000_000);
                }}
                className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white pr-3 pl-8 text-right text-[18px] font-extrabold tabular-nums outline-none"
              />
            </div>

            <label className="text-muted-foreground mb-1.5 block text-[13px] font-bold">
              사유 (선택)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 시세 변동 반영"
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
                disabled={pending || !changed || !valid}
                className="bg-ticketa-blue-500 h-10 rounded-[10px] px-3.5 text-[14px] font-extrabold text-white disabled:opacity-50"
              >
                {pending ? '변경 중...' : '단가 변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
