import type { MappedChatTextMessage } from './messageMapping';

const URL_RE = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;

export function formatClockDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function firstHttpUrlInText(text: string): string | null {
  const t = text.trim();
  if (!t) {
    return null;
  }
  URL_RE.lastIndex = 0;
  const m = URL_RE.exec(t);
  if (!m) {
    return null;
  }
  let u = m[0];
  if (u.toLowerCase().startsWith('www.')) {
    u = `https://${u}`;
  }
  return u;
}

export function messageHasLinkText(m: MappedChatTextMessage): boolean {
  return firstHttpUrlInText(m.body) != null;
}

/** Text-only messages that look like shared links (no photo/video/doc/voice bubble). */
export function isLinkShareRow(m: MappedChatTextMessage): boolean {
  if (m.imageUri || m.docName || m.voiceUri) {
    return false;
  }
  return messageHasLinkText(m);
}

export function isGalleryMediaRow(m: MappedChatTextMessage): boolean {
  return Boolean(m.imageUri);
}

export function isGalleryDocRow(m: MappedChatTextMessage): boolean {
  return Boolean(m.docName);
}

export function countMediaGalleryRows(rows: MappedChatTextMessage[]): { photos: number; videos: number } {
  let photos = 0;
  let videos = 0;
  for (const m of rows) {
    if (!m.imageUri) {
      continue;
    }
    if (m.isVideo) {
      videos += 1;
    } else {
      photos += 1;
    }
  }
  return { photos, videos };
}

/** Total items shown on contact info row: media + docs + link messages. */
export function mediaLinksDocsTotalCount(messages: MappedChatTextMessage[]): number {
  const linkIds = new Set(
    messages.filter(isLinkShareRow).map((m) => m.id),
  );
  const mediaOrDocIds = new Set(
    messages.filter((m) => isGalleryMediaRow(m) || isGalleryDocRow(m)).map((m) => m.id),
  );
  // A row could theoretically be both; count once.
  return new Set([...linkIds, ...mediaOrDocIds]).size;
}
