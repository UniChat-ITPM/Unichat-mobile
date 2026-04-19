import { File } from 'expo-file-system';

/** Matches messaging-service: documents (non image/video/audio) max 20 MB. */
export const MAX_CHAT_DOCUMENT_BYTES = 20 * 1024 * 1024;
/** Matches messaging-service: images, video, audio max 25 MB. */
export const MAX_CHAT_MEDIA_BYTES = 25 * 1024 * 1024;

function isChatDocumentMime(mimeType: string): boolean {
  const m = mimeType.toLowerCase();
  return !m.startsWith('image/') && !m.startsWith('video/') && !m.startsWith('audio/');
}

/**
 * Client-side chat attachment limit check so users see errors immediately instead of waiting for upload/timeout.
 * Returns null if size is unknown (caller may still upload; server enforces limits).
 */
export function validateChatUploadFileSize(
  mimeType: string,
  sizeBytes: number | undefined,
): string | null {
  if (sizeBytes == null || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return null;
  }
  const max = isChatDocumentMime(mimeType) ? MAX_CHAT_DOCUMENT_BYTES : MAX_CHAT_MEDIA_BYTES;
  if (sizeBytes <= max) {
    return null;
  }
  const mb = max / (1024 * 1024);
  return isChatDocumentMime(mimeType)
    ? `This file is too large. Documents must be ${mb} MB or smaller.`
    : `This file is too large. Attachments must be ${mb} MB or smaller.`;
}

/** Resolve byte size for a local file URI (uses picker hint when provided). */
export async function resolveChatUploadLocalFileSizeBytes(
  fileUri: string,
  hintBytes?: number,
): Promise<number | undefined> {
  if (typeof hintBytes === 'number' && Number.isFinite(hintBytes) && hintBytes > 0) {
    return hintBytes;
  }
  try {
    const f = new File(fileUri);
    if (f.exists && typeof f.size === 'number' && f.size > 0) {
      return f.size;
    }
  } catch {
    // Non-file URIs or inaccessible paths — size unknown
  }
  return undefined;
}

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
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
/** Group avatars (create / edit); matches conversation-service body + Cloudinary limits */
export const MAX_GROUP_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validate a profile image by MIME type and file size.
 * Returns an error string if invalid, or null if valid.
 */
export function validateProfileImage(
  mimeType: string,
  fileSize: number,
  maxSizeBytes: number = MAX_PROFILE_IMAGE_SIZE_BYTES,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'Please select a JPEG, PNG, WebP, or GIF image.';
  }
  if (fileSize > maxSizeBytes) {
    const mb = maxSizeBytes / (1024 * 1024);
    return `Image must be ${mb} MB or smaller.`;
  }
  return null;
}
