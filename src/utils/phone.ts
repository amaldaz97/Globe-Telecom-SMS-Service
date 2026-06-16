const PH_MOBILE_REGEX = /^(\+?63|0)?9\d{9}$/;

export function isValidPhilippineMobile(number: string): boolean {
  return PH_MOBILE_REGEX.test(number.replace(/\s/g, ''));
}

/**
 * Normalizes Philippine mobile numbers to 639XXXXXXXXX format.
 */
export function normalizePhilippineMobile(number: string): string {
  const cleaned = number.replace(/\s/g, '');

  if (cleaned.startsWith('+63')) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith('09')) {
    return `63${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return `63${cleaned}`;
  }

  return cleaned;
}

/**
 * Masks a mobile number for logging (shows last 4 digits only).
 */
export function maskMobileNumber(number: string): string {
  if (number.length <= 4) {
    return '****';
  }
  return `${'*'.repeat(number.length - 4)}${number.slice(-4)}`;
}
