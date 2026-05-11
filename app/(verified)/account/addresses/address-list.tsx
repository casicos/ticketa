'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Trash2, Pencil, Star } from 'lucide-react';
import { saveAddressAction, deleteAddressAction, setDefaultAddressAction } from './actions';

export type AddressItem = {
  id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
  created_at: string;
};

export function AddressList({ initial }: { initial: AddressItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AddressItem | 'new' | null>(null);
  const [pending, start] = useTransition();

  function refresh() {
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm('이 배송지를 삭제할까요?')) return;
    const fd = new FormData();
    fd.set('id', id);
    start(async () => {
      const r = await deleteAddressAction(fd);
      if (r.ok) {
        toast.success('삭제됐어요');
        refresh();
      } else {
        toast.error(r.message ?? '삭제 실패');
      }
    });
  }

  function onSetDefault(id: string) {
    const fd = new FormData();
    fd.set('id', id);
    start(async () => {
      const r = await setDefaultAddressAction(fd);
      if (r.ok) {
        toast.success('기본 배송지로 지정됐어요');
        refresh();
      } else {
        toast.error(r.message ?? '실패');
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="bg-ticketa-blue-500 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] px-4 text-[14px] font-extrabold text-white"
        >
          <Plus className="size-4" strokeWidth={2} />
          배송지 추가
        </button>
      </div>

      {initial.length === 0 && editing === null ? (
        <div className="border-border rounded-[12px] border border-dashed bg-white p-12 text-center">
          <MapPin className="text-muted-foreground mx-auto mb-3 size-9" strokeWidth={1.5} />
          <p className="text-[15px] font-bold">등록된 배송지가 없어요</p>
          <p className="text-muted-foreground mt-1 text-[14px]">
            선물 현물 수령 시 배송지가 필요해요. 미리 등록해두면 편해요.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {initial.map((a) => (
            <div
              key={a.id}
              className="border-border flex items-start gap-4 rounded-[12px] border bg-white p-5"
            >
              <div className="bg-warm-50 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[10px]">
                <MapPin className="text-ticketa-blue-500 size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-extrabold">{a.label || a.recipient_name}</span>
                  {a.is_default && (
                    <span className="bg-ticketa-blue-50 text-ticketa-blue-700 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
                      <Star className="size-3" strokeWidth={2.5} />
                      기본
                    </span>
                  )}
                </div>
                <div className="text-foreground text-[14px]">
                  {a.recipient_name} · {a.recipient_phone}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[14px]">
                  ({a.postal_code}) {a.address1}
                  {a.address2 ? ` ${a.address2}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {!a.is_default && (
                  <button
                    type="button"
                    onClick={() => onSetDefault(a.id)}
                    disabled={pending}
                    className="border-border text-foreground hover:bg-warm-50 rounded-[8px] border bg-white px-3 py-1.5 text-[12px] font-bold disabled:opacity-50"
                  >
                    기본 지정
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  disabled={pending}
                  className="border-border text-foreground hover:bg-warm-50 inline-flex items-center justify-center gap-1 rounded-[8px] border bg-white px-3 py-1.5 text-[12px] font-bold disabled:opacity-50"
                >
                  <Pencil className="size-3" strokeWidth={2} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  disabled={pending}
                  className="border-destructive/30 text-destructive hover:bg-destructive/5 inline-flex items-center justify-center gap-1 rounded-[8px] border bg-white px-3 py-1.5 text-[12px] font-bold disabled:opacity-50"
                >
                  <Trash2 className="size-3" strokeWidth={2} />
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AddressEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function AddressEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: AddressItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [recipientName, setRecipientName] = useState(initial?.recipient_name ?? '');
  const [recipientPhone, setRecipientPhone] = useState(initial?.recipient_phone ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postal_code ?? '');
  const [address1, setAddress1] = useState(initial?.address1 ?? '');
  const [address2, setAddress2] = useState(initial?.address2 ?? '');
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    if (initial) fd.set('id', initial.id);
    fd.set('label', label);
    fd.set('recipient_name', recipientName);
    fd.set('recipient_phone', recipientPhone);
    fd.set('postal_code', postalCode);
    fd.set('address1', address1);
    fd.set('address2', address2);
    if (isDefault) fd.set('is_default', 'on');
    start(async () => {
      const r = await saveAddressAction(fd);
      if (r.ok) {
        toast.success(initial ? '수정됐어요' : '추가됐어요');
        onSaved();
      } else {
        toast.error(r.message ?? '저장 실패');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        <div className="border-border border-b px-6 py-4">
          <h3 className="text-[18px] font-extrabold tracking-[-0.018em]">
            {initial ? '배송지 수정' : '새 배송지 추가'}
          </h3>
        </div>
        <div className="grid gap-3 px-6 py-5">
          <Field label="별칭 (선택)">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예) 집, 회사"
              maxLength={20}
              className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="받는 사람" required>
              <input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                maxLength={40}
                className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none"
              />
            </Field>
            <Field label="연락처" required>
              <input
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="010-1234-5678"
                maxLength={20}
                className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none"
              />
            </Field>
          </div>
          <Field label="우편번호" required>
            <input
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/[^\d-]/g, ''))}
              placeholder="12345"
              maxLength={7}
              className="border-border focus:border-ticketa-blue-500 h-11 w-40 rounded-[10px] border bg-white px-3 text-[14px] tabular-nums outline-none"
            />
          </Field>
          <Field label="주소" required>
            <input
              required
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="시·도, 시·군·구, 도로명"
              maxLength={200}
              className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none"
            />
          </Field>
          <Field label="상세주소">
            <input
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="동·호수, 추가 정보"
              maxLength={200}
              className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none"
            />
          </Field>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-ticketa-blue-500 size-4"
            />
            기본 배송지로 지정
          </label>
        </div>
        <div className="border-border bg-warm-50/40 flex items-center justify-end gap-2 border-t px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="border-border text-foreground hover:bg-warm-50 h-10 cursor-pointer rounded-[10px] border bg-white px-4 text-[14px] font-bold"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-ticketa-blue-500 h-10 cursor-pointer rounded-[10px] px-5 text-[14px] font-extrabold text-white disabled:opacity-50"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
