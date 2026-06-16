import { z } from 'zod';
import { isValidPhilippineMobile } from './phone';

export const sendSmsSchema = z.object({
  mobileNumbers: z
    .array(
      z
        .string()
        .min(1, 'Mobile number cannot be empty')
        .refine((value) => isValidPhilippineMobile(value), {
          message: 'Invalid Philippine mobile number format',
        }),
    )
    .min(1, 'At least one mobile number is required'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(160, 'Message must not exceed 160 characters'),
});

export type SendSmsInput = z.infer<typeof sendSmsSchema>;
