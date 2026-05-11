'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ServerActionResult } from '@/lib/server-actions';
import { grantRoleAction, revokeRoleAction } from './actions';

type Role = 'seller' | 'agent' | 'admin';

type BaseProps = {
  userId: string;
  role: Role;
  userLabel: string;
};

function handleResult(result: ServerActionResult<unknown>, successMsg: string) {
  if (result.ok) {
    toast.success(successMsg);
    return;
  }
  const codeMap: Record<string, string> = {
    FORBIDDEN: '권한이 없습니다.',
    UNAUTHENTICATED: '로그인이 필요합니다.',
    VALIDATION: '입력값을 확인하세요.',
    SELF_ADMIN_REVOKE: '자기 자신의 admin 권한은 회수할 수 없어요.',
    DB_ERROR: 'DB 오류가 발생했습니다.',
  };
  toast.error(codeMap[result.code] ?? result.message ?? '오류가 발생했습니다.');
}

// ------------------------------------------------------------------
// 역할 부여 버튼 (간단 confirm)
// ------------------------------------------------------------------

export function GrantRoleButton({ userId, role, userLabel }: BaseProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`${userLabel} 에게 ${roleLabel(role)} 권한을 부여할까요?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('user_id', userId);
      fd.set('role', role);
      const result = await grantRoleAction(fd);
      if (result.ok && result.data?.already_active) {
        toast.info('이미 활성 상태입니다.');
      } else {
        handleResult(result, `${roleLabel(role)} 권한을 부여했어요.`);
      }
    });
  }

  return (
    <Button size="sm" variant="secondary" onClick={handleClick} disabled={isPending}>
      {isPending ? '처리 중…' : `${roleLabel(role)} 부여`}
    </Button>
  );
}

// ------------------------------------------------------------------
// 역할 회수 버튼 (2단계 확인 모달)
// ------------------------------------------------------------------

type RevokeProps = BaseProps & { disabled?: boolean; disabledReason?: string };

export function RevokeRoleButton({
  userId,
  role,
  userLabel,
  disabled,
  disabledReason,
}: RevokeProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('user_id', userId);
      fd.set('role', role);
      const result = await revokeRoleAction(fd);
      handleResult(result, `${roleLabel(role)} 권한을 회수했어요.`);
      if (result.ok) setOpen(false);
    });
  }

  if (disabled) {
    return (
      <span title={disabledReason}>
        <Button size="sm" variant="outline" disabled>
          {roleLabel(role)} 회수
        </Button>
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          {roleLabel(role)} 회수
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roleLabel(role)} 권한 회수</DialogTitle>
          <DialogDescription>
            <b>{userLabel}</b> 의 {roleLabel(role)} 권한을 회수합니다. 이후 해당 역할의 작업을
            수행할 수 없어요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? '처리 중…' : '회수 처리'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function roleLabel(role: Role) {
  switch (role) {
    case 'seller':
      return '판매자';
    case 'agent':
      return '에이전트';
    case 'admin':
      return '어드민';
  }
}
