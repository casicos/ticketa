'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KOREAN_BANKS } from '@/lib/domain/banks';
import { updateBankAccountAction } from './actions';

export function AccountBankForm({
  initial,
}: {
  initial: {
    bank_code: string;
    account_number_last4: string;
    account_holder: string;
  } | null;
}) {
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(!initial);
  const [bankCode, setBankCode] = useState(initial?.bank_code ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState(initial?.account_holder ?? '');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bankCode || !accountNumber || !accountHolder) {
      toast.error('모든 필드를 입력해주세요');
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set('bank_code', bankCode);
      fd.set('account_number', accountNumber);
      fd.set('account_holder', accountHolder);
      const r = await updateBankAccountAction(fd);
      if (r.ok) {
        toast.success('정산계좌가 저장됐어요');
        setShowForm(false);
        setAccountNumber('');
      } else {
        toast.error(r.message ?? '저장 실패');
      }
    });
  };

  if (initial && !showForm) {
    const bankName =
      KOREAN_BANKS.find((b) => b.code === initial.bank_code)?.name ?? initial.bank_code;
    return (
      <div className="space-y-3">
        <div className="bg-muted/30 rounded-md border p-4 text-sm">
          <div className="text-muted-foreground">현재 등록 계좌</div>
          <div className="mt-1 font-medium">
            {bankName} · ****{initial.account_number_last4} · {initial.account_holder}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          계좌 변경
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bank_code">은행</Label>
        <select
          id="bank_code"
          name="bank_code"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          required
        >
          <option value="">은행 선택</option>
          {KOREAN_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account_number">계좌번호 (숫자만)</Label>
        <Input
          id="account_number"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
          placeholder="10 ~ 16자리"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account_holder">예금주</Label>
        <Input
          id="account_holder"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value.slice(0, 40))}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? '저장 중...' : '저장'}
        </Button>
        {initial && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowForm(false)}
            disabled={pending}
          >
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
