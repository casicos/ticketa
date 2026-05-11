import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDisputesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6 sm:px-8 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin">
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          어드민
        </Link>
      </Button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">분쟁 중재</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">v2 마일스톤 예정 기능</p>
      </header>

      <div className="surface-card p-8 text-center">
        <div className="bg-muted mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
          <span className="text-2xl">🔧</span>
        </div>
        <h2 className="mb-2 text-lg font-bold">v1 출시 범위에서 제외</h2>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          분쟁은 현재 운영팀이 직접 처리하고 있습니다. 자동화된 분쟁 중재 기능은 v2 마일스톤에서
          제공될 예정입니다.
        </p>
        <div className="border-border bg-muted/40 mt-6 rounded-lg border p-4 text-left text-sm">
          <p className="text-foreground mb-1 font-bold">취소 요청 처리가 필요하신가요?</p>
          <p className="text-muted-foreground">
            판매자·구매자의 취소 요청은{' '}
            <Link
              href="/admin/cancellations"
              className="text-ticketa-blue-600 font-semibold underline underline-offset-2"
            >
              취소 요청 관리
            </Link>
            에서 승인 또는 반려하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
