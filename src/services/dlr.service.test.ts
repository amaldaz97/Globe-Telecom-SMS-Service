import { describe, expect, it } from 'vitest';
import { InMemoryWebhookRepository } from '../repositories/in-memory-webhook.repository';
import { DlrService } from './dlr.service';

describe('DlrService', () => {
  it('maps status codes and persists events', async () => {
    const repository = new InMemoryWebhookRepository();
    const service = new DlrService(repository);

    const event = await service.processWebhook(
      {
        transid: 'T001',
        msisdn: '639272400575',
        status_code: '1',
        timestamp: '2026-06-16T00:00:00Z',
        rcvd_transid: 'uuid-123',
        msgcount: '1',
        telco_id: '1',
      },
      'req-1',
    );

    expect(event.status).toBe('DELIVERED');
    expect(event.statusCode).toBe(1);
    expect(event.rcvdTransid).toBe('uuid-123');

    const stored = await repository.listDlrEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0].transid).toBe('T001');
  });

  it('maps unknown status codes to UNKNOWN', async () => {
    const repository = new InMemoryWebhookRepository();
    const service = new DlrService(repository);

    const event = await service.processWebhook({
      transid: 'T002',
      msisdn: '639272400575',
      status_code: '99',
      timestamp: '2026-06-16T00:00:00Z',
    });

    expect(event.status).toBe('UNKNOWN');
  });
});
