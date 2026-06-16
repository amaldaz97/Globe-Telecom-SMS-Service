import { z } from 'zod';

const envSchema = z.object({
  M360_APP_KEY: z.string().min(1, 'M360_APP_KEY is required'),
  M360_APP_SECRET: z.string().min(1, 'M360_APP_SECRET is required'),
  M360_SMS_URL: z
    .string()
    .url('M360_SMS_URL must be a valid URL')
    .default('https://api.m360.com.ph/v3/api/broadcast'),
  M360_SENDER_ID: z.string().min(1, 'M360_SENDER_ID is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

export const env = parseEnv();
