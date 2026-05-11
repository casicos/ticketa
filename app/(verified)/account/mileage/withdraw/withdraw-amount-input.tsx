'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/**
 * 출금 금액 입력 — 출금 가능(max) 을 초과하면 자동으로 max 로 clamp.
 * "전액" 버튼으로 max 를 즉시 채울 수 있다.
 */
export function WithdrawAmountInput({ max }: { max: number }) {
  const [value, setValue] = useState<string>('');

  function handleChange(raw: string) {
    // 숫자만 뽑기 (쉼표/공백 제거)
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly === '') {
      setValue('');
      return;
    }
    const parsed = Number(digitsOnly);
    if (Number.isNaN(parsed)) {
      setValue('');
      return;
    }
    const clamped = Math.min(parsed, max);
    setValue(String(clamped));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="amount">출금 금액 (원)</Label>
        <button
          type="button"
          onClick={() => setValue(String(max))}
          className="text-ticketa-blue-700 text-xs font-semibold underline-offset-2 hover:underline"
        >
          전액 {max.toLocaleString('ko-KR')}원
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`최대 ${max.toLocaleString('ko-KR')}원`}
          className="tabular-nums"
          required
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setValue(String(max))}>
          전액
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        입력 금액이 출금 가능 잔액을 넘으면 자동으로 최대치로 맞춰져요.
      </p>
    </div>
  );
}
