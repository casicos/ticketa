'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateProfileAction } from './actions';

export function AccountProfileForm({
  initialNickname,
  initialMarketingOptIn,
}: {
  initialNickname: string;
  initialMarketingOptIn: boolean;
}) {
  const [pending, start] = useTransition();
  const [nickname, setNickname] = useState(initialNickname);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set('nickname', nickname);
      fd.set('marketing_opt_in', marketingOptIn ? 'true' : 'false');
      const r = await updateProfileAction(fd);
      if (r.ok) toast.success('프로필이 저장됐어요');
      else toast.error(r.message ?? '저장 실패');
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nickname">닉네임 (선택)</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 40))}
          placeholder="플랫폼 내 표시 이름"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(v === true)} />
        마케팅 정보 수신 동의 (선택)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
