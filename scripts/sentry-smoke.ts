// CI 배포 후 실행. Sentry.captureMessage('deployment-smoke-test-{gitSha}') 후
// Sentry REST API (GET /projects/{org}/{project}/events/)로 2초 간격 × 30초 polling
// 같은 gitSha 메시지 발견 시 exit 0, 타임아웃 시 exit 1
const TOKEN = process.env.SENTRY_AUTH_TOKEN;
const ORG = process.env.SENTRY_ORG;
const PROJECT = process.env.SENTRY_PROJECT;
const GIT_SHA = process.env.GIT_SHA || 'unknown';
const MESSAGE = `deployment-smoke-test-${GIT_SHA}`;
const TIMEOUT_MS = 30_000;
const POLL_INTERVAL = 2_000;

async function pollForEvent() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${ORG}/${PROJECT}/events/?query=${encodeURIComponent(MESSAGE)}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );
    if (res.ok) {
      const events = (await res.json()) as unknown[];
      if (Array.isArray(events) && events.length > 0) {
        console.log(`[sentry-smoke] event found: ${MESSAGE}`);
        process.exit(0);
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  console.error(`[sentry-smoke] timeout: event not found within ${TIMEOUT_MS}ms`);
  process.exit(1);
}

if (!TOKEN || !ORG || !PROJECT) {
  console.warn('[sentry-smoke] env missing, skipping');
  process.exit(0);
}

void pollForEvent();
