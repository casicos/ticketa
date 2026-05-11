import {
  LISTING_STATUS_LABELS,
  LISTING_STATUS_ORDER,
  LISTING_STATUS_STEP_HINTS,
  listingStepIndex,
  type ListingStatus,
  type ListingStepStatus,
} from '@/lib/domain/listings';
import { formatDateTime } from '@/lib/format';

export type ListingTimelineTimestamps = {
  submittedAt?: string | null;
  purchasedAt?: string | null;
  handedOverAt?: string | null;
  receivedAt?: string | null;
  verifiedAt?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
};

type StepDot = {
  status: ListingStatus;
  label: string;
  hint: string;
  ts: string | null | undefined;
  state: 'filled' | 'current' | 'outlined';
};

function buildSteps(status: ListingStatus, timestamps: ListingTimelineTimestamps): StepDot[] {
  const currentIdx = listingStepIndex(status);
  const tsMap: Record<ListingStepStatus, string | null | undefined> = {
    submitted: timestamps.submittedAt,
    purchased: timestamps.purchasedAt,
    handed_over: timestamps.handedOverAt,
    received: timestamps.receivedAt,
    verified: timestamps.verifiedAt,
    shipped: timestamps.shippedAt,
    completed: timestamps.completedAt,
  };
  return LISTING_STATUS_ORDER.map((s, idx) => {
    let state: StepDot['state'];
    if (status === 'cancelled') {
      // 취소된 경우: 진행된 단계(타임스탬프 존재)는 filled, 나머지는 outlined
      state = tsMap[s] ? 'filled' : 'outlined';
    } else if (idx < currentIdx) {
      state = 'filled';
    } else if (idx === currentIdx) {
      state = 'current';
    } else {
      state = 'outlined';
    }
    return {
      status: s,
      label: LISTING_STATUS_LABELS[s],
      hint: LISTING_STATUS_STEP_HINTS[s],
      ts: tsMap[s],
      state,
    };
  });
}

type Props = {
  status: ListingStatus;
  timestamps: ListingTimelineTimestamps;
  cancelReason?: string | null;
};

/**
 * listing 6단계 타임라인 (판매자·구매자·어드민 공용).
 *
 * - mobile: 세로 stepper (점 + 세로선)
 * - desktop(sm+): 가로 stepper (점 + 가로선)
 * - cancelled 면 하단에 빨간 배너로 "거래 취소됨" + 사유 표시.
 */
export function ListingTimeline({ status, timestamps, cancelReason }: Props) {
  const steps = buildSteps(status, timestamps);
  const cancelled = status === 'cancelled';

  return (
    <div className="flex flex-col gap-4">
      {/* mobile vertical */}
      <ol className="flex flex-col gap-0 sm:hidden">
        {steps.map((step, idx) => (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Dot state={step.state} />
              {idx < steps.length - 1 && (
                <div
                  className={[
                    'min-h-8 w-px flex-1',
                    step.state === 'filled' ? 'bg-primary' : 'bg-border',
                  ].join(' ')}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col pb-4">
              <span
                className={[
                  'text-sm font-medium',
                  step.state === 'outlined' ? 'text-muted-foreground' : 'text-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
              <span className="text-muted-foreground text-xs">{step.hint}</span>
              {step.ts && (
                <span className="text-muted-foreground mt-0.5 text-xs">
                  {formatDateTime(step.ts)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* desktop horizontal */}
      <ol className="hidden sm:grid sm:grid-cols-7 sm:gap-2">
        {steps.map((step, idx) => (
          <li key={step.status} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div
                className={[
                  'h-px flex-1',
                  idx === 0
                    ? 'bg-transparent'
                    : steps[idx - 1]?.state === 'filled' ||
                        step.state === 'filled' ||
                        step.state === 'current'
                      ? 'bg-primary'
                      : 'bg-border',
                ].join(' ')}
              />
              <Dot state={step.state} />
              <div
                className={[
                  'h-px flex-1',
                  idx === steps.length - 1
                    ? 'bg-transparent'
                    : step.state === 'filled'
                      ? 'bg-primary'
                      : 'bg-border',
                ].join(' ')}
              />
            </div>
            <span
              className={[
                'mt-2 text-sm font-medium',
                step.state === 'outlined' ? 'text-muted-foreground' : 'text-foreground',
              ].join(' ')}
            >
              {step.label}
            </span>
            <span className="text-muted-foreground text-xs">{step.hint}</span>
            {step.ts && (
              <span className="text-muted-foreground mt-0.5 text-[12px]">
                {formatDateTime(step.ts)}
              </span>
            )}
          </li>
        ))}
      </ol>

      {cancelled && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
          <p className="font-semibold">
            거래 취소됨
            {timestamps.cancelledAt && (
              <span className="ml-2 text-xs font-normal">
                {formatDateTime(timestamps.cancelledAt)}
              </span>
            )}
          </p>
          {cancelReason && <p className="mt-1 text-xs">사유: {cancelReason}</p>}
        </div>
      )}
    </div>
  );
}

function Dot({ state }: { state: StepDot['state'] }) {
  const base = 'size-3 shrink-0 rounded-full border-2';
  if (state === 'filled') {
    return <span className={`${base} border-primary bg-primary`} />;
  }
  if (state === 'current') {
    return <span className={`${base} border-primary bg-primary ring-primary/30 ring-2`} />;
  }
  return <span className={`${base} border-border bg-background`} />;
}
