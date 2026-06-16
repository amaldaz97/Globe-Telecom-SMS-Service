/**
 * Maps known M360 API errors to actionable messages for API consumers.
 */
export function formatM360UserError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('shortcode_mask') && normalized.includes('not provisioned')) {
    return (
      'Sender ID not provisioned — set M360_SENDER_ID in server config to your ' +
      'Globe-provisioned shortcode_mask (from M360 portal or account manager)'
    );
  }

  return message;
}

export const PLACEHOLDER_SENDER_IDS = new Set([
  'test',
  'test_sender',
  'your-sender-id',
  'your-sender-id-or-shortcode-mask',
]);

export function isPlaceholderSenderId(senderId: string): boolean {
  return PLACEHOLDER_SENDER_IDS.has(senderId.trim().toLowerCase());
}
