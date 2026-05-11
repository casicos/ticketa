import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminPageHead } from '@/components/admin/admin-shell';
import { R2BtnGhost } from '@/components/admin/r2';
import { shortId } from '@/lib/format';

// TODO: 필터 와이어링 (기간/엔티티/액터/검색) — 다음 단계
// TODO: 메타데이터 펼치기 client 컴포넌트
// TODO: 이전 이벤트 더 보기 — pagination

type AuditEventRow = {
  id: number;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  event: string;
  from_state: string | null;
  to_state: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; username: string | null; email: string | null } | null;
};

// 이벤트 카테고리 → 색상 + 라벨 매핑
type Kind = 'tx' | 'mileage' | 'cancel' | 'inspect' | 'security' | 'system';

const KIND_COLOR: Record<Kind, string> = {
  tx: 'var(--ticketa-blue-500)',
  mileage: '#8C6321',
  cancel: '#C0625A',
  inspect: '#1F6B43',
  security: '#7B2D8E',
  system: '#74695C',
};

const KIND_LABEL: Record<Kind, string> = {
  tx: '거래',
  mileage: '마일리지',
  cancel: '취소',
  inspect: '검수',
  security: '보안',
  system: '시스템',
};

function classifyEvent(event: string, entityType: string): Kind {
  const e = event.toLowerCase();
  if (e.includes('purchase') || e.includes('buy') || e.includes('list')) return 'tx';
  if (e.includes('mileage') || e.includes('charge') || e.includes('withdraw')) return 'mileage';
  if (e.includes('cancel') || e.includes('refund')) return 'cancel';
  if (
    e.includes('verify') ||
    e.includes('ship') ||
    e.includes('intake') ||
    e.includes('receiv') ||
    e.includes('handover') ||
    e.includes('consign')
  )
    return 'inspect';
  if (
    e.includes('role') ||
    e.includes('grant') ||
    e.includes('revoke') ||
    entityType === 'user_role'
  )
    return 'security';
  return 'system';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - eventDay.getTime()) / (24 * 60 * 60 * 1000));
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  if (diffDays === 0) return `오늘 · ${md} (${weekday})`;
  if (diffDays === 1) return `어제 · ${md} (${weekday})`;
  return `${md} (${weekday})`;
}

function actorLabel(row: AuditEventRow): string {
  if (!row.actor) return '시스템';
  return row.actor.username
    ? `@${row.actor.username}`
    : (row.actor.full_name ?? row.actor.email ?? '시스템');
}

export default async function AdminAuditPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('audit_events')
    .select(
      'id, actor_id, entity_type, entity_id, event, from_state, to_state, metadata, created_at, actor:actor_id(full_name, username, email)',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as AuditEventRow[];

  // 날짜별 그룹
  const groups: { date: string; items: AuditEventRow[] }[] = [];
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let g = groups.find((x) => x.date === key);
    if (!g) {
      g = { date: key, items: [] };
      groups.push(g);
    }
    g.items.push(r);
  }

  return (
    <>
      <AdminPageHead title="감사 로그" sub="audit_events — 모든 상태 변경 및 중요 액션 추적" />

      {/* Filter bar (placeholder) */}
      <div className="border-border mb-4 flex flex-wrap items-center gap-2.5 rounded-[12px] border bg-white p-3.5">
        <div className="bg-warm-100 flex gap-0.5 rounded-[8px] p-[3px]">
          {['오늘', '7일', '30일', '직접'].map((p, i) => (
            <button
              key={p}
              type="button"
              disabled
              className="h-8 cursor-not-allowed rounded-[6px] px-3 text-[12px] font-extrabold disabled:opacity-90"
              style={{
                background: i === 0 ? '#fff' : 'transparent',
                color: i === 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="border-border bg-warm-50 flex h-8 min-w-[240px] flex-1 items-center gap-2 rounded-[8px] border px-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.35-4.35" />
          </svg>
          <input
            disabled
            placeholder="이벤트 검색 (purchase, cancel, role.grant …)"
            className="placeholder:text-muted-foreground flex-1 border-0 bg-transparent text-[13px] outline-none disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          disabled
          className="border-border inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[8px] border bg-white px-3 text-[12px] font-bold disabled:opacity-80"
        >
          <span className="text-muted-foreground">엔티티</span>
          <span className="font-extrabold">전체</span>▾
        </button>
        <button
          type="button"
          disabled
          className="border-border inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[8px] border bg-white px-3 text-[12px] font-bold disabled:opacity-80"
        >
          <span className="text-muted-foreground">액터</span>
          <span className="font-extrabold">전체</span>▾
        </button>
      </div>

      {/* Color legend */}
      <div className="text-muted-foreground mb-3.5 flex flex-wrap gap-3.5 text-[11px]">
        {(['tx', 'mileage', 'cancel', 'inspect', 'security'] as Kind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: KIND_COLOR[k] }} />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="border-border rounded-[12px] border bg-white px-5 pt-1 pb-5">
        {groups.length === 0 ? (
          <div className="text-muted-foreground px-4 py-10 text-center text-[14px]">
            감사 로그가 비어있어요.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              <div className="border-warm-100 text-muted-foreground sticky top-0 z-10 border-b bg-white py-3.5 text-[11px] font-extrabold tracking-[0.08em] uppercase">
                {dateGroupLabel(group.items[0]!.created_at)}
              </div>
              {group.items.map((ev, i) => {
                const kind = classifyEvent(ev.event, ev.entity_type);
                const color = KIND_COLOR[kind];
                return (
                  <div
                    key={ev.id}
                    className="grid grid-cols-[72px_1fr] gap-3.5 py-3.5"
                    style={{
                      borderBottom:
                        i < group.items.length - 1 ? '1px dashed var(--warm-100)' : 'none',
                    }}
                  >
                    <div className="relative pr-4 text-right">
                      <div className="font-mono text-[13px] font-extrabold tabular-nums">
                        {formatTime(ev.created_at)}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-[11px]">
                        {actorLabel(ev)}
                      </div>
                      <span
                        className="absolute top-[6px] right-0 size-2.5 rounded-full border-2 border-white"
                        style={{ background: color, boxShadow: `0 0 0 2px ${color}40` }}
                      />
                    </div>
                    <div
                      className="bg-warm-50 rounded-[10px] px-4 py-3"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2.5">
                        <span
                          className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.06em] text-white"
                          style={{ background: color }}
                        >
                          {KIND_LABEL[kind]}
                        </span>
                        <span className="font-mono text-[13px] font-extrabold">
                          {ev.entity_type}.{ev.event}
                        </span>
                        {(ev.from_state || ev.to_state) && (
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px]">
                            {ev.from_state && (
                              <span className="border-border rounded-[4px] border bg-white px-1.5 py-0.5 font-mono">
                                {ev.from_state}
                              </span>
                            )}
                            <span>→</span>
                            <span
                              className="rounded-[4px] border bg-white px-1.5 py-0.5 font-mono font-extrabold"
                              style={{ borderColor: color, color }}
                            >
                              {ev.to_state ?? '—'}
                            </span>
                          </span>
                        )}
                        {ev.entity_id && (
                          <span
                            className="ml-auto font-mono text-[12px] font-extrabold"
                            style={{ color: 'var(--ticketa-blue-500)' }}
                          >
                            {shortId(ev.entity_id)}
                          </span>
                        )}
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <details>
                          <summary className="text-muted-foreground cursor-pointer text-[11px] font-bold select-none">
                            메타데이터 펼치기
                          </summary>
                          <pre
                            className="mt-2 overflow-x-auto rounded-[6px] p-2.5 font-mono text-[12px] leading-[1.5]"
                            style={{ background: '#11161E', color: '#A7E1B5' }}
                          >
                            {JSON.stringify(ev.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {rows.length > 0 && (
          <div className="mt-3.5 text-center">
            <R2BtnGhost sm disabled>
              이전 이벤트 더 보기
            </R2BtnGhost>
          </div>
        )}
      </div>
    </>
  );
}
