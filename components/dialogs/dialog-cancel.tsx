'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CANCEL_REASONS = [
  '단순 변심',
  '판매자 응답이 없음',
  '검수가 너무 오래 걸림',
  '직접 입력',
] as const;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  refundAmount: number;
  orderId: string;
  /** Server action: returns { ok, code?, message? } */
  cancelAction: (fd: FormData) => Promise<{ ok: boolean; code?: string; message?: string }>;
};

export function DialogCancel({
  open,
  onOpenChange,
  listingId,
  refundAmount,
  orderId,
  cancelAction,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [pending, startTransition] = useTransition();

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setSelected(CANCEL_REASONS[0]);
      setCustomReason('');
    }
  }

  function submit() {
    const reason = selected === '직접 입력' ? customReason.trim() : selected;
    if (!reason || reason.length < 4) {
      toast.error('취소 사유를 입력해주세요');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listing_id', listingId);
      fd.set('reason', reason);
      const result = await cancelAction(fd);
      if (result.ok) {
        toast.success('취소 요청이 접수됐어요. 어드민이 검토 후 처리해요.');
        handleClose(false);
        router.refresh();
      } else if (result.code === 'ALREADY_PENDING') {
        toast.error('이미 검토 중인 취소 요청이 있어요');
      } else if (result.code === 'INVALID_STATE') {
        toast.error('현재 상태에서는 취소 요청을 보낼 수 없어요');
      } else {
        toast.error(result.message ?? '취소 요청에 실패했어요');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-xl text-xl font-extrabold">
              !
            </div>
            <div>
              <DialogTitle>거래를 취소하시겠어요?</DialogTitle>
              <DialogDescription className="mt-0.5 font-mono text-xs">
                주문번호 #{orderId.slice(0, 12)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-warm-700 text-base leading-relaxed">
            결제하신{' '}
            <strong className="tabular-nums">{refundAmount.toLocaleString('ko-KR')}M</strong>은 즉시
            환불되며, 매물은 다시 판매중 상태로 돌아갑니다. 취소 사유는 판매자에게 전달돼요.
          </p>

          <div className="bg-warm-50 rounded-xl p-4">
            <p className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
              취소 사유 선택
            </p>
            <div className="flex flex-col gap-2">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <span
                    className="size-4 shrink-0 rounded-full border bg-white"
                    style={{
                      border:
                        selected === r
                          ? '5px solid var(--ticketa-blue-500)'
                          : '1.5px solid var(--warm-300)',
                    }}
                  />
                  <span className={selected === r ? 'font-bold' : 'font-medium'}>{r}</span>
                  <input
                    type="radio"
                    className="sr-only"
                    value={r}
                    checked={selected === r}
                    onChange={() => setSelected(r)}
                  />
                </label>
              ))}
            </div>
            {selected === '직접 입력' && (
              <textarea
                className="border-border mt-3 w-full rounded-lg border bg-white p-2.5 text-sm"
                placeholder="취소 사유를 입력해주세요 (4자 이상)"
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={400}
                disabled={pending}
              />
            )}
          </div>

          <div className="bg-destructive/8 text-destructive rounded-xl p-3 text-base leading-relaxed">
            ※ 검수가 완료된 후엔 취소 시 판매자에게 검수 수수료가 환급되지 않아요.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={pending}>
            돌아가기
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? '처리 중…' : '거래 취소하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
