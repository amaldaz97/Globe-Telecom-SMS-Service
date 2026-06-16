import { DlrWebhookEvent, MoWebhookEvent } from '../types/webhook.types';
import { WebhookRepository } from './webhook.repository';

export class InMemoryWebhookRepository implements WebhookRepository {
  private readonly dlrEvents: DlrWebhookEvent[] = [];
  private readonly moEvents: MoWebhookEvent[] = [];

  async saveDlrEvent(event: DlrWebhookEvent): Promise<void> {
    this.dlrEvents.push(event);
  }

  async saveMoEvent(event: MoWebhookEvent): Promise<void> {
    this.moEvents.push(event);
  }

  async listDlrEvents(): Promise<DlrWebhookEvent[]> {
    return [...this.dlrEvents];
  }

  async listMoEvents(): Promise<MoWebhookEvent[]> {
    return [...this.moEvents];
  }

  clear(): void {
    this.dlrEvents.length = 0;
    this.moEvents.length = 0;
  }
}

export const inMemoryWebhookRepository = new InMemoryWebhookRepository();
