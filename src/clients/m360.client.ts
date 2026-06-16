import axios, { AxiosError, AxiosInstance, isAxiosError } from 'axios';
import { env } from '../config/env';
import { M360SendSmsParams, M360SmsResponse } from '../types/sms.types';
import { M360ApiError, M360_ERROR_MESSAGES, NetworkError } from '../utils/errors';
import { logger } from '../utils/logger';
import { maskMobileNumber } from '../utils/phone';

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data;

  if (typeof data === 'string' && data.length > 0) {
    return data;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.name ?? record.error_description;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(record.message)) {
      return record.message.map(String).join(', ');
    }
  }

  const status = error.response?.status;
  if (status && M360_ERROR_MESSAGES[status]) {
    return M360_ERROR_MESSAGES[status];
  }

  return error.message;
}

function mapAxiosError(error: unknown, context: string): never {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED') {
      logger.error({ event: context, err: axiosError.message }, 'M360 request timed out');
      throw new NetworkError('M360 request timed out', { context });
    }

    if (!axiosError.response) {
      logger.error({ event: context, err: axiosError.message }, 'M360 network error');
      throw new NetworkError('Unable to reach M360 API', { context });
    }

    const status = axiosError.response.status;
    const message = extractErrorMessage(axiosError);

    throw new M360ApiError(message, status, { status });
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error({ event: context, err: message }, 'Unexpected M360 client error');
  throw new M360ApiError(message);
}

function parseM360Response(data: unknown): M360SmsResponse {
  if (!data || typeof data !== 'object') {
    throw new M360ApiError('Invalid M360 response format');
  }

  const record = data as Record<string, unknown>;
  const messageId = record.messageId;
  const code = record.code;
  const telcoId = record.telco_id ?? record.telcoId;
  const timestamp = record.timestamp;

  if (typeof messageId !== 'string' || messageId.length === 0) {
    throw new M360ApiError('M360 response did not include a messageId');
  }

  return {
    messageId,
    code: typeof code === 'number' ? code : 201,
    telcoId: typeof telcoId === 'number' ? telcoId : undefined,
    timestamp: typeof timestamp === 'string' ? timestamp : undefined,
  };
}

export class M360Client {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      timeout: env.REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async sendSMS(params: M360SendSmsParams): Promise<M360SmsResponse> {
    const { mobileNumber, message, transactionId, requestId } = params;

    logger.info(
      {
        event: 'm360.sms.request',
        requestId,
        transactionId,
        mobileNumber: maskMobileNumber(mobileNumber),
      },
      'Sending SMS via M360',
    );

    const start = Date.now();

    try {
      const response = await this.http.post(env.M360_SMS_URL, {
        app_key: env.M360_APP_KEY,
        app_secret: env.M360_APP_SECRET,
        msisdn: mobileNumber,
        content: message,
        shortcode_mask: env.M360_SENDER_ID,
        rcvd_transid: transactionId,
        is_intl: false,
      });

      const parsed = parseM360Response(response.data);

      logger.info(
        {
          event: 'm360.sms.response',
          requestId,
          transactionId,
          mobileNumber: maskMobileNumber(mobileNumber),
          messageId: parsed.messageId,
          telcoId: parsed.telcoId,
          code: parsed.code,
          durationMs: Date.now() - start,
        },
        'M360 SMS response received',
      );

      return parsed;
    } catch (error) {
      logger.error(
        {
          event: 'm360.sms.error',
          requestId,
          transactionId,
          mobileNumber: maskMobileNumber(mobileNumber),
          durationMs: Date.now() - start,
          err: isAxiosError(error) ? extractErrorMessage(error) : String(error),
        },
        'M360 SMS request failed',
      );

      if (error instanceof M360ApiError || error instanceof NetworkError) {
        throw error;
      }

      mapAxiosError(error, 'm360.sms');
    }
  }
}

export const m360Client = new M360Client();
