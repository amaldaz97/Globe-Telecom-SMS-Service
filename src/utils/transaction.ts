import { randomUUID } from 'crypto';

export function generateTransactionId(): string {
  return randomUUID();
}
