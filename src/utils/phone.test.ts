import { describe, expect, it } from 'vitest';
import { isValidPhilippineMobile, normalizePhilippineMobile } from './phone';

describe('phone utils', () => {
  const expected = '639272400575';

  it.each([
    '639272400575',
    '09272400575',
    '9272400575',
    '+639272400575',
  ])('normalizes %s to 639 format', (input) => {
    expect(isValidPhilippineMobile(input)).toBe(true);
    expect(normalizePhilippineMobile(input)).toBe(expected);
  });

  it('rejects invalid numbers', () => {
    expect(isValidPhilippineMobile('12345')).toBe(false);
    expect(isValidPhilippineMobile('')).toBe(false);
  });
});
