import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import type * as Contacts from 'expo-contacts';

/**
 * Derive default country for parsing local-format device numbers from the signed-in user’s E.164.
 */
export function inferDefaultCountryFromUserPhone(
  phoneE164: string | undefined | null,
): CountryCode {
  if (phoneE164) {
    const p = parsePhoneNumberFromString(phoneE164.trim());
    if (p?.country) {
      return p.country;
    }
  }
  return 'LK';
}

/**
 * Normalize a single device/reported number to E.164, or `null` if invalid.
 */
export function normalizeDeviceNumberToE164(
  raw: string,
  defaultCountry: CountryCode,
): string | null {
  const stripped = raw.replace(/[\s\-().]/g, '').trim();
  if (!stripped) {
    return null;
  }
  try {
    const p = parsePhoneNumberFromString(stripped, defaultCountry);
    if (p?.isValid()) {
      return p.format('E.164');
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Walk Expo contacts and return unique valid E.164 numbers (order preserved).
 */
export function collectE164FromContacts(
  contacts: Contacts.ExistingContact[],
  defaultCountry: CountryCode,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const c of contacts) {
    const nums = c.phoneNumbers ?? [];
    for (const pn of nums) {
      const raw = pn.number ?? '';
      const e164 = normalizeDeviceNumberToE164(raw, defaultCountry);
      if (e164 && !seen.has(e164)) {
        seen.add(e164);
        out.push(e164);
      }
    }
  }

  return out;
}
