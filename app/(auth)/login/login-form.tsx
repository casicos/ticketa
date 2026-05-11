'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AuthField } from '@/components/auth/auth-field';
import { loginSchema, type LoginInput } from '@/lib/domain/schemas/auth';
import { loginAction } from './actions';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [submitting, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [autoLogin, setAutoLogin] = useState(true);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
    mode: 'onTouched',
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('identifier', values.identifier);
      fd.set('password', values.password);
      fd.set('next', nextPath);

      const result = await loginAction(fd);
      if (result && !result.ok) {
        const msg = result.message ?? '로그인에 실패했습니다';
        setServerError(msg);
        toast.error(msg);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <AuthField
        id="identifier"
        label="아이디"
        type="text"
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="아이디 입력"
        error={errors.identifier?.message}
        {...form.register('identifier')}
      />

      <AuthField
        id="password"
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        placeholder="비밀번호 입력"
        error={errors.password?.message}
        rightAction={
          <button
            type="button"
            onClick={() => toast('준비중이에요', { description: '곧 만나요!' })}
            className="text-ticketa-blue-700 cursor-pointer text-[15px] leading-none font-bold hover:underline"
          >
            비밀번호 찾기
          </button>
        }
        {...form.register('password')}
      />

      <div className="flex items-center justify-between pt-1">
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-[15px]">
          <span
            aria-hidden
            onClick={() => setAutoLogin((v) => !v)}
            className={
              autoLogin
                ? 'border-ticketa-blue-500 bg-ticketa-blue-500 inline-flex size-4 items-center justify-center rounded-[4px] border-[1.5px] text-[11px] font-extrabold text-white'
                : 'border-input inline-flex size-4 items-center justify-center rounded-[4px] border-[1.5px] bg-white text-[11px] font-extrabold text-transparent'
            }
          >
            ✓
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
          />
          이 기기에서 자동 로그인
        </label>
        <span className="text-muted-foreground text-[13px]">공용 PC라면 해제하세요</span>
      </div>

      {serverError && (
        <p className="text-destructive text-[15px] font-semibold" role="alert">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-[52px] w-full rounded-[11px] text-[15px] font-extrabold tracking-[-0.012em]"
        disabled={submitting}
      >
        {submitting ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  );
}
