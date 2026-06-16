import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      M360_APP_KEY: 'test-app-key',
      M360_APP_SECRET: 'test-app-secret',
      M360_SENDER_ID: 'TEST_SENDER',
      M360_SMS_URL: 'https://api.m360.com.ph/v3/api/broadcast',
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    },
  },
});
