import { getCurrentUser } from '@/lib/auth/guards';
import { DesktopAgentInbound } from '@/components/agent/desktop-inbound';
import { MobileAgentInbound } from '@/components/agent/mobile-inbound';

// TODO: backend wiring — needs agent_inbound_requests table
//   (see components/agent/desktop-inbound.tsx for full schema notes)
// TODO: backend wiring — needs submit_inbound_request RPC
// TODO: backend wiring — needs admin approval workflow (/admin/intake/inbound)
// All form data is static stub placeholder.

export default async function AgentInboundPage() {
  // getCurrentUser for potential future personalization (agent name in header etc.)
  await getCurrentUser();

  return (
    <>
      <DesktopAgentInbound className="hidden md:block" />
      <MobileAgentInbound className="md:hidden" />
    </>
  );
}
