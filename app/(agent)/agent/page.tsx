import { AdminPageHead, AdminKpi } from '@/components/admin/admin-shell';

export default function AgentDashboardPage() {
  return (
    <>
      <AdminPageHead
        title="에이전트 대시보드"
        sub="위탁 재고·주문·매출 현황 — 데이터는 곧 연동돼요"
      />
      <div className="grid grid-cols-4 gap-3">
        <AdminKpi l="진행 중 주문" v="—" d="준비 중" tone="warn" />
        <AdminKpi l="위탁 재고" v="—" d="준비 중" tone="warn" />
        <AdminKpi l="이번 달 매출" v="—" d="준비 중" tone="warn" />
        <AdminKpi l="대기 정산" v="—" d="준비 중" tone="warn" />
      </div>
      <div className="border-border text-muted-foreground mt-6 rounded-xl border bg-white p-8 text-center text-[15px]">
        에이전트 워크플로우는 곧 제공돼요. 좌측 메뉴에서 각 영역을 미리 둘러볼 수 있어요.
      </div>
    </>
  );
}
