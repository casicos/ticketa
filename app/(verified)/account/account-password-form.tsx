'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePasswordAction } from './actions';

export function AccountPasswordForm() {
  const [pending, start] = useTransition();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set('new_password', newPassword);
      fd.set('confirm', confirm);
      const r = await updatePasswordAction(fd);
      if (r.ok) {
        toast.success('비밀번호가 변경됐어요');
        setNewPassword('');
        setConfirm('');
      } else {
        toast.error(r.message ?? '변경 실패');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new_password">새 비밀번호</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8자 이상, 영문+숫자"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">새 비밀번호 확인</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={pending || !newPassword || !confirm}>
        {pending ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  );
}
