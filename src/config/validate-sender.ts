import { env } from '../config/env';
import { isPlaceholderSenderId } from '../utils/m360-errors';
import { logger } from '../utils/logger';

export function validateSenderIdConfig(): void {
  if (!isPlaceholderSenderId(env.M360_SENDER_ID)) {
    return;
  }

  const message =
    'M360_SENDER_ID appears to be a placeholder. SMS sends will fail until you set ' +
    'your Globe-provisioned shortcode_mask. See README.md#troubleshooting.';

  if (env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  logger.warn({ senderId: env.M360_SENDER_ID, event: 'config.sender_id.placeholder' }, message);
}
