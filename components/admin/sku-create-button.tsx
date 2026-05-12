'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SkuFormModal } from '@/components/admin/sku-form-modal';

/**
 * 카탈로그 페이지 상단의 "SKU 추가" 트리거.
 * 기존 SkuFormModal 은 onClose 필수이므로 열기/닫기 상태를 감싸서 사용한다.
 */
export function SkuCreateButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 권종 추가</Button>
      {open && <SkuFormModal onClose={() => setOpen(false)} />}
    </>
  );
}
