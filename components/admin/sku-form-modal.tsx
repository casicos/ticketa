'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import {
  createSkuAction,
  updateSkuAction,
  toggleSkuActiveAction,
} from '@/app/(admin)/admin/catalog/actions';

type Brand = 'lotte' | 'hyundai' | 'shinsegae' | 'galleria' | 'ak';
type FeeKind = 'fixed' | 'percent';
type Bearer = 'seller' | 'buyer' | 'both';

type SkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_order: number;
  is_active: boolean;
  commission_type?: FeeKind;
  commission_amount?: number;
  commission_charged_to?: Bearer;
};

type Props = {
  onClose: () => void;
  editTarget?: SkuRow;
};

const BRANDS: { k: Brand; l: string }[] = [
  { k: 'lotte', l: '롯데' },
  { k: 'hyundai', l: '현대' },
  { k: 'shinsegae', l: '신세계' },
  { k: 'galleria', l: '갤러리아' },
  { k: 'ak', l: 'AK' },
];

const FACES = [5000, 10000, 30000, 50000, 70000, 100000, 200000, 500000];

const BEARERS: { k: Bearer; l: string; s: string; disabled?: boolean }[] = [
  { k: 'seller', l: '판매자', s: '정산금에서 차감', disabled: true },
  { k: 'buyer', l: '구매자', s: '결제 시 가산' },
  { k: 'both', l: '양쪽 분담', s: '50/50', disabled: true },
];

const R2_BLUE = 'var(--ticketa-blue-500)';
const R2_GREEN = '#1F6B43';
const R2_RED = 'var(--destructive)';

function deptLabel(brand: string): string {
  return BRANDS.find((b) => b.k === brand)?.l ?? brand;
}

function makeDisplayName(brand: string, face: number): string {
  const dept = deptLabel(brand);
  if (face >= 10000) return `${dept} ${face / 10000}만원권`;
  return `${dept} ${face / 1000}천원권`;
}

export function SkuFormModal({ onClose, editTarget }: Props) {
  const router = useRouter();
  const isEdit = Boolean(editTarget);

  const [dept, setDept] = React.useState<Brand>((editTarget?.brand as Brand) ?? 'lotte');
  const [face, setFace] = React.useState(editTarget?.denomination ?? 50000);
  const [feeKind, setFeeKind] = React.useState<FeeKind>(editTarget?.commission_type ?? 'fixed');
  const [feeVal, setFeeVal] = React.useState<string>(
    editTarget?.commission_amount != null ? String(editTarget.commission_amount) : '400',
  );
  const [bearer, setBearer] = React.useState<Bearer>(editTarget?.commission_charged_to ?? 'buyer');
  const [active, setActive] = React.useState(editTarget?.is_active ?? true);
  const [customFace, setCustomFace] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const displayName = makeDisplayName(dept, face);
  const feeNumber = Number(feeVal || 0);
  const feeText =
    feeKind === 'fixed' ? `${feeNumber.toLocaleString('ko-KR')}원` : `${feeVal || 0}%`;
  const projectedFee = feeKind === 'fixed' ? feeNumber : Math.round(face * (feeNumber / 100));
  const bearerLabel = BEARERS.find((b) => b.k === bearer)?.l ?? '판매자';

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (feeKind === 'fixed' && (!Number.isInteger(feeNumber) || feeNumber < 0)) {
      toast.error('고정 수수료는 0 이상 정수');
      return;
    }
    if (feeKind === 'percent' && (feeNumber < 0 || feeNumber > 100)) {
      toast.error('퍼센트 수수료는 0~100');
      return;
    }

    const fd = new FormData();
    if (editTarget?.id) fd.set('id', editTarget.id);
    fd.set('brand', dept);
    fd.set('denomination', String(face));
    fd.set('commission_type', feeKind);
    // schema 는 int 만 허용 — 퍼센트도 1% 단위 정수
    fd.set('commission_amount', String(Math.round(feeNumber)));
    fd.set('commission_charged_to', bearer);

    startTransition(async () => {
      const r = isEdit ? await updateSkuAction(fd) : await createSkuAction(fd);
      if (r.ok) {
        toast.success(isEdit ? '권종이 수정됐어요' : '권종이 등록됐어요');
        router.refresh();
        onClose();
      } else {
        toast.error(r.message ?? '저장 실패');
      }
    });
  }

  function toggleActiveAndSave() {
    if (!editTarget?.id) return;
    const next = !active;
    const fd = new FormData();
    fd.set('id', editTarget.id);
    fd.set('is_active', String(next));
    startTransition(async () => {
      const r = await toggleSkuActiveAction(fd);
      if (r.ok) {
        setActive(next);
        toast.success(next ? '활성화됐어요' : '비활성화됐어요');
        router.refresh();
      } else {
        toast.error(r.message ?? '실패');
        setActive(!next);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17, 22, 30, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[680px] overflow-hidden rounded-[16px] bg-white"
        style={{
          boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-warm-100 flex items-start gap-3.5 border-b px-6 pt-5 pb-3.5">
          <div className="flex-1">
            <div className="text-muted-foreground text-[11px] font-extrabold tracking-[0.08em] uppercase">
              {isEdit ? '권종 편집' : '권종 추가'}
            </div>
            <h3 className="mt-1 mb-0.5 text-[20px] font-extrabold tracking-[-0.018em]">
              {isEdit ? `${displayName} 편집` : '새 권종 등록'}
            </h3>
            <div className="text-muted-foreground text-[12px]">
              {isEdit
                ? '활성 / 수수료 정책 조정 — 기존 매물 영향 없음, 신규 매물부터 반영'
                : '브랜드 × 권종 조합은 중복 등록 불가 · 저장 즉시 활성'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="border-border text-muted-foreground hover:bg-warm-50 inline-flex size-8 cursor-pointer items-center justify-center rounded-[8px] border bg-white text-[16px] font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-[18px] p-6">
          {/* Preview chip */}
          <div className="border-warm-100 bg-warm-50 flex items-center gap-3.5 rounded-[12px] border px-4 py-3.5">
            <DeptMark dept={dept as Department} size={48} />
            <div className="flex-1">
              <div className="text-muted-foreground mb-0.5 text-[11px] font-extrabold tracking-[0.06em] uppercase">
                미리보기 · 카탈로그 카드
              </div>
              <div className="text-[16px] font-extrabold tracking-[-0.014em]">
                {deptLabel(dept)} 백화점 · {face.toLocaleString('ko-KR')}원권
              </div>
              <div className="text-muted-foreground text-[12px]">
                표시명 <b className="text-foreground">{displayName}</b> · 수수료{' '}
                <b className="text-foreground">
                  {feeText} / {bearerLabel}
                </b>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[12px] font-bold">
                {active ? '활성' : '비활성'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={isEdit ? toggleActiveAndSave : () => setActive(!active)}
                className="relative h-[22px] w-10 cursor-pointer rounded-full transition-colors"
                style={{ background: active ? R2_GREEN : 'var(--warm-200)' }}
              >
                <span
                  className="absolute size-[18px] rounded-full bg-white shadow transition-all"
                  style={{ top: 2, left: active ? 20 : 2 }}
                />
              </button>
            </div>
          </div>

          {/* Brand */}
          <div>
            <div className="text-muted-foreground mb-2 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              브랜드
            </div>
            <div className="flex flex-wrap gap-2">
              {BRANDS.map((b) => {
                const a = b.k === dept;
                return (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => !isEdit && setDept(b.k)}
                    disabled={isEdit}
                    className="inline-flex h-[42px] items-center gap-2 rounded-[10px] border-[1.5px] px-3.5 text-[14px] font-extrabold"
                    style={{
                      borderColor: a ? R2_BLUE : 'var(--border)',
                      background: a ? 'rgba(91,163,208,0.06)' : '#fff',
                      color: a ? R2_BLUE : 'var(--foreground)',
                      cursor: isEdit ? 'not-allowed' : 'pointer',
                      opacity: isEdit && !a ? 0.4 : 1,
                    }}
                  >
                    <DeptMark dept={b.k} size={22} /> {b.l}
                  </button>
                );
              })}
            </div>
            {isEdit && (
              <div className="text-muted-foreground mt-1.5 text-[11px]">
                편집 시 브랜드 / 권종은 변경 불가 — 잘못 등록한 경우 비활성 후 새로 등록
              </div>
            )}
          </div>

          {/* Face value */}
          <div>
            <div className="text-muted-foreground mb-2 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              권종 (액면)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FACES.map((f) => {
                const a = f === face && !customFace;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      if (!isEdit) {
                        setFace(f);
                        setCustomFace(false);
                      }
                    }}
                    disabled={isEdit}
                    className="h-9 rounded-[8px] border-[1.5px] px-3.5 text-[13px] font-extrabold tabular-nums"
                    style={{
                      borderColor: a ? R2_BLUE : 'var(--border)',
                      background: a ? R2_BLUE : '#fff',
                      color: a ? '#fff' : 'var(--foreground)',
                      cursor: isEdit ? 'not-allowed' : 'pointer',
                      opacity: isEdit && !a ? 0.35 : 1,
                    }}
                  >
                    {f.toLocaleString('ko-KR')}원
                  </button>
                );
              })}
              {!isEdit && !customFace && (
                <button
                  type="button"
                  onClick={() => setCustomFace(true)}
                  className="border-border text-muted-foreground h-9 cursor-pointer rounded-[8px] border-[1.5px] border-dashed bg-white px-3 text-[13px] font-bold"
                >
                  ＋ 직접 입력
                </button>
              )}
              {!isEdit && customFace && (
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={face}
                  onChange={(e) => setFace(Math.max(1000, Number(e.target.value) || 1000))}
                  className="border-border focus:border-ticketa-blue-500 h-9 w-[140px] rounded-[8px] border-[1.5px] bg-white px-2 text-center text-[13px] font-extrabold tabular-nums outline-none"
                  placeholder="액면 (원)"
                />
              )}
            </div>
          </div>

          {/* Fee policy */}
          <div className="border-warm-100 bg-warm-50 rounded-[12px] border px-[18px] py-4">
            <div className="text-muted-foreground mb-2.5 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              수수료 정책
            </div>
            <div className="mb-3 flex gap-2.5">
              {[
                { k: 'fixed' as const, l: '고정 금액', s: '예: 400원' },
                { k: 'percent' as const, l: '퍼센트', s: '예: 0.5%' },
              ].map((o) => {
                const a = o.k === feeKind;
                return (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => {
                      setFeeKind(o.k);
                      if (o.k === 'fixed') setFeeVal('400');
                      else setFeeVal('1');
                    }}
                    className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-3.5 text-left"
                    style={{
                      borderColor: a ? R2_BLUE : 'var(--border)',
                      background: a ? 'rgba(91,163,208,0.06)' : '#fff',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3.5 rounded-full bg-white"
                        style={{
                          border: a ? `4px solid ${R2_BLUE}` : '1.5px solid var(--border)',
                        }}
                      />
                      <span
                        className="text-[14px] font-extrabold"
                        style={{ color: a ? R2_BLUE : 'var(--foreground)' }}
                      >
                        {o.l}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 ml-[22px] text-[11px]">{o.s}</div>
                  </button>
                );
              })}
            </div>

            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="border-border flex h-[42px] flex-1 items-center overflow-hidden rounded-[10px] border bg-white">
                <input
                  type="number"
                  min={0}
                  step={feeKind === 'percent' ? 1 : 100}
                  value={feeVal}
                  onChange={(e) => setFeeVal(e.target.value)}
                  className="h-full flex-1 border-0 bg-white px-3.5 text-[15px] font-extrabold tabular-nums outline-none"
                />
                <span className="border-warm-100 bg-warm-50 text-muted-foreground inline-flex h-full items-center border-l px-3.5 text-[13px] font-bold">
                  {feeKind === 'fixed' ? '원' : '%'}
                </span>
              </div>
              <div
                className="flex-1 rounded-[10px] px-3 py-2"
                style={{
                  background: 'rgba(31,107,67,0.06)',
                  border: `1px dashed ${R2_GREEN}`,
                }}
              >
                <div
                  className="text-[10px] font-extrabold tracking-[0.06em] uppercase"
                  style={{ color: R2_GREEN }}
                >
                  예상 수수료 · 액면 {face.toLocaleString('ko-KR')}원
                </div>
                <div className="text-[15px] font-extrabold tabular-nums">
                  {projectedFee.toLocaleString('ko-KR')}원 / 거래
                </div>
              </div>
            </div>

            <div className="text-muted-foreground mb-1.5 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              부담 주체
            </div>
            <div className="flex gap-1.5">
              {BEARERS.map((b) => {
                const a = b.k === bearer;
                const off = !!b.disabled;
                return (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => !off && setBearer(b.k)}
                    disabled={off}
                    className="flex-1 rounded-[8px] border-[1.5px] px-3 py-2.5 text-left"
                    style={{
                      borderColor: a ? R2_BLUE : 'var(--border)',
                      background: a ? R2_BLUE : '#fff',
                      color: a ? '#fff' : 'var(--foreground)',
                      cursor: off ? 'not-allowed' : 'pointer',
                      opacity: off ? 0.45 : 1,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
                      {b.l}
                      {off && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.04em]"
                          style={{
                            background: 'rgba(120,115,108,0.18)',
                            color: '#57534e',
                          }}
                        >
                          지원 예정
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11px] font-semibold"
                      style={{
                        color: a ? 'rgba(255,255,255,0.85)' : 'var(--muted-foreground)',
                      }}
                    >
                      {b.s}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display name (auto, read-only — DB 의 display_name 컬럼은 generated stored) */}
          <div>
            <div className="text-muted-foreground mb-1.5 text-[11px] font-extrabold tracking-[0.06em] uppercase">
              표시명{' '}
              <span className="text-muted-foreground text-[11px] font-semibold tracking-normal normal-case">
                · 자동 생성 (DB generated column · 직접 수정 불가)
              </span>
            </div>
            <input
              value={displayName}
              readOnly
              className="border-border bg-warm-50 text-muted-foreground h-[42px] w-full rounded-[10px] border px-3.5 text-[15px] font-bold tabular-nums outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-warm-100 bg-warm-50 flex items-center gap-2.5 border-t px-6 py-3.5">
          {isEdit && (
            <button
              type="button"
              onClick={toggleActiveAndSave}
              disabled={pending}
              className="inline-flex h-10 cursor-pointer items-center rounded-[10px] border bg-white px-3.5 text-[13px] font-extrabold disabled:opacity-50"
              style={{ borderColor: 'rgba(255,82,82,0.3)', color: R2_RED }}
            >
              {active ? '비활성으로 전환' : '다시 활성으로 전환'}
            </button>
          )}
          <span className="text-muted-foreground ml-auto text-[12px]">
            저장 시 audit 로그 <b className="text-foreground">권종.{isEdit ? '편집' : '추가'}</b>{' '}
            기록
          </span>
          <button
            type="button"
            onClick={onClose}
            className="border-border hover:bg-warm-50 inline-flex h-10 cursor-pointer items-center rounded-[10px] border bg-white px-4 text-[13px] font-bold"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-ticketa-blue-500 inline-flex h-11 cursor-pointer items-center rounded-[10px] px-5 text-[14px] font-extrabold text-white disabled:opacity-50"
          >
            {pending ? '저장 중…' : isEdit ? '변경 저장' : '권종 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
