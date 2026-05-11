'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateStoreInfoAction } from './actions';

export function StoreForm({
  initialName,
  initialIntro,
}: {
  initialName: string;
  initialIntro: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [intro, setIntro] = useState(initialIntro);
  const [pending, start] = useTransition();

  const nameValid = name.trim().length >= 2 && name.trim().length <= 20;
  const introValid = intro.length <= 60;
  const canSubmit =
    nameValid && introValid && !pending && (name !== initialName || intro !== initialIntro);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nameValid) return;
    start(async () => {
      const fd = new FormData();
      fd.set('store_name', name.trim());
      fd.set('store_intro', intro.trim());
      const r = await updateStoreInfoAction(fd);
      if (r.ok) {
        toast.success('상점 정보가 저장됐어요');
        router.refresh();
      } else {
        toast.error(r.message ?? '저장에 실패했어요');
      }
    });
  }

  return (
    <form onSubmit={submit} className="surface-card space-y-4 p-6">
      <div>
        <label htmlFor="store_name" className="mb-1.5 block text-[14px] font-bold">
          상점명 <span className="text-destructive">*</span>
        </label>
        <input
          id="store_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="예: 컬쳐 상품권"
          className="border-border focus:border-ticketa-blue-500 focus:ring-ticketa-blue-50 h-11 w-full rounded-[10px] border bg-white px-3.5 text-[15px] font-semibold outline-none focus:ring-3"
        />
        <div className="text-muted-foreground mt-1 flex justify-between text-[14px]">
          <span>2~20자, 다른 에이전트와 중복 불가</span>
          <span className="tabular-nums">{name.length}/20</span>
        </div>
      </div>

      <div>
        <label htmlFor="store_intro" className="mb-1.5 block text-[14px] font-bold">
          한 줄 소개
        </label>
        <input
          id="store_intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          maxLength={60}
          placeholder="예: 빠른 배송, 검수 끝난 상품권만 취급해요"
          className="border-border focus:border-ticketa-blue-500 focus:ring-ticketa-blue-50 h-11 w-full rounded-[10px] border bg-white px-3.5 text-[15px] outline-none focus:ring-3"
        />
        <div className="text-muted-foreground mt-1 flex justify-end text-[14px] tabular-nums">
          {intro.length}/60
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="bg-ticketa-blue-500 h-12 w-full cursor-pointer rounded-[10px] text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '저장 중…' : '저장'}
      </button>

      <p className="text-muted-foreground text-[14px]">
        상점명은 카탈로그 매물 카드와 상점 페이지에 노출돼요. 로고/배너 등 추가 브랜딩은 곧
        제공돼요.
      </p>
    </form>
  );
}
