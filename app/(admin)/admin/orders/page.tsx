import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Deprecated: Wave 1/2 리팩터로 주문 플로우가 마일리지 기반 거래로 이관되었습니다.
 * 기존 orders/order_items 테이블은 보존되지만, 운영은 /admin/intake 와 /admin/mileage 에서 수행합니다.
 * 이 페이지 파일은 라우트 유지를 위해 placeholder 로 남겨둡니다.
 */
export default function DeprecatedAdminOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6 sm:px-8 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin">
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          어드민
        </Link>
      </Button>

      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">주문 관리 (Deprecated)</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Wave 1/2 리팩터로 이동됐어요. 아래 페이지에서 해당 업무를 진행해주세요.
        </p>
      </header>

      <section className="surface-card p-5 sm:p-6">
        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          <li>수탁·매물 전이: 수탁 관리</li>
          <li>충전 승인 / 출금 처리: 마일리지 관리</li>
          <li>거래 취소: 취소 요청</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/intake">수탁 관리</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/mileage">마일리지</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/cancellations">취소 요청</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
