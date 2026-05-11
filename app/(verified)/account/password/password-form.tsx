'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updatePasswordAction } from '../actions';

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmMismatch = confirm.length > 0 && newPw !== confirm;

  const strengthLevel = (() => {
    if (newPw.length === 0) return -1;
    let score = 0;
    if (newPw.length >= 8) score++;
    if (/[A-Z]/.test(newPw) && /[a-z]/.test(newPw)) score++;
    if (/[0-9]/.test(newPw)) score++;
    if (/[^A-Za-z0-9]/.test(newPw)) score++;
    if (newPw.length >= 14) score++;
    return Math.min(score - 1, 4);
  })();

  const strengthLabels = ['매우 약함', '약함', '보통', '강함', '매우 강함'];
  const strengthColors = ['#C74937', '#E58F1F', '#D4A24C', '#5BA476', '#1F6B43'];

  const rules = [
    { l: '8자 이상 입력', ok: newPw.length >= 8 },
    { l: '영문 대·소문자 포함', ok: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) },
    { l: '숫자 1개 이상 포함', ok: /[0-9]/.test(newPw) },
    { l: '특수문자 1개 이상 포함', ok: /[^A-Za-z0-9]/.test(newPw) },
  ];

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPw !== confirm) {
      toast.error('비밀번호가 일치하지 않아요');
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set('new_password', newPw);
      fd.set('confirm', confirm);
      const r = await updatePasswordAction(fd);
      if (r.ok) {
        toast.success('비밀번호가 변경됐어요');
        setCurrent('');
        setNewPw('');
        setConfirm('');
      } else {
        toast.error(r.message ?? '변경 실패');
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="surface-card p-6">
        <div className="mb-5 text-[15px] font-extrabold tracking-tight">새 비밀번호 설정</div>
        <form onSubmit={submit} className="space-y-0">
          <PwField
            label="현재 비밀번호"
            placeholder="현재 사용 중인 비밀번호"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
          />
          <PwField
            label="새 비밀번호"
            placeholder="8자 이상, 영문·숫자·특수문자 포함"
            value={newPw}
            onChange={setNewPw}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
          />

          {newPw.length > 0 && strengthLevel >= 0 && (
            <div className="mt-1 mb-4">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      background:
                        i <= strengthLevel ? strengthColors[strengthLevel] : 'var(--warm-200)',
                    }}
                  />
                ))}
              </div>
              <div
                className="mt-1.5 text-[15px] font-bold"
                style={{ color: strengthColors[strengthLevel] }}
              >
                비밀번호 강도: {strengthLabels[strengthLevel]}
              </div>
            </div>
          )}

          <div className="bg-warm-50 mb-4 rounded-[9px] px-3.5 py-3">
            <div className="flex flex-col gap-1.5">
              {rules.map((r) => (
                <div key={r.l} className="flex items-center gap-2">
                  <span
                    className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: r.ok ? '#1F6B43' : 'var(--warm-200)', fontSize: 10 }}
                  >
                    {r.ok ? '✓' : '·'}
                  </span>
                  <span
                    className="text-[15px]"
                    style={{
                      fontWeight: r.ok ? 600 : 500,
                      color: r.ok ? 'var(--foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    {r.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <PwField
            label="새 비밀번호 확인"
            placeholder="다시 한 번 입력"
            value={confirm}
            onChange={setConfirm}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            error={confirmMismatch ? '비밀번호가 일치하지 않아요' : undefined}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="border-border flex h-12 flex-1 items-center justify-center rounded-[10px] border bg-white text-[15px] font-bold"
              onClick={() => {
                setCurrent('');
                setNewPw('');
                setConfirm('');
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending || !current || !newPw || !confirm || confirmMismatch}
              className="bg-ticketa-blue-500 flex h-12 flex-[2] items-center justify-center rounded-[10px] text-[15px] font-extrabold text-white disabled:opacity-50"
            >
              {pending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="surface-card p-5">
          <div className="mb-2.5 text-[15px] font-extrabold tracking-tight">안전 비밀번호 안내</div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-[15px] leading-[1.7]">
            <li>다른 사이트와 동일한 비밀번호는 피해주세요</li>
            <li>이름·생일·전화번호 같은 추측 가능한 조합은 안전하지 않아요</li>
            <li>의심스러운 로그인이 있으면 즉시 변경하세요</li>
            <li>3개월에 한 번 변경하시는 걸 권장해요</li>
          </ul>
        </div>

        <div className="surface-card p-5">
          <div className="mb-2.5 text-[15px] font-extrabold tracking-tight">최근 로그인 기기</div>
          <div className="flex flex-col gap-2.5">
            {[
              { d: 'iPhone 15 · Safari', loc: '서울 마포', t: '방금 전', cur: true },
              { d: 'MacBook Pro · Chrome', loc: '서울 마포', t: '2시간 전' },
              { d: 'iPad Air · Safari', loc: '제주도', t: '3일 전', warn: true },
            ].map((item, i) => (
              <div key={i} className="border-border rounded-[9px] border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold">{item.d}</span>
                  {item.cur && (
                    <span className="bg-success/12 text-success rounded-[3px] px-1.5 py-0.5 text-[11px] font-extrabold">
                      현재
                    </span>
                  )}
                  {item.warn && (
                    <span
                      className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-extrabold"
                      style={{
                        background: 'rgba(212,162,76,0.18)',
                        color: 'var(--ticketa-gold-700)',
                      }}
                    >
                      새 위치
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[13px]">
                  {item.loc} · {item.t}
                </div>
              </div>
            ))}
            <button className="border-border text-destructive flex h-9 items-center justify-center rounded-lg border bg-white text-[15px] font-bold">
              다른 기기 모두 로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PwField({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[15px] font-bold">{label}</div>
      <div
        className="flex h-[46px] items-center gap-2 rounded-[10px] border px-3.5"
        style={{ borderColor: error ? 'var(--destructive)' : 'var(--border)' }}
      >
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-0 bg-transparent text-[13px] font-semibold tracking-[0.05em] outline-none"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="text-muted-foreground shrink-0 text-[15px] font-bold"
        >
          {show ? '숨김' : '표시'}
        </button>
      </div>
      {error && <div className="text-destructive mt-1.5 text-[15px] font-semibold">{error}</div>}
    </div>
  );
}
