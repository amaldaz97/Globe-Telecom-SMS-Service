import { describe, expect, it } from 'vitest';
import { formatM360UserError, isPlaceholderSenderId } from './m360-errors';

describe('m360-errors', () => {
  it('maps shortcode_mask not provisioned to actionable message', () => {
    expect(formatM360UserError('The shortcode_mask is not provisioned.')).toContain(
      'Sender ID not provisioned',
    );
    expect(formatM360UserError('The shortcode_mask is not provisioned.')).toContain(
      'M360_SENDER_ID',
    );
  });

  it('passes through unknown errors unchanged', () => {
    expect(formatM360UserError('Credits Consumed')).toBe('Credits Consumed');
  });

  it('detects placeholder sender IDs', () => {
    expect(isPlaceholderSenderId('TEST')).toBe(true);
    expect(isPlaceholderSenderId('TEST_SENDER')).toBe(true);
    expect(isPlaceholderSenderId('SUNMOBILITY')).toBe(false);
  });
});
