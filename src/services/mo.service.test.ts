import { describe, expect, it } from 'vitest';
import { InMemoryWebhookRepository } from '../repositories/in-memory-webhook.repository';
import { MoService } from './mo.service';

describe('MoService', () => {
  it('stores inbound MO messages', async () => {
    const repository = new InMemoryWebhookRepository();
    const service = new MoService(repository);

    const event = await service.processWebhook(
      {
        transid: 'MO001',
        msisdn: '639272400575',
        message: 'STOP',
        timestamp: '2026-06-16T00:00:00Z',
        from: '639272400575',
        msgcount: '1',
        telco_id: '1',
      },
      'req-1',
    );

    expect(event.message).toBe('STOP');
    expect(event.from).toBe('639272400575');

    const stored = await repository.listMoEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0].transid).toBe('MO001');
  });
});
