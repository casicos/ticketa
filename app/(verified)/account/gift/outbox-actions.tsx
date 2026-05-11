'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { refundGiftAction } from './actions';

export function GiftOutboxActions({
  giftId,
  status,
  recipient,
  totalPrice,
}: {
  giftId: string;
  status:
    | 'sent'
    | 'claimed_mileage'
    | 'claimed_delivery'
    | 'shipped'
    | 'completed'
    | 'refunded'
    | 'expired';
  recipient: string;
  totalPrice: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status !== 'sent') return null;

  function onRefund() {
    if (
      !confirm(
        `${recipient}에게 보낸 선물을 환불할까요? ${totalPrice.toLocaleString('ko-KR')}원이 마일리지로 돌아와요.`,
      )
    )
      return;
    const fd = new FormData();
    fd.set('gift_id', giftId);
    start(async () => {
      const r = await refundGiftAction(fd);
      if (r.ok) {
        toast.success('환불됐어요');
        router.refresh();
      } else {
        toast.error(r.message ?? '실패');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onRefund}
      disabled={pending}
      className="border-destructive/30 text-destructive hover:bg-destructive/5 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border bg-white px-4 text-[13px] font-extrabold disabled:opacity-50"
    >
      <RotateCcw className="size-3.5" strokeWidth={2.25} />
      {pending ? '환불 중…' : '환불'}
    </button>
  );
}
