'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { admitConsignmentAction } from './actions';
import { DeptMark, type Department } from '@/components/ticketa/dept-mark';
import { R2Pill } from '@/components/admin/r2';

export type AgentOption = {
  id: string;
  label: string;
  storeName: string | null;
  username: string | null;
};

export type SkuOption = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  thumbnail_url?: string | null;
  code?: string | null;
};

const BRAND_TO_DEPT: Record<string, Department> = {
  롯데백화점: 'lotte',
  현대백화점: 'hyundai',
  신세계백화점: 'shinsegae',
  갤러리아백화점: 'galleria',
  AK백화점: 'ak',
};

function SkuMark({ sku, size }: { sku: SkuOption; size: number }) {
  if (sku.thumbnail_url) {
    return (
      <div
        className="border-warm-200 relative shrink-0 overflow-hidden rounded-[6px] border bg-white"
        style={{ width: size, height: size }}
      >
        <Image
          src={sku.thumbnail_url}
          alt={sku.display_name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }
  const dept = BRAND_TO_DEPT[sku.brand];
  if (dept) return <DeptMark dept={dept} size={size} />;
  return <DeptMark dept={sku.brand} size={size} />;
}

export type ExistingInventoryRow = {
  id: string;
  agent_id: string;
  sku_id: string;
  unit_cost: number;
  qty_available: number;
  qty_reserved: number;
};

function shortBrandLabel(brand: string): string {
  const stripped = brand.replace(/백화점$/, '').trim();
  return stripped || brand;
}

const QUICK_QTY = [10, 30, 50, 100];

export function ConsignmentForm({
  agents,
  skus,
  existingInventory,
}: {
  agents: AgentOption[];
  skus: SkuOption[];
  existingInventory: ExistingInventoryRow[];
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [skuId, setSkuId] = useState(skus[0]?.id ?? '');
  const [qty, setQty] = useState(30);
  const [unitCost, setUnitCost] = useState(0);
  const [pending, start] = useTransition();

  const selectedAgent = agents.find((a) => a.id === agentId);
  const selectedSku = skus.find((s) => s.id === skuId);

  const matchedRow = useMemo<ExistingInventoryRow | null>(() => {
    if (!agentId || !skuId || unitCost <= 0) return null;
    return (
      existingInventory.find(
        (r) => r.agent_id === agentId && r.sku_id === skuId && r.unit_cost === unitCost,
      ) ?? null
    );
  }, [agentId, skuId, unitCost, existingInventory]);

  const canSubmit = !!agentId && !!skuId && qty >= 1 && unitCost > 0 && !pending;

  const face = selectedSku?.denomination ?? 0;
  const discountPct = face > 0 && unitCost > 0 ? ((face - unitCost) / face) * 100 : 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    start(async () => {
      const fd = new FormData();
      fd.set('agent_id', agentId);
      fd.set('sku_id', skuId);
      fd.set('qty', String(qty));
      fd.set('unit_cost', String(unitCost));
      const r = await admitConsignmentAction(fd);
      if (r.ok) {
        toast.success('위탁 재고가 적재됐어요');
        setQty(30);
        setUnitCost(0);
        router.refresh();
      } else {
        toast.error(r.message ?? '적재 실패');
      }
    });
  }

  if (agents.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border bg-white p-8 text-center text-[14px]">
        에이전트 권한을 가진 사용자가 없어요.{' '}
        <a href="/admin/members" className="font-bold underline">
          사용자 관리
        </a>{' '}
        에서 먼저 권한을 부여하세요.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-border rounded-[12px] border bg-white p-[22px]">
      <div className="mb-[18px] flex items-center gap-2">
        <span className="text-[16px] font-extrabold tracking-[-0.014em]">새 위탁 입고</span>
        <R2Pill tone="progress">DRAFT</R2Pill>
      </div>

      <div className="mb-3.5 grid gap-3.5 md:grid-cols-2">
        <div>
          <label className="text-muted-foreground mb-1.5 block text-[12px] font-extrabold tracking-[0.06em] uppercase">
            에이전트
          </label>
          <div className="relative">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="border-border focus:border-ticketa-blue-500 h-11 w-full appearance-none rounded-[10px] border bg-white px-3 text-[14px] font-semibold outline-none"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {selectedAgent && (
              <div className="pointer-events-none absolute top-1/2 left-3 hidden -translate-y-1/2 items-center gap-2 bg-white pr-1 md:flex">
                <span
                  className="flex size-6 items-center justify-center rounded-[6px] text-[12px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #D4A24C, #B6862E)' }}
                >
                  {(selectedAgent.storeName ?? selectedAgent.label)[0]}
                </span>
                <span className="text-[14px] font-semibold">
                  {selectedAgent.storeName ?? selectedAgent.label}
                </span>
                {selectedAgent.username && (
                  <span className="text-muted-foreground font-mono text-[13px] font-semibold">
                    @{selectedAgent.username}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-muted-foreground mb-1.5 block text-[12px] font-extrabold tracking-[0.06em] uppercase">
            권종
          </label>
          <div className="relative">
            <select
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="border-border focus:border-ticketa-blue-500 h-11 w-full appearance-none rounded-[10px] border bg-white px-3 text-[14px] font-semibold outline-none"
            >
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {shortBrandLabel(s.brand)} {s.denomination.toLocaleString('ko-KR')}원권
                </option>
              ))}
            </select>
            {selectedSku && (
              <div className="pointer-events-none absolute top-1/2 left-3 hidden -translate-y-1/2 items-center gap-2 bg-white pr-1 md:flex">
                <SkuMark sku={selectedSku} size={22} />
                <span className="text-[14px] font-semibold">
                  {shortBrandLabel(selectedSku.brand)}{' '}
                  {selectedSku.denomination.toLocaleString('ko-KR')}원권
                </span>
                {selectedSku.code && (
                  <span className="text-muted-foreground font-mono text-[13px] font-semibold">
                    {selectedSku.code}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-[18px] grid gap-3.5 md:grid-cols-2">
        <div>
          <label className="text-muted-foreground mb-1.5 block text-[12px] font-extrabold tracking-[0.06em] uppercase">
            수량
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="border-border hover:bg-warm-50 size-11 cursor-pointer rounded-[10px] border bg-white text-[18px] font-bold"
              aria-label="감소"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={10000}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
              className="border-border focus:border-ticketa-blue-500 h-11 flex-1 rounded-[10px] border bg-white px-3 text-center text-[18px] font-extrabold tabular-nums outline-none"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(10000, q + 1))}
              className="border-border hover:bg-warm-50 size-11 cursor-pointer rounded-[10px] border bg-white text-[18px] font-bold"
              aria-label="증가"
            >
              ＋
            </button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {QUICK_QTY.map((q) => {
              const active = qty === q;
              return (
                <button
                  type="button"
                  key={q}
                  onClick={() => setQty(q)}
                  className="h-[30px] flex-1 cursor-pointer rounded-[7px] border text-[13px] font-extrabold tabular-nums"
                  style={{
                    borderColor: active ? 'var(--ticketa-blue-500)' : 'var(--border)',
                    background: active ? 'rgba(91,163,208,0.08)' : 'white',
                    color: active ? 'var(--ticketa-blue-500)' : 'var(--foreground)',
                  }}
                >
                  {q}매
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            className="text-muted-foreground mb-1.5 block text-[12px] font-extrabold tracking-[0.06em] uppercase"
            title="에이전트가 매당 받는 정산 단가. 판매가 완료되면 이 금액으로 마일리지가 정산돼요."
          >
            정산 단가
          </label>
          <div className="relative h-11">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-bold">
              ₩
            </span>
            <input
              type="number"
              min={0}
              step={100}
              value={unitCost || ''}
              onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value) || 0))}
              placeholder="예) 47200"
              className="border-border focus:border-ticketa-blue-500 h-11 w-full rounded-[10px] border bg-white py-0 pr-[88px] pl-8 text-[18px] font-extrabold tabular-nums outline-none"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[12px] font-extrabold tracking-[0.04em]">
              STEP 100원
            </span>
          </div>
          <div className="text-muted-foreground mt-1.5 text-[13px] tabular-nums">
            액면 {face.toLocaleString('ko-KR')}원
            {unitCost > 0 && face > 0 && (
              <>
                {' · '}
                <span style={{ color: discountPct >= 0 ? '#1F6B43' : 'var(--destructive)' }}>
                  할인율 {discountPct >= 0 ? '−' : '+'}
                  {Math.abs(discountPct).toFixed(1)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BEFORE / AFTER 미리보기 */}
      <PreviewCard matched={matchedRow} addingQty={qty} />

      {/* 총 적재가 */}
      <div
        className="flex items-center gap-3.5 rounded-[10px] px-4 py-3.5 text-white"
        style={{ background: '#11161E' }}
      >
        <div className="text-[12px] font-extrabold tracking-[0.08em] text-white/60 uppercase">
          총 적재가
        </div>
        <div className="ml-auto flex items-baseline gap-1.5 tabular-nums">
          <span className="text-[14px] text-white/60">
            {qty.toLocaleString('ko-KR')}매 × {unitCost.toLocaleString('ko-KR')}원 =
          </span>
          <span className="text-[24px] font-black tracking-[-0.02em]">
            {(qty * unitCost).toLocaleString('ko-KR')}
            <span className="ml-1 text-[14px] font-bold text-white/70">원</span>
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setQty(30);
            setUnitCost(0);
          }}
          className="border-border hover:bg-warm-50 inline-flex h-10 cursor-pointer items-center rounded-[10px] border bg-white px-4 text-[14px] font-bold"
        >
          초기화
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-ticketa-blue-500 inline-flex h-11 cursor-pointer items-center rounded-[10px] px-5 text-[14px] font-extrabold text-white disabled:opacity-50"
        >
          {pending ? '적재 중…' : '적재 처리'}
        </button>
      </div>
    </form>
  );
}

function PreviewCard({
  matched,
  addingQty,
}: {
  matched: ExistingInventoryRow | null;
  addingQty: number;
}) {
  if (!matched) {
    return (
      <div className="border-border bg-warm-50 mb-4 rounded-[10px] border border-dashed p-3.5">
        <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
          <R2Pill tone="neutral">새로 추가</R2Pill>
          <span>
            같은 조건의 위탁 재고가 없어서 새로 등록돼요. 같은 에이전트·권종·단가로 다시 입고하면 이
            재고에 자동 합산됩니다.
          </span>
        </div>
      </div>
    );
  }

  const before = matched.qty_available;
  const after = before + addingQty;

  return (
    <div
      className="mb-4 rounded-[10px] p-3.5"
      style={{
        background: 'rgba(91,163,208,0.06)',
        border: '1px dashed var(--ticketa-blue-500)',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <R2Pill tone="progress">기존 재고에 합산</R2Pill>
        <span className="text-muted-foreground text-[13px]">
          같은 에이전트 · 권종 · 단가의 위탁 재고가 이미 있어서, 보유 수량에 더해져요.
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3.5 tabular-nums">
        <div className="border-border rounded-[8px] border bg-white p-2.5">
          <div className="text-muted-foreground text-[12px] font-extrabold tracking-[0.08em] uppercase">
            BEFORE
          </div>
          <div className="text-[18px] font-extrabold">
            {before.toLocaleString('ko-KR')}
            <span className="text-muted-foreground ml-0.5 text-[13px] font-bold">매</span>
          </div>
        </div>
        <div className="text-[20px] font-extrabold" style={{ color: 'var(--ticketa-blue-500)' }}>
          →
        </div>
        <div
          className="rounded-[8px] border bg-white p-2.5"
          style={{ borderColor: 'var(--ticketa-blue-500)' }}
        >
          <div
            className="text-[12px] font-extrabold tracking-[0.08em] uppercase"
            style={{ color: 'var(--ticketa-blue-500)' }}
          >
            AFTER · +{addingQty.toLocaleString('ko-KR')}매
          </div>
          <div className="text-[18px] font-extrabold">
            {after.toLocaleString('ko-KR')}
            <span className="text-muted-foreground ml-0.5 text-[13px] font-bold">매</span>
          </div>
        </div>
      </div>
      {matched.qty_reserved > 0 && (
        <div className="text-muted-foreground mt-2 text-[12px] tabular-nums">
          · 현재 판매중 {matched.qty_reserved.toLocaleString('ko-KR')}매 (영향 없음)
        </div>
      )}
    </div>
  );
}
