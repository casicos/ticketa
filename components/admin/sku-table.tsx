'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { toggleSkuActiveAction } from '@/app/(admin)/admin/catalog/actions';
import { SkuFormModal } from '@/components/admin/sku-form-modal';

type SkuRow = {
  id: string;
  brand: string;
  denomination: number;
  display_name: string;
  display_order: number;
  is_active: boolean;
  commission_type?: 'fixed' | 'percent';
  commission_amount?: number;
  commission_charged_to?: 'seller' | 'buyer' | 'both';
};

function formatCommission(row: SkuRow): string {
  const type = row.commission_type ?? 'fixed';
  const amount = row.commission_amount ?? 0;
  const chargedTo = row.commission_charged_to ?? 'seller';
  const chargedLabel =
    chargedTo === 'seller' ? '판매자' : chargedTo === 'buyer' ? '구매자' : '분담';
  if (type === 'percent') {
    return `${(amount / 100).toFixed(2)}% · ${chargedLabel}`;
  }
  return `${amount.toLocaleString('ko-KR')}원 · ${chargedLabel}`;
}

type Props = {
  skus: SkuRow[];
};

export function SkuTable({ skus }: Props) {
  const [editTarget, setEditTarget] = React.useState<SkuRow | null>(null);
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [toggleError, setToggleError] = React.useState<string | null>(null);

  async function handleToggle(sku: SkuRow) {
    setToggling(sku.id);
    setToggleError(null);
    try {
      const fd = new FormData();
      fd.set('id', sku.id);
      fd.set('is_active', String(!sku.is_active));
      const result = await toggleSkuActiveAction(fd);
      if (!result.ok) {
        setToggleError(result.message ?? result.code);
      }
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      {toggleError && (
        <p className="border-destructive/40 bg-destructive/10 text-destructive mb-2 rounded-lg border px-3 py-2 text-sm">
          {toggleError}
        </p>
      )}

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/40 border-b text-left">
              <th className="text-muted-foreground px-4 py-3 font-medium">브랜드</th>
              <th className="text-muted-foreground px-4 py-3 font-medium">액면가</th>
              <th className="text-muted-foreground px-4 py-3 font-medium">노출 순서</th>
              <th className="text-muted-foreground px-4 py-3 font-medium">수수료</th>
              <th className="text-muted-foreground px-4 py-3 font-medium">활성</th>
              <th className="text-muted-foreground px-4 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {skus.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                  등록된 SKU가 없습니다
                </td>
              </tr>
            )}
            {skus.map((sku) => (
              <tr key={sku.id} className="border-border hover:bg-muted/20 border-b last:border-0">
                <td className="px-4 py-3 font-medium">{sku.brand}</td>
                <td className="px-4 py-3 tabular-nums">
                  {sku.denomination.toLocaleString('ko-KR')}원
                </td>
                <td className="text-muted-foreground px-4 py-3 tabular-nums">
                  {sku.display_order}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-sm tabular-nums">
                  {formatCommission(sku)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      sku.is_active
                        ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }
                  >
                    {sku.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditTarget(sku)}>
                      수정
                    </Button>
                    <span
                      title={sku.is_active ? '비활성화하면 새 판매 등록에서 선택 불가' : undefined}
                    >
                      <Button
                        size="sm"
                        variant={sku.is_active ? 'destructive' : 'secondary'}
                        disabled={toggling === sku.id}
                        onClick={() => handleToggle(sku)}
                      >
                        {toggling === sku.id ? '처리 중...' : sku.is_active ? '비활성화' : '활성화'}
                      </Button>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && <SkuFormModal editTarget={editTarget} onClose={() => setEditTarget(null)} />}
    </>
  );
}
