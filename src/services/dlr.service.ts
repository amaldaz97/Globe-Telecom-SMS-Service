import { z } from 'zod';
import { inMemoryWebhookRepository } from '../repositories/in-memory-webhook.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { DLR_STATUS_MAP, DlrWebhookEvent } from '../types/webhook.types';
import { logger } from '../utils/logger';
import { maskMobileNumber } from '../utils/phone';

const dlrQuerySchema = z.object({
  transid: z.string().min(1),
  msisdn: z.string().min(1),
  status_code: z.string().min(1),
  timestamp: z.string().min(1),
  rcvd_transid: z.string().optional(),
  msgcount: z.string().optional(),
  telco_id: z.string().optional(),
});

export class DlrService {
  constructor(private readonly repository: WebhookRepository) {}

  async processWebhook(
    query: Record<string, unknown>,
    requestId?: string,
  ): Promise<DlrWebhookEvent> {
    const parsed = dlrQuerySchema.parse(query);
    const statusCode = Number(parsed.status_code);
    const status = DLR_STATUS_MAP[statusCode] ?? 'UNKNOWN';

    const event: DlrWebhookEvent = {
      transid: parsed.transid,
      msisdn: parsed.msisdn,
      statusCode,
      status,
      timestamp: parsed.timestamp,
      rcvdTransid: parsed.rcvd_transid,
      msgcount: parsed.msgcount ? Number(parsed.msgcount) : undefined,
      telcoId: parsed.telco_id ? Number(parsed.telco_id) : undefined,
      receivedAt: new Date().toISOString(),
    };

    await this.repository.saveDlrEvent(event);

    logger.info(
      {
        event: 'webhook.dlr.received',
        requestId,
        transid: event.transid,
        rcvdTransid: event.rcvdTransid,
        mobileNumber: maskMobileNumber(event.msisdn),
        status: event.status,
        statusCode: event.statusCode,
      },
      'DLR webhook event stored',
    );

    return event;
  }
}

export const dlrService = new DlrService(inMemoryWebhookRepository);
