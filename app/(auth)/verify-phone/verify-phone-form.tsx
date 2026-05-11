'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthField } from '@/components/auth/auth-field';
import { cn } from '@/lib/utils';
import { formatKoreanPhone } from '@/lib/format';
import { verifyPhoneOtpAction } from './actions';

type Carrier = {
  id: 'skt' | 'kt' | 'lgu' | 'mvno_skt' | 'mvno_kt';
  label: string;
};

const CARRIERS: Carrier[] = [
  { id: 'skt', label: 'SKT' },
  { id: 'kt', label: 'KT' },
  { id: 'lgu', label: 'LG U+' },
  { id: 'mvno_skt', label: '알뜰 SK' },
  { id: 'mvno_kt', label: '알뜰 KT' },
];

export function VerifyPhoneForm({
  phone,
  initialFullName,
  nextPath,
}: {
  phone: string;
  initialFullName: string;
  nextPath: string;
  // devMode 는 더 이상 UI 에 노출하지 않음. 임시 정책은 서버 액션 내부에서만 처리.
  devMode?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialFullName);
  const [carrier, setCarrier] = useState<Carrier['id']>('skt');
  const [phoneInput, setPhoneInput] = useState(phone);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneInput.trim();
    if (!trimmedName) {
      const msg = '이름을 입력해주세요';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!trimmedPhone) {
      const msg = '휴대폰 번호를 입력해주세요';
      setError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set('full_name', trimmedName);
      fd.set('phone', trimmedPhone);
      fd.set('carrier', carrier);
      fd.set('next', nextPath);

      const result = await verifyPhoneOtpAction(fd);
      // 성공 시 server action 이 redirect 하므로 여기 도달 = 실패.
      if (result && !result.ok) {
        const msg = result.message ?? '본인인증에 실패했어요';
        setError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthField
        id="full_name"
        label="이름"
        type="text"
        autoComplete="name"
        placeholder="실명을 입력해주세요"
        hint="신분증·통신사 등록명과 동일해야 해요"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      {/* Carrier picker */}
      <div className="space-y-2">
        <div className="flex h-[22px] items-center">
          <span className="text-foreground text-[15px] leading-none font-bold">통신사</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {CARRIERS.map((c) => {
            const active = carrier === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCarrier(c.id)}
                className={cn(
                  'h-11 cursor-pointer rounded-[9px] text-[14px] font-bold transition-colors',
                  active
                    ? 'border-ticketa-blue-500 bg-ticketa-blue-50 text-ticketa-blue-700 border-[1.5px]'
                    : 'border-border text-foreground hover:bg-muted/40 border bg-white',
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <AuthField
        id="phone"
        label="휴대폰 번호"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="010-1234-5678"
        value={phoneInput}
        onChange={(e) => setPhoneInput(e.target.value)}
        onBlur={(e) => {
          const formatted = formatKoreanPhone(e.target.value);
          if (formatted) setPhoneInput(formatted);
        }}
      />

      {error && (
        <p className="text-destructive text-[13px] font-semibold" role="alert">
          {error}
        </p>
      )}

      {/* Info box */}
      <div className="bg-muted/40 flex gap-2.5 rounded-[10px] p-3.5">
        <span className="bg-ticketa-blue-50 text-ticketa-blue-700 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full">
          <Info className="size-[14px]" strokeWidth={2.25} />
        </span>
        <div className="text-muted-foreground text-[13px] leading-[1.6]">
          <strong className="text-foreground font-bold">왜 본인인증이 필요한가요?</strong>
          <br />
          중고 상품권 거래는 명의 도용·차명 거래 위험이 높아요. 인증된 회원만 거래·출금할 수 있어
          분쟁 시 책임 추적이 가능합니다.
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="border-border hover:bg-warm-50 h-[52px] flex-1 cursor-pointer rounded-[11px] border bg-white text-[15px] font-bold transition-colors"
        >
          ← 이전
        </button>
        <Button
          type="submit"
          size="lg"
          className="h-[52px] flex-[2] rounded-[11px] text-[15px] font-extrabold tracking-[-0.012em]"
          disabled={pending || !fullName.trim() || !phoneInput.trim()}
        >
          {pending ? '확인 중…' : '인증 완료 · 가입하기'}
        </Button>
      </div>
    </form>
  );
}
