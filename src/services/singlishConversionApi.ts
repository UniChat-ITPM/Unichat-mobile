import axios from 'axios';
import { SINGLISH_CONVERSION_BASE_URL_RESOLVED } from '../config/env';

/** Longer timeout: first model load + inference on CPU can be slow. */
const CONVERT_TIMEOUT_MS = 120_000;

export type ConvertSinglishResponse = {
  sinhala: string;
};

export async function convertSinglishToSinhala(text: string): Promise<string> {
  const base = SINGLISH_CONVERSION_BASE_URL_RESOLVED.replace(/\/$/, '');
  const { data } = await axios.post<ConvertSinglishResponse>(
    `${base}/convert`,
    { text },
    {
      timeout: CONVERT_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const out = typeof data?.sinhala === 'string' ? data.sinhala : '';
  return out.trim();
}
