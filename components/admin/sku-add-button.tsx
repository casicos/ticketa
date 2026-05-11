'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SkuFormModal } from '@/components/admin/sku-form-modal';

export function SkuAddButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ SKU 추가</Button>
      {open && <SkuFormModal onClose={() => setOpen(false)} />}
    </>
  );
}
