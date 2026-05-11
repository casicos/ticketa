import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ChargeRequestRow = {
  id: number;
  user_id: string;
  amount: number;
  method: 'bank_transfer' | 'pg';
  status: 'pending' | 'confirmed' | 'cancelled';
  depositor_name: string | null;
  requested_at: string;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

export type WithdrawRequestRow = {
  id: number;
  user_id: string;
  amount: number;
  fee: number;
  bank_code: string;
  account_number_last4: string;
  /** 어드민용 — seller_payout_accounts.account_number_encrypted 를 그대로 decode (MVP 평문). */
  account_number_full: string | null;
  account_holder: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  admin_memo: string | null;
  user: { full_name: string | null; username: string | null; email: string | null } | null;
};

const CHARGE_SELECT = `
  id, user_id, amount, method, status, depositor_name,
  requested_at,
  user:user_id(full_name, username, email)
` as const;

const WITHDRAW_SELECT = `
  id, user_id, amount, fee, bank_code, account_number_last4, account_holder,
  status, admin_memo, requested_at,
  user:user_id(full_name, username, email)
` as const;

export async function fetchPendingCharges(): Promise<ChargeRequestRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('charge_requests')
    .select(CHARGE_SELECT)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(50);
  return (data ?? []) as unknown as ChargeRequestRow[];
}

export async function fetchOpenWithdraws(): Promise<WithdrawRequestRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('withdraw_requests')
    .select(WITHDRAW_SELECT)
    .in('status', ['requested', 'processing'])
    .order('requested_at', { ascending: true })
    .limit(50);
  const rows = (data ?? []) as unknown as WithdrawRequestRow[];
  if (rows.length === 0) return rows;

  // 풀 계좌번호 매핑 — seller_payout_accounts.account_number_encrypted (bytea, MVP 평문).
  // user_id + bank_code + last4 매칭. 활성 계좌(is_active=true) 우선.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: acctData } = await supabase
    .from('seller_payout_accounts')
    .select('user_id, bank_code, account_number_last4, account_number_encrypted, is_active')
    .in('user_id', userIds);
  const map = new Map<string, string>();
  for (const a of (acctData ?? []) as {
    user_id: string;
    bank_code: string;
    account_number_last4: string;
    account_number_encrypted: string; // PostgREST 가 bytea 를 hex 문자열 (\\x...) 로 반환
    is_active: boolean;
  }[]) {
    const key = `${a.user_id}|${a.bank_code}|${a.account_number_last4}`;
    if (map.has(key) && !a.is_active) continue;
    // \x303030... 같은 hex 표기를 utf-8 텍스트로 디코드
    const hex = a.account_number_encrypted.replace(/^\\x/, '');
    const buf = Buffer.from(hex, 'hex');
    map.set(key, buf.toString('utf8'));
  }
  return rows.map((r) => ({
    ...r,
    account_number_full: map.get(`${r.user_id}|${r.bank_code}|${r.account_number_last4}`) ?? null,
  }));
}

export type UserBalance = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  cash_balance: number;
  pg_locked: number;
  balance: number;
};

export type LedgerEntry = {
  id: number;
  type: 'charge' | 'spend' | 'refund' | 'settle' | 'withdraw' | 'adjust';
  amount: number;
  balance_after: number;
  memo: string | null;
  created_at: string;
};

/** 회원 검색 → 잔액 동봉. q 는 username/email/full_name 부분 일치. */
export async function searchUsersWithBalance(q: string, limit = 20): Promise<UserBalance[]> {
  const term = q.trim();
  if (!term) return [];
  const supabase = createSupabaseAdminClient();
  const like = `%${term}%`;
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, username, email')
    .or(`username.ilike.${like},email.ilike.${like},full_name.ilike.${like},nickname.ilike.${like}`)
    .limit(limit);
  if (!users || users.length === 0) return [];

  const ids = users.map((u) => u.id);
  const { data: accts } = await supabase
    .from('mileage_accounts')
    .select('user_id, cash_balance, pg_locked, balance')
    .in('user_id', ids);
  const acctMap = new Map<string, { cash_balance: number; pg_locked: number; balance: number }>();
  for (const a of (accts ?? []) as {
    user_id: string;
    cash_balance: number;
    pg_locked: number;
    balance: number;
  }[]) {
    acctMap.set(a.user_id, {
      cash_balance: a.cash_balance,
      pg_locked: a.pg_locked,
      balance: a.balance,
    });
  }

  return users.map((u) => {
    const a = acctMap.get(u.id) ?? { cash_balance: 0, pg_locked: 0, balance: 0 };
    return {
      user_id: u.id,
      full_name: u.full_name ?? null,
      username: u.username ?? null,
      email: u.email ?? null,
      ...a,
    };
  });
}

/** 특정 회원의 마일리지 원장 (최신 N건). */
export async function fetchUserLedger(userId: string, limit = 30): Promise<LedgerEntry[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('mileage_ledger')
    .select('id, type, amount, balance_after, memo, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerEntry[];
}
