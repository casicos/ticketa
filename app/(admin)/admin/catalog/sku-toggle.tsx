'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toggleSkuActiveAction } from './actions';

export function SkuActiveToggle({ skuId, active }: { skuId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    const fd = new FormData();
    fd.set('id', skuId);
    fd.set('is_active', String(!active));
    start(async () => {
      const r = await toggleSkuActiveAction(fd);
      if (r.ok) {
        toast.success(active ? '비활성화됐어요' : '활성화됐어요');
        router.refresh();
      } else {
        toast.error(r.message ?? '실패');
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={pending}
      onClick={toggle}
      className="relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50"
      style={{ background: active ? '#1F6B43' : 'var(--warm-200)' }}
    >
      <span
        className="absolute size-[18px] rounded-full bg-white shadow transition-all"
        style={{ left: active ? 20 : 2 }}
      />
    </button>
  );
}
