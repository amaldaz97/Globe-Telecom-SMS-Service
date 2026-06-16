import { M360Client, m360Client } from '../clients/m360.client';
import {
  SendSmsOptions,
  SendSmsRequest,
  SendSmsResponse,
  SmsRecipientResult,
} from '../types/sms.types';
import { isAppError } from '../utils/errors';
import { formatM360UserError } from '../utils/m360-errors';
import { logger } from '../utils/logger';
import { maskMobileNumber, normalizePhilippineMobile } from '../utils/phone';
import { generateTransactionId } from '../utils/transaction';

export class SmsService {
  constructor(private readonly client: M360Client) {}

  async send(request: SendSmsRequest, options: SendSmsOptions = {}): Promise<SendSmsResponse> {
    const { requestId } = options;
    const normalizedNumbers = request.mobileNumbers.map(normalizePhilippineMobile);

    const settled = await Promise.allSettled(
      normalizedNumbers.map((mobileNumber) =>
        this.sendToRecipient(mobileNumber, request.message, requestId),
      ),
    );

    const results: SmsRecipientResult[] = settled.map((result, index) => {
      const mobileNumber = normalizedNumbers[index];

      if (result.status === 'fulfilled') {
        return result.value;
      }

      const errorMessage =
        result.reason instanceof Error ? result.reason.message : 'Unknown error';

      logger.error(
        {
          event: 'sms.recipient.failed',
          requestId,
          mobileNumber: maskMobileNumber(mobileNumber),
          err: errorMessage,
        },
        'SMS delivery submission failed for recipient',
      );

      return {
        mobileNumber,
        status: 'FAILED',
        transactionId: generateTransactionId(),
        error: errorMessage,
      };
    });

    const successful = results.filter((r) => r.status === 'SUCCESS').length;
    const failed = results.length - successful;

    return {
      success: failed === 0,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    };
  }

  private async sendToRecipient(
    mobileNumber: string,
    message: string,
    requestId?: string,
  ): Promise<SmsRecipientResult> {
    const transactionId = generateTransactionId();

    try {
      const response = await this.client.sendSMS({
        mobileNumber,
        message,
        transactionId,
        requestId,
      });

      return {
        mobileNumber,
        status: 'SUCCESS',
        transactionId,
        messageId: response.messageId,
        telcoId: response.telcoId,
        timestamp: response.timestamp,
      };
    } catch (error) {
      const errorMessage = formatM360UserError(
        isAppError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error',
      );

      return {
        mobileNumber,
        status: 'FAILED',
        transactionId,
        error: errorMessage,
      };
    }
  }
}

export const smsService = new SmsService(m360Client);
