export type DlrStatus =
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'DELIVERED'
  | 'UNDELIVERED'
  | 'EXPIRED'
  | 'UNKNOWN';

export const DLR_STATUS_MAP: Record<number, DlrStatus> = {
  8: 'ACKNOWLEDGED',
  16: 'REJECTED',
  1: 'DELIVERED',
  2: 'UNDELIVERED',
  34: 'EXPIRED',
};

export interface DlrWebhookEvent {
  transid: string;
  msisdn: string;
  statusCode: number;
  status: DlrStatus;
  timestamp: string;
  rcvdTransid?: string;
  msgcount?: number;
  telcoId?: number;
  receivedAt: string;
}

export interface MoWebhookEvent {
  transid: string;
  msisdn: string;
  message: string;
  timestamp: string;
  from: string;
  msgcount?: number;
  telcoId?: number;
  receivedAt: string;
}

export interface DlrWebhookQuery {
  transid: string;
  msisdn: string;
  status_code: string;
  timestamp: string;
  rcvd_transid?: string;
  msgcount?: string;
  telco_id?: string;
}

export interface MoWebhookQuery {
  transid: string;
  msisdn: string;
  message: string;
  timestamp: string;
  from: string;
  msgcount?: string;
  telco_id?: string;
}
