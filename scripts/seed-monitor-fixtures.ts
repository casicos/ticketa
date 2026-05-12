/**
 * Monitor 페이지 시각 검증용 fixture 시드.
 * 6 단계 각각에 대해 listing 1건씩 backdate된 timestamp로 직접 insert.
 * - submitted / purchased / handed_over / received / verified / shipped (정체 SLA 초과)
 * + handed_over / received / verified / shipped 1건씩 정상 상태 (정체 아님)
 *
 * 주의: RPC(purchase_listing 등)를 우회하므로 마일리지 차감/적립 등 사이드 이펙트는
 * 발생하지 않음. 모니터 화면 시각 검증 전용.
 *
 * Usage: pnpm dlx tsx scripts/seed-monitor-fixtures.ts
 *
 * 멱등: 같은 prefix (MONFIX-) 매물이 이미 있으면 skip.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env', override: false });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}

const SELLER = {
  email: 'monfixseller@ticketa.local',
  username: 'monfixseller',
  password: 'MonFix!2026',
  phone: '+821000000098',
  full_name: '시드 판매자',
};
const BUYER = {
  email: 'monfixbuyer@ticketa.local',
  username: 'monfixbuyer',
  password: 'MonFix!2026',
  phone: '+821000000097',
  full_name: '시드 구매자',
};

const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(u: typeof SELLER): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.users.find((x) => x.email === u.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username, full_name: u.full_name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  user 생성: ${u.email}`);
  }
  if (!user) throw new Error('user create failed');
  await admin
    .from('users')
    .update({
      username: u.username,
      full_name: u.full_name,
      phone: u.phone,
      phone_verified: true,
    })
    .eq('id', user.id);
  return user.id;
}

async function pickSku(brand: string, denomination: number): Promise<string> {
  const { data, error } = await admin
    .from('sku')
    .select('id')
    .eq('brand', brand)
    .eq('denomination', denomination)
    .eq('is_active', true)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!data) throw new Error(`SKU 없음: ${brand} ${denomination}`);
  return data.id;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

type FixtureSpec = {
  label: string;
  brand: string;
  denomination: number;
  status: 'submitted' | 'purchased' | 'handed_over' | 'received' | 'verified' | 'shipped';
  /** SLA 정체 anchor 와 backdate 시간 (시) */
  backdate?: {
    purchased?: number;
    handed_over?: number;
    received?: number;
    verified?: number;
    shipped?: number;
  };
  stuck: boolean; // 정체 SLA 초과 여부 (라벨용)
};

const FIXTURES: FixtureSpec[] = [
  // 정체 매물 (각 단계 SLA 초과)
  {
    label: 'submitted 정체',
    brand: '롯데백화점',
    denomination: 50000,
    status: 'submitted',
    stuck: true,
  },
  {
    label: 'purchased 정체 — handed_over 대기',
    brand: 'AK백화점',
    denomination: 50000,
    status: 'purchased',
    backdate: { purchased: 30 },
    stuck: true,
  },
  {
    label: 'handed_over 정체 — received 대기',
    brand: '현대백화점',
    denomination: 50000,
    status: 'handed_over',
    backdate: { purchased: 35, handed_over: 30 },
    stuck: true,
  },
  {
    label: 'received 정체 — 검수 지연',
    brand: '신세계백화점',
    denomination: 50000,
    status: 'received',
    backdate: { purchased: 40, handed_over: 32, received: 18 },
    stuck: true,
  },
  {
    label: 'verified 정체 — 발송 대기',
    brand: '갤러리아백화점',
    denomination: 50000,
    status: 'verified',
    backdate: { purchased: 60, handed_over: 50, received: 30, verified: 18 },
    stuck: true,
  },
  {
    label: 'shipped 정체 — 인수 대기',
    brand: '롯데백화점',
    denomination: 100000,
    status: 'shipped',
    backdate: {
      purchased: 100,
      handed_over: 90,
      received: 80,
      verified: 78,
      shipped: 80,
    },
    stuck: true,
  },
  // 정상 매물 (정체 아님)
  {
    label: 'handed_over 정상',
    brand: 'AK백화점',
    denomination: 100000,
    status: 'handed_over',
    backdate: { purchased: 5, handed_over: 2 },
    stuck: false,
  },
  {
    label: 'received 정상',
    brand: '현대백화점',
    denomination: 100000,
    status: 'received',
    backdate: { purchased: 6, handed_over: 4, received: 1 },
    stuck: false,
  },
];

async function alreadySeeded(sellerId: string): Promise<boolean> {
  const { count } = await admin
    .from('listing')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId);
  return (count ?? 0) > 0;
}

async function main() {
  const sellerId = await ensureUser(SELLER);
  const buyerId = await ensureUser(BUYER);

  if (await alreadySeeded(sellerId)) {
    console.log(`이미 시드되어 있어요 (seller=${SELLER.username}). 정리 후 재실행:`);
    console.log(`  delete from listing where seller_id='${sellerId}';`);
    return;
  }

  console.log(`fixture ${FIXTURES.length}건 생성 중...`);
  for (const f of FIXTURES) {
    const skuId = await pickSku(f.brand, f.denomination);
    const unitPrice = Math.round(f.denomination * 0.95); // 5% 할인
    const qty = 1;
    const row: Record<string, unknown> = {
      sku_id: skuId,
      seller_id: sellerId,
      unit_price: unitPrice,
      quantity_offered: qty,
      quantity_remaining: f.status === 'submitted' ? qty : 0,
      status: f.status,
      submitted_at: hoursAgo(f.backdate?.purchased ?? 0.5),
    };
    if (f.status !== 'submitted') {
      row.buyer_id = buyerId;
      row.purchased_at = hoursAgo(f.backdate?.purchased ?? 1);
      row.gross_amount = unitPrice * qty;
      row.commission_total = 0;
      row.seller_net_amount = unitPrice * qty;
    }
    if (f.backdate?.handed_over !== undefined)
      row.handed_over_at = hoursAgo(f.backdate.handed_over);
    if (f.backdate?.received !== undefined) row.received_at = hoursAgo(f.backdate.received);
    if (f.backdate?.verified !== undefined) row.verified_at = hoursAgo(f.backdate.verified);
    if (f.backdate?.shipped !== undefined) row.shipped_at = hoursAgo(f.backdate.shipped);

    const { data, error } = await admin
      .from('listing')
      .insert(row)
      .select('id')
      .single<{ id: string }>();
    if (error) {
      console.error(`  ✗ ${f.label}: ${error.message}`);
      continue;
    }
    console.log(`  ✓ [${f.status}${f.stuck ? ' · 정체' : ''}] ${f.label} → ${data.id.slice(0, 8)}`);
  }

  console.log('\n완료. /admin/monitor 에서 확인하세요.');
  console.log(
    "정리: delete from listing where seller_id=(select id from users where username='monfixseller');",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
