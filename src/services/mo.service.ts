import { z } from 'zod';
import { inMemoryWebhookRepository } from '../repositories/in-memory-webhook.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { MoWebhookEvent } from '../types/webhook.types';
import { logger } from '../utils/logger';
import { maskMobileNumber } from '../utils/phone';

const moQuerySchema = z.object({
  transid: z.string().min(1),
  msisdn: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().min(1),
  from: z.string().min(1),
  msgcount: z.string().optional(),
  telco_id: z.string().optional(),
});

export class MoService {
  constructor(private readonly repository: WebhookRepository) {}

  async processWebhook(
    query: Record<string, unknown>,
    requestId?: string,
  ): Promise<MoWebhookEvent> {
    const parsed = moQuerySchema.parse(query);

    const event: MoWebhookEvent = {
      transid: parsed.transid,
      msisdn: parsed.msisdn,
      message: parsed.message,
      timestamp: parsed.timestamp,
      from: parsed.from,
      msgcount: parsed.msgcount ? Number(parsed.msgcount) : undefined,
      telcoId: parsed.telco_id ? Number(parsed.telco_id) : undefined,
      receivedAt: new Date().toISOString(),
    };

    await this.repository.saveMoEvent(event);

    logger.info(
      {
        event: 'webhook.mo.received',
        requestId,
        transid: event.transid,
        mobileNumber: maskMobileNumber(event.msisdn),
        from: event.from,
      },
      'MO webhook event stored',
    );

    return event;
  }
}

export const moService = new MoService(inMemoryWebhookRepository);
