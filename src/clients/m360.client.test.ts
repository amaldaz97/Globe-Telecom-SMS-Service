import { describe, expect, it, vi } from 'vitest';
import { M360Client } from './m360.client';
import { M360ApiError } from '../utils/errors';

describe('M360Client', () => {
  it('sends official v3.6.1 broadcast payload', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        code: 201,
        name: 'Created',
        timestamp: '2026-06-16T00:00:00Z',
        msgcount: 1,
        telco_id: 1,
        messageId: 'M3600503CF798D16B4623014558612961',
      },
    });

    const client = new M360Client();
    (client as unknown as { http: { post: typeof post } }).http = { post } as never;

    const result = await client.sendSMS({
      mobileNumber: '639272400575',
      message: 'Hello',
      transactionId: 'txn-123',
      requestId: 'req-456',
    });

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        app_key: expect.any(String),
        app_secret: expect.any(String),
        msisdn: '639272400575',
        content: 'Hello',
        shortcode_mask: expect.any(String),
        rcvd_transid: 'txn-123',
        is_intl: false,
      }),
    );

    expect(result).toEqual({
      messageId: 'M3600503CF798D16B4623014558612961',
      telcoId: 1,
      timestamp: '2026-06-16T00:00:00Z',
      code: 201,
    });
  });

  it('maps M360 HTTP errors to M360ApiError', async () => {
    const post = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { message: 'Invalid credentials' } },
      message: 'Request failed',
    });

    const client = new M360Client();
    (client as unknown as { http: { post: typeof post } }).http = { post } as never;

    await expect(
      client.sendSMS({
        mobileNumber: '639272400575',
        message: 'Hello',
        transactionId: 'txn-123',
      }),
    ).rejects.toBeInstanceOf(M360ApiError);
  });
});
