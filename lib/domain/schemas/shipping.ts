import { z } from 'zod';

export const shippingAddressSchema = z.object({
  recipient: z.string().min(1).max(40),
  phone: z.string().regex(/^\+?\d{10,15}$/),
  postal_code: z.string().regex(/^\d{5}$/),
  address_line1: z.string().min(1).max(100),
  address_line2: z.string().max(100).optional(),
  note: z.string().max(200).optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
