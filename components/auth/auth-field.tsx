'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type AuthFieldProps = Omit<React.ComponentProps<'input'>, 'className'> & {
  label: string;
  hint?: string;
  error?: string;
  rightAction?: React.ReactNode;
  inputClassName?: string;
};

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, hint, error, rightAction, inputClassName, ...inputProps },
  ref,
) {
  return (
    <div className="space-y-2">
      <div className="flex h-[22px] items-center justify-between">
        <label htmlFor={id} className="text-foreground text-[15px] leading-none font-bold">
          {label}
        </label>
        {rightAction}
      </div>
      <input
        id={id}
        ref={ref}
        data-slot="auth-field-input"
        aria-invalid={!!error}
        className={cn(
          'block h-12 w-full rounded-[10px] border bg-white px-3.5',
          'text-[15px] font-semibold tracking-[-0.01em] outline-none',
          'placeholder:text-muted-foreground placeholder:font-normal',
          'transition-colors',
          'focus:border-ticketa-blue-500 focus:border-[1.5px]',
          error ? 'border-destructive border-[1.5px]' : 'border-border',
          inputClassName,
        )}
        {...inputProps}
      />
      {hint && !error && <p className="text-muted-foreground text-[13px]">{hint}</p>}
      {error && <p className="text-destructive text-[13px] font-semibold">{error}</p>}
    </div>
  );
});
