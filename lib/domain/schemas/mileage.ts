import { z } from 'zod';

/**
 * 사용자 충전 요청 (무통장입금 전용 MVP).
 * - 금액 최소 100원 / 100원 단위.
 * - depositor_name 은 plain text (본인 full_name prefill 권장).
 */
export const chargeRequestSchema = z.object({
  amount: z.coerce
    .number()
    .int('정수 금액이어야 합니다')
    .min(100, '최소 100원 이상')
    .max(10_000_000, '1회 최대 10,000,000원')
    .refine((v) => v % 100 === 0, '100원 단위로 입력해주세요'),
  depositor_name: z.string().min(1, '입금자명을 입력해주세요').max(40, '40자 이내'),
  method: z.enum(['bank_transfer', 'pg']).default('bank_transfer'),
  return_to: z.string().optional(),
});
export type ChargeRequestInput = z.infer<typeof chargeRequestSchema>;

/**
 * 사용자 출금 신청. cash_balance 한정이며 RPC 가 최종 검증.
 * 등록된 정산 계좌(seller_payout_accounts)의 id 를 받아 액션이 bank_code/last4/holder 를
 * 조회 후 RPC 호출. 폼에 계좌 재입력 없음.
 */
export const withdrawRequestSchema = z.object({
  amount: z.coerce.number().int('정수 금액이어야 합니다').min(1, '금액은 1 이상이어야 합니다'),
  account_id: z.string().uuid('등록된 계좌를 선택해주세요'),
});
export type WithdrawRequestInput = z.infer<typeof withdrawRequestSchema>;

/**
 * 어드민 충전 승인 / 반려.
 */
export const adminConfirmChargeSchema = z.object({
  charge_id: z.coerce.number().int().positive(),
});
export type AdminConfirmChargeInput = z.infer<typeof adminConfirmChargeSchema>;

export const adminRejectChargeSchema = z.object({
  charge_id: z.coerce.number().int().positive(),
  reason: z.string().min(1, '사유를 입력해주세요').max(400),
});
export type AdminRejectChargeInput = z.infer<typeof adminRejectChargeSchema>;

/**
 * 어드민 출금 처리 (processing/completed/rejected).
 * rejected 는 reason 필수, 나머지는 optional.
 */
export const adminResolveWithdrawSchema = z
  .object({
    withdraw_id: z.coerce.number().int().positive(),
    status: z.enum(['processing', 'completed', 'rejected']),
    reason: z.string().max(400).optional(),
  })
  .refine((v) => v.status !== 'rejected' || (v.reason && v.reason.trim().length > 0), {
    message: '반려 사유는 필수입니다',
    path: ['reason'],
  });
export type AdminResolveWithdrawInput = z.infer<typeof adminResolveWithdrawSchema>;

/**
 * 어드민 거래 취소 요청 처리.
 */
export const adminApproveCancellationSchema = z.object({
  request_id: z.coerce.number().int().positive(),
});
export type AdminApproveCancellationInput = z.infer<typeof adminApproveCancellationSchema>;

export const adminRejectCancellationSchema = z.object({
  request_id: z.coerce.number().int().positive(),
  reason: z.string().min(1, '사유를 입력해주세요').max(400),
});
export type AdminRejectCancellationInput = z.infer<typeof adminRejectCancellationSchema>;
