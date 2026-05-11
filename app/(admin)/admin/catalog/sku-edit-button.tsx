'use client';

import * as React from 'react';
import { SkuFormModal } from '@/components/admin/sku-form-modal';

export type SkuEditTarget = {
  id: string;
  brand: string;
  denomination: number;
  display_order: number;
  is_active: boolean;
  commission_type: 'fixed' | 'percent';
  commission_amount: number;
  commission_charged_to: 'seller' | 'buyer' | 'both';
};

export function SkuEditButton({ sku }: { sku: SkuEditTarget }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:bg-warm-50 inline-flex h-8 cursor-pointer items-center justify-center rounded-[10px] border bg-white px-3 text-[13px] font-bold"
      >
        편집
      </button>
      {open && <SkuFormModal onClose={() => setOpen(false)} editTarget={sku} />}
    </>
  );
}
