import { describe, it, expect } from 'vitest';
import { profileFromClaims } from '@/lib/auth/guards';

describe('profileFromClaims', () => {
  it('정상 claims → 프로필 복원', () => {
    const profile = profileFromClaims('user-1', 'a@example.com', {
      phone_verified: true,
      full_name: '홍길동',
      nickname: 'gilbert',
      username: 'gildong',
      roles: ['seller'],
    });
    expect(profile).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      username: 'gildong',
      phone: null, // JWT 미포함 — 호출자가 별도 조회
      phone_verified: true,
      full_name: '홍길동',
      nickname: 'gilbert',
      marketing_opt_in: false, // JWT 미포함
    });
  });

  it('phone_verified=false 도 정상 복원', () => {
    const profile = profileFromClaims('user-2', null, {
      phone_verified: false,
      full_name: '',
      nickname: null,
      username: null,
    });
    expect(profile?.phone_verified).toBe(false);
    expect(profile?.full_name).toBe('');
    expect(profile?.nickname).toBeNull();
    expect(profile?.username).toBeNull();
  });

  it('phone_verified 키 자체가 없는 pre-backfill 토큰 → null (DB fallback 트리거)', () => {
    expect(profileFromClaims('user-3', 'b@example.com', { roles: ['admin'] })).toBeNull();
  });

  it('appMeta=undefined → null', () => {
    expect(profileFromClaims('user-4', null, undefined)).toBeNull();
  });

  it('악의적 타입 (string "true", 숫자, object) → 안전한 기본값', () => {
    const profile = profileFromClaims('user-5', null, {
      phone_verified: 'true' as unknown as boolean, // string is NOT === true
      full_name: 12345 as unknown as string,
      nickname: { foo: 'bar' } as unknown as string,
      username: ['arr'] as unknown as string,
    });
    expect(profile).not.toBeNull();
    expect(profile?.phone_verified).toBe(false); // strict equality only
    expect(profile?.full_name).toBe(''); // non-string falls back to ''
    expect(profile?.nickname).toBeNull(); // non-string falls back to null
    expect(profile?.username).toBeNull();
  });

  it('phone_verified=true 만 있고 다른 필드 누락 → 누락 필드는 기본값', () => {
    const profile = profileFromClaims('user-6', 'c@example.com', { phone_verified: true });
    expect(profile?.phone_verified).toBe(true);
    expect(profile?.full_name).toBe('');
    expect(profile?.nickname).toBeNull();
    expect(profile?.username).toBeNull();
  });
});
