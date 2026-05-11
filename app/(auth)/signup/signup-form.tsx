'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthField } from '@/components/auth/auth-field';
import { signupSchema } from '@/lib/domain/schemas/auth';
import type { z } from 'zod';
import { signupAction } from './actions';

// RHF input type: marketing_opt_in 은 zod default 로 optional. output 과 구분.
type SignupFormValues = z.input<typeof signupSchema>;

type TermItem = {
  key: 'agree_terms' | 'agree_privacy' | 'marketing_opt_in';
  label: string;
  required: boolean;
  href?: string;
};

const TERMS: readonly TermItem[] = [
  { key: 'agree_terms', label: '이용약관 동의', required: true, href: '/legal/terms' },
  {
    key: 'agree_privacy',
    label: '개인정보 수집·이용 동의',
    required: true,
    href: '/legal/privacy',
  },
  { key: 'marketing_opt_in', label: '마케팅 정보 수신 동의 (혜택·이벤트)', required: false },
] as const;

export function SignupForm() {
  const [submitting, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      password: '',
      password_confirm: '',
      agree_terms: false as unknown as true,
      agree_privacy: false as unknown as true,
      marketing_opt_in: false,
    },
    mode: 'onTouched',
  });

  const errors = form.formState.errors;
  const agreeTerms = useWatch({ control: form.control, name: 'agree_terms' });
  const agreePrivacy = useWatch({ control: form.control, name: 'agree_privacy' });
  const marketingOptIn = useWatch({ control: form.control, name: 'marketing_opt_in' });

  const checked: Record<TermItem['key'], boolean> = {
    agree_terms: agreeTerms === true,
    agree_privacy: agreePrivacy === true,
    marketing_opt_in: marketingOptIn === true,
  };
  const allChecked = checked.agree_terms && checked.agree_privacy && checked.marketing_opt_in;

  const setTerm = (key: TermItem['key'], next: boolean) => {
    if (key === 'marketing_opt_in') {
      form.setValue('marketing_opt_in', next, { shouldValidate: false });
      return;
    }
    form.setValue(key, next ? (true as const) : (false as unknown as true), {
      shouldValidate: true,
    });
  };

  const toggleAll = () => {
    const next = !allChecked;
    setTerm('agree_terms', next);
    setTerm('agree_privacy', next);
    setTerm('marketing_opt_in', next);
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('username', values.username);
      fd.set('password', values.password);
      fd.set('password_confirm', values.password_confirm);
      fd.set('agree_terms', values.agree_terms ? 'on' : '');
      fd.set('agree_privacy', values.agree_privacy ? 'on' : '');
      fd.set('marketing_opt_in', values.marketing_opt_in ? 'on' : '');

      const result = await signupAction(fd);
      // 성공 시 redirect 로 throw 되므로 여기 도달하면 실패 케이스
      if (result && !result.ok) {
        const msg = result.message ?? '회원가입에 실패했습니다';
        setServerError(msg);
        toast.error(msg);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <AuthField
        id="username"
        label="아이디"
        type="text"
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="영문 소문자/숫자/언더스코어 4~20자"
        hint="로그인할 때 사용해요. 변경할 수 없어요"
        error={errors.username?.message}
        {...form.register('username')}
      />

      <AuthField
        id="password"
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        placeholder="8자 이상, 영문·숫자 포함"
        hint="영문·숫자 포함 8자 이상"
        error={errors.password?.message}
        {...form.register('password')}
      />

      <AuthField
        id="password_confirm"
        label="비밀번호 확인"
        type="password"
        autoComplete="new-password"
        placeholder="비밀번호를 한 번 더 입력해주세요"
        error={errors.password_confirm?.message}
        {...form.register('password_confirm')}
      />

      {/* 실명·휴대폰은 다음 본인인증 단계에서 수집. */}

      {/* Terms — 디자인 시안의 warm-50 박스 + 모두 동의 마스터 + 필수/선택 배지 + 보기 링크 */}
      <div className="bg-muted/40 rounded-[11px] p-4">
        <button
          type="button"
          onClick={toggleAll}
          className="border-border/70 flex w-full cursor-pointer items-center gap-2.5 border-b pb-3 text-left"
        >
          <CheckSquare on={allChecked} />
          <span className="text-[15px] font-extrabold tracking-[-0.012em]">모두 동의합니다</span>
          <span className="text-muted-foreground ml-auto text-[13px]">선택 항목 포함</span>
        </button>

        <div className="flex flex-col gap-2.5 pt-3">
          {TERMS.map((t) => {
            const isOn = checked[t.key];
            return (
              <div key={t.key} className="flex items-center gap-2.5 text-[15px]">
                <button
                  type="button"
                  onClick={() => setTerm(t.key, !isOn)}
                  className="cursor-pointer"
                  aria-pressed={isOn}
                  aria-label={`${t.label} ${isOn ? '해제' : '동의'}`}
                >
                  <CheckSquare on={isOn} />
                </button>
                <Badge required={t.required} />
                <button
                  type="button"
                  onClick={() => setTerm(t.key, !isOn)}
                  className="flex-1 cursor-pointer text-left"
                >
                  {t.label}
                </button>
                {t.href && (
                  <Link
                    href={t.href}
                    target="_blank"
                    className="text-muted-foreground hover:text-foreground text-[13px] underline underline-offset-2"
                  >
                    보기
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {(errors.agree_terms || errors.agree_privacy) && (
          <p className="text-destructive mt-3 text-[13px] font-semibold">
            {errors.agree_terms?.message ?? errors.agree_privacy?.message}
          </p>
        )}
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
        {submitting ? '가입 중...' : '본인인증 후 가입하기'}
      </Button>
      <p className="text-muted-foreground text-center text-[13px]">
        다음 단계에서 휴대폰 SMS 인증으로 본인 확인이 진행돼요 (1~2분)
      </p>
    </form>
  );
}

function CheckSquare({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={
        on
          ? 'bg-ticketa-blue-500 inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[12px] font-extrabold text-white'
          : 'border-input inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] bg-white text-[12px] text-transparent'
      }
    >
      ✓
    </span>
  );
}

function Badge({ required }: { required: boolean }) {
  return (
    <span
      className={
        required
          ? 'bg-destructive/10 text-destructive rounded-[3px] px-1.5 py-[1px] text-[12px] font-extrabold tracking-[0.04em]'
          : 'bg-muted text-muted-foreground rounded-[3px] px-1.5 py-[1px] text-[12px] font-extrabold tracking-[0.04em]'
      }
    >
      {required ? '필수' : '선택'}
    </span>
  );
}
