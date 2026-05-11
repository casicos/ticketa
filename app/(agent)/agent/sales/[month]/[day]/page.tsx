import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/guards';
import { DesktopAgentSalesDaily } from '@/components/agent/desktop-sales-daily';
import { MobileAgentSalesDaily } from '@/components/agent/mobile-sales-daily';

// TODO: backend wiring — needs agent_sales_daily view or query on listings table
//   (see components/agent/desktop-sales-daily.tsx for full schema notes)
// TODO: backend wiring — needs top_sku_by_day sub-query
// All data is static stub placeholder.

interface Props {
  params: Promise<{ month: string; day: string }>;
}

export default async function AgentSalesDailyPage({ params }: Props) {
  await getCurrentUser();

  const { month, day } = await params;

  // Validate month format YYYY-MM and day 1-31
  if (!/^\d{4}-\d{2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    notFound();
  }

  return (
    <>
      <DesktopAgentSalesDaily month={month} day={day} className="hidden md:block" />
      <MobileAgentSalesDaily month={month} day={day} className="md:hidden" />
    </>
  );
}
