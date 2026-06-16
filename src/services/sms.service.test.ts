import { describe, expect, it, vi } from 'vitest';
import { M360Client } from '../clients/m360.client';
import { SmsService } from './sms.service';
import { M360ApiError } from '../utils/errors';

function createMockClient(): M360Client {
  return {
    sendSMS: vi.fn(),
  } as unknown as M360Client;
}

describe('SmsService', () => {
  it('sends single SMS successfully', async () => {
    const client = createMockClient();
    vi.mocked(client.sendSMS).mockResolvedValue({
      messageId: 'MSG001',
      telcoId: 1,
      timestamp: '2026-06-16T00:00:00Z',
      code: 201,
    });

    const service = new SmsService(client);
    const result = await service.send(
      { mobileNumbers: ['639171234567'], message: 'Hello' },
      { requestId: 'req-1' },
    );

    expect(result.success).toBe(true);
    expect(result.summary).toEqual({ total: 1, successful: 1, failed: 0 });
    expect(result.results[0]).toMatchObject({
      mobileNumber: '639171234567',
      status: 'SUCCESS',
      messageId: 'MSG001',
      telcoId: 1,
      timestamp: '2026-06-16T00:00:00Z',
    });
    expect(result.results[0].transactionId).toBeDefined();
  });

  it('handles partial failures without stopping batch', async () => {
    const client = createMockClient();
    vi.mocked(client.sendSMS)
      .mockResolvedValueOnce({
        messageId: 'MSG001',
        code: 201,
      })
      .mockRejectedValueOnce(new M360ApiError('Credits Consumed', 410));

    const service = new SmsService(client);
    const result = await service.send({
      mobileNumbers: ['639171234567', '639181234568'],
      message: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.summary).toEqual({ total: 2, successful: 1, failed: 1 });
    expect(result.results[0].status).toBe('SUCCESS');
    expect(result.results[1].status).toBe('FAILED');
    expect(result.results[1].error).toContain('Credits Consumed');
  });

  it('marks all as failed when every send fails', async () => {
    const client = createMockClient();
    vi.mocked(client.sendSMS).mockRejectedValue(new M360ApiError('Unauthorized', 401));

    const service = new SmsService(client);
    const result = await service.send({
      mobileNumbers: ['639171234567', '639181234568'],
      message: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.summary.failed).toBe(2);
  });
});
