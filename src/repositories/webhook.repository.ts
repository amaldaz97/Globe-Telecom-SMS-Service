import { DlrWebhookEvent, MoWebhookEvent } from '../types/webhook.types';

export interface WebhookRepository {
  saveDlrEvent(event: DlrWebhookEvent): Promise<void>;
  saveMoEvent(event: MoWebhookEvent): Promise<void>;
  listDlrEvents(): Promise<DlrWebhookEvent[]>;
  listMoEvents(): Promise<MoWebhookEvent[]>;
}
