import { describe, it, expect } from 'vitest';
import {
  LISTING_STATUS_ORDER,
  canSellerHandover,
  canAdminReceive,
  canAdminVerify,
  canAdminShipToBuyer,
  canBuyerAccept,
  canRequestCancel,
  canAdminCancel,
  isTerminal,
  listingStepIndex,
  type ListingStatus,
} from '@/lib/domain/listings';

const ALL_STATUSES: ListingStatus[] = [
  'submitted',
  'purchased',
  'handed_over',
  'received',
  'verified',
  'shipped',
  'completed',
  'cancelled',
];

describe('listing state machine helpers', () => {
  it('LISTING_STATUS_ORDER 는 7단계 (cancelled 제외)', () => {
    expect(LISTING_STATUS_ORDER).toEqual([
      'submitted',
      'purchased',
      'handed_over',
      'received',
      'verified',
      'shipped',
      'completed',
    ]);
  });

  it('listingStepIndex 는 순서대로 증가, cancelled 는 -1', () => {
    expect(listingStepIndex('submitted')).toBe(0);
    expect(listingStepIndex('purchased')).toBe(1);
    expect(listingStepIndex('handed_over')).toBe(2);
    expect(listingStepIndex('received')).toBe(3);
    expect(listingStepIndex('verified')).toBe(4);
    expect(listingStepIndex('shipped')).toBe(5);
    expect(listingStepIndex('completed')).toBe(6);
    expect(listingStepIndex('cancelled')).toBe(-1);
  });

  it('canSellerHandover: purchased 만 true', () => {
    for (const s of ALL_STATUSES) {
      expect(canSellerHandover(s)).toBe(s === 'purchased');
    }
  });

  it('canAdminReceive: handed_over 만 true', () => {
    for (const s of ALL_STATUSES) {
      expect(canAdminReceive(s)).toBe(s === 'handed_over');
    }
  });

  it('canAdminVerify: received 만 true', () => {
    for (const s of ALL_STATUSES) {
      expect(canAdminVerify(s)).toBe(s === 'received');
    }
  });

  it('canAdminShipToBuyer: verified 만 true', () => {
    for (const s of ALL_STATUSES) {
      expect(canAdminShipToBuyer(s)).toBe(s === 'verified');
    }
  });

  it('canBuyerAccept: shipped 만 true', () => {
    for (const s of ALL_STATUSES) {
      expect(canBuyerAccept(s)).toBe(s === 'shipped');
    }
  });

  it('canRequestCancel: submitted~verified true, shipped/completed/cancelled false', () => {
    const yes: ListingStatus[] = ['submitted', 'purchased', 'handed_over', 'received', 'verified'];
    const no: ListingStatus[] = ['shipped', 'completed', 'cancelled'];
    for (const s of yes) expect(canRequestCancel(s)).toBe(true);
    for (const s of no) expect(canRequestCancel(s)).toBe(false);
  });

  it('canAdminCancel: completed/cancelled 외 전부 true', () => {
    for (const s of ALL_STATUSES) {
      const expected = s !== 'completed' && s !== 'cancelled';
      expect(canAdminCancel(s)).toBe(expected);
    }
  });

  it('isTerminal: completed/cancelled', () => {
    for (const s of ALL_STATUSES) {
      const expected = s === 'completed' || s === 'cancelled';
      expect(isTerminal(s)).toBe(expected);
    }
  });
});
