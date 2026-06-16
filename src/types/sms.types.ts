export type RecipientStatus = 'SUCCESS' | 'FAILED';

export interface SendSmsRequest {
  mobileNumbers: string[];
  message: string;
}

export interface SmsRecipientResult {
  mobileNumber: string;
  status: RecipientStatus;
  transactionId: string;
  messageId?: string;
  telcoId?: number;
  timestamp?: string;
  error?: string;
}

export interface SmsSummary {
  total: number;
  successful: number;
  failed: number;
}

export interface SendSmsResponse {
  success: boolean;
  summary: SmsSummary;
  results: SmsRecipientResult[];
}

export interface M360SendSmsParams {
  mobileNumber: string;
  message: string;
  transactionId: string;
  requestId?: string;
}

export interface M360SmsResponse {
  messageId: string;
  telcoId?: number;
  timestamp?: string;
  code: number;
}

export interface SendSmsOptions {
  requestId?: string;
}
