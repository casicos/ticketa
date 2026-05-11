import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditEventInput = {
  actor_id: string | null;
  entity_type:
    | 'user_role'
    | 'sku'
    | 'listing'
    | 'order'
    | 'order_item'
    | 'payout'
    | 'agent_inventory'
    | 'gift'
    | 'system';
  entity_id: string;
  event: string;
  from_state?: string | null;
  to_state?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * audit_events insert 공용 함수.
 * ssr 서버 클라이언트(auth.uid() 보유) 로는 RLS(audit_admin_only) 때문에 차단되는 경우가 많음.
 * → RPC 함수 `insert_audit_event` (SECURITY DEFINER) 를 만들고, 여기서 service-role 이 아니더라도
 * SECURITY DEFINER 권한으로 audit_events 에 insert. actor_id 는 auth.uid() 기본.
 */
export async function insertAuditEvent(
  supabase: SupabaseClient,
  input: AuditEventInput,
): Promise<void> {
  const { error } = await supabase.rpc('insert_audit_event', {
    p_actor_id: input.actor_id,
    p_entity_type: input.entity_type,
    p_entity_id: input.entity_id,
    p_event: input.event,
    p_from_state: input.from_state ?? null,
    p_to_state: input.to_state ?? null,
    p_metadata: (input.metadata ?? {}) as never,
  });
  if (error) {
    // 감사 로그 실패는 비즈니스 로직을 막지 않지만 error_log 에 남긴다.
    console.error('[audit_events] insert failed:', error.message, input);
  }
}
