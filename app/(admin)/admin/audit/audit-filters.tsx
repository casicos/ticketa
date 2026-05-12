'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

type Props = {
  entityTypes: readonly string[];
  currentType: string;
  currentEntityId: string;
};

export function AuditFilters({ entityTypes, currentType, currentEntityId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (type: string, entityId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    if (entityId.trim()) {
      params.set('entity_id', entityId.trim());
    } else {
      params.delete('entity_id');
    }
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(e.target.value, inputRef.current?.value ?? '');
  };

  const handleEntityIdSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate(currentType, inputRef.current?.value ?? '');
  };

  const labelMap: Record<string, string> = {
    all: '전체',
    order: 'order',
    listing: 'listing',
    order_item: 'order_item',
    payout: 'payout',
    user_role: 'user_role',
    sku: 'sku',
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Entity Type 드롭다운 */}
      <div className="flex flex-col gap-1">
        <label htmlFor="audit-type-filter" className="text-muted-foreground text-xs">
          Entity Type
        </label>
        <select
          id="audit-type-filter"
          value={currentType}
          onChange={handleTypeChange}
          className="border-border bg-background focus:ring-ring h-9 rounded-md border px-2.5 py-1 text-sm focus:ring-2 focus:outline-none"
          data-testid="audit-type-filter"
        >
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {labelMap[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* Entity ID 검색 */}
      <form onSubmit={handleEntityIdSubmit} className="flex flex-col gap-1">
        <label htmlFor="audit-entity-id" className="text-muted-foreground text-xs">
          Entity ID (UUID)
        </label>
        <div className="flex gap-1.5">
          <input
            id="audit-entity-id"
            ref={inputRef}
            type="text"
            defaultValue={currentEntityId}
            placeholder="UUID 입력..."
            className="border-border bg-background placeholder:text-muted-foreground/50 focus:ring-ring h-9 w-64 rounded-md border px-2.5 py-1 font-mono text-sm focus:ring-2 focus:outline-none"
            data-testid="audit-entity-id-input"
          />
          <button
            type="submit"
            className="border-border bg-foreground text-background h-9 rounded-md border px-3 text-sm font-medium hover:opacity-80"
          >
            검색
          </button>
          {currentEntityId && (
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = '';
                navigate(currentType, '');
              }}
              className="border-border text-muted-foreground hover:bg-muted h-9 rounded-md border px-3 text-sm"
            >
              초기화
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
