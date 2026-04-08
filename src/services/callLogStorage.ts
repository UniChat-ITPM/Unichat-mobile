import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CallLogEntry } from '../types/callLog';

const STORAGE_KEY = '@unichat/call_log_v1';
const MAX_ENTRIES = 120;

export type StoredCallLogRow = {
  id: string;
  /** Server call id when known — used to dedupe logs for the same session. */
  callId?: string;
  peerUserId: string;
  name: string;
  direction: 'incoming' | 'outgoing';
  isVideo: boolean;
  endedAt: string;
  avatarColor?: string;
};

type AppendInput = {
  callId?: string | null;
  peerUserId: string;
  name: string;
  direction: 'incoming' | 'outgoing';
  isVideo: boolean;
  avatarColor?: string;
};

function formatCallListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (diffDays === 0) {
    return `Today · ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday · ${timeStr}`;
  }
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${timeStr}`;
}

export function rowToCallLogEntry(row: StoredCallLogRow): CallLogEntry {
  return {
    id: row.id,
    name: row.name,
    direction: row.direction,
    isVideo: row.isVideo,
    timeLabel: formatCallListTime(row.endedAt),
    avatarColor: row.avatarColor,
  };
}

async function loadRows(): Promise<StoredCallLogRow[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (r): r is StoredCallLogRow =>
        r &&
        typeof r === 'object' &&
        typeof (r as StoredCallLogRow).id === 'string' &&
        typeof (r as StoredCallLogRow).peerUserId === 'string' &&
        typeof (r as StoredCallLogRow).name === 'string' &&
        ((r as StoredCallLogRow).direction === 'incoming' ||
          (r as StoredCallLogRow).direction === 'outgoing') &&
        typeof (r as StoredCallLogRow).endedAt === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Persist one call history row (local only). Replaces any existing row with the same `callId`.
 */
export async function appendCallLog(entry: AppendInput): Promise<void> {
  const cid = entry.callId?.trim() || undefined;
  const id = cid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const row: StoredCallLogRow = {
    id,
    callId: cid,
    peerUserId: entry.peerUserId.trim(),
    name: entry.name.trim() || 'Contact',
    direction: entry.direction,
    isVideo: entry.isVideo,
    endedAt: new Date().toISOString(),
    avatarColor: entry.avatarColor,
  };
  const prev = await loadRows();
  const filtered = cid ? prev.filter((r) => r.callId !== cid) : prev;
  const next = [row, ...filtered].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function getCallLogEntries(): Promise<CallLogEntry[]> {
  const rows = await loadRows();
  return rows.map(rowToCallLogEntry);
}
