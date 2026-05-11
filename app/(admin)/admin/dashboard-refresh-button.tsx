'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DashboardRefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function refresh() {
    start(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={pending}
      className="border-border hover:bg-warm-50 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border bg-white px-3.5 text-[12px] font-bold transition-colors disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? '갱신 중…' : '새로고침'}
      <span
        className="size-1.5 rounded-full"
        style={{
          background: pending ? 'var(--ticketa-blue-500)' : '#2E7C52',
          boxShadow: pending ? '0 0 0 2px rgba(91,163,208,0.18)' : '0 0 0 2px rgba(46,124,82,0.18)',
        }}
      />
    </button>
  );
}
