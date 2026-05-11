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
  return (data ?? []) as unknown as WithdrawRequestRow[];
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
