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

/**
 * Validate a username: 3-50 characters, letters, numbers and underscores only.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

/** Trim and collapse internal whitespace for display names. */
export function normalizeDisplayName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Validate a profile display name: 3–50 characters after trim;
 * letters, numbers, underscores, and single spaces between words (e.g. "Dumindu Dissanayake").
 */
export function isValidDisplayName(name: string): boolean {
  const normalized = normalizeDisplayName(name);
  if (normalized.length < 3 || normalized.length > 50) return false;
  return /^[a-zA-Z0-9_]+(?: [a-zA-Z0-9_]+)*$/.test(normalized);
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Validate a profile image by MIME type and file size.
 * Returns an error string if invalid, or null if valid.
 */
export function validateProfileImage(
  mimeType: string,
  fileSize: number,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'Please select a JPEG, PNG, WebP, or GIF image.';
  }
  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}
