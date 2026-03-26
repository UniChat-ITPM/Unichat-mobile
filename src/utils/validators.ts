/**
 * Validate a phone number is in E.164 format (e.g. +94771234567).
 * Must start with '+' followed by 7–15 digits.
 */
export function isValidE164(phoneNumber: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phoneNumber);
}

/**
 * Validate an OTP code is exactly 6 digits.
 */
export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Strip spaces / dashes from a local phone string and prepend the country code.
 * Example: "77 123 4567" + "+94" → "+94771234567"
 */
export function toE164(localNumber: string, countryCode: string): string {
  const digitsOnly = localNumber.replace(/\D/g, '');
  return `${countryCode}${digitsOnly}`;
}
