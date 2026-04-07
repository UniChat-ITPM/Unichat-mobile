import type { ConversationSummaryDto } from '../types/conversations';

export type ChatPreviewRow = {
  id: string;
  name: string;
  lastMessage: string;
  timeLabel: string;
  unreadCount: number;
  isOnline?: boolean;
  avatarColor?: string;
  isGroup?: boolean;
  isFavorite?: boolean;
  imageUrl?: string | null;
};

const AVATAR_COLORS = ['#E0E7FF', '#F3E8FF', '#DBEAFE', '#E0F2FE', '#DCFCE7', '#FCE7F3'];

/** Backend lists use Prisma `type` (`GROUP` | `DIRECT`); `isGroup` may be absent. */
export function inferIsGroupFromConversationDto(c: ConversationSummaryDto): boolean {
  if (c.isGroup === true) return true;
  return String(c.type ?? '').toUpperCase() === 'GROUP';
}

function lastMessagePreview(c: ConversationSummaryDto): string {
  if (typeof c.lastMessage === 'string') {
    return c.lastMessage;
  }
  if (c.lastMessage && typeof c.lastMessage === 'object') {
    const o = c.lastMessage;
    return String(o.text ?? o.body ?? o.content ?? '');
  }
  return String(c.lastMessageText ?? '');
}

function formatTimeLabel(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function resolvePreviewName(c: ConversationSummaryDto, currentUserId?: string | null): string {
  const titled = String(c.title ?? c.name ?? '').trim();
  if (titled) {
    return titled;
  }
  const peer = String(c.peerDisplayName ?? c.peerUsername ?? '').trim();
  if (peer) {
    return peer;
  }
  const isGroup = inferIsGroupFromConversationDto(c);
  const isDirect =
    String(c.type ?? '').toUpperCase() === 'DIRECT' ||
    (!isGroup && !c.type && Array.isArray(c.participants) && c.participants.length === 2);
  if (isDirect && currentUserId && Array.isArray(c.participants)) {
    const other = c.participants.find((p) => p.userId !== currentUserId);
    const dn = other?.displayName?.trim();
    const un = other?.username?.trim();
    if (dn) {
      return dn;
    }
    if (un) {
      return un.startsWith('@') ? un : `@${un}`;
    }
    if (other?.userId) {
      return `Chat · ${other.userId.slice(0, 8)}…`;
    }
  }
  if (isDirect) {
    return 'Direct chat';
  }
  return 'Conversation';
}

/**
 * Avatar URL for a conversation: group `imageUrl`, or the other participant’s profile photo for direct chats.
 * Use for chat list rows, chat header, etc.
 */
export function resolveConversationAvatarUrl(
  c: ConversationSummaryDto,
  currentUserId?: string | null,
): string | null {
  if (inferIsGroupFromConversationDto(c)) {
    const g = c.imageUrl?.trim();
    return g || null;
  }
  const peerPhoto = (p: (typeof c.participants)[number]): string | null => {
    if (!p || typeof p !== 'object') return null;
    const flat = (p as { profilePhoto?: string | null }).profilePhoto?.trim();
    if (flat) return flat;
    const nested = (p as { user?: { avatarUrl?: string | null } }).user?.avatarUrl?.trim();
    return nested || null;
  };

  if (currentUserId && Array.isArray(c.participants) && c.participants.length > 0) {
    const other = c.participants.find((p) => p.userId !== currentUserId);
    const fromParticipant = other ? peerPhoto(other) : null;
    if (fromParticipant) {
      return fromParticipant;
    }
  }
  // Two-user direct thread when `currentUserId` is missing: use the only non–self row if obvious
  if (Array.isArray(c.participants) && c.participants.length === 2 && c.peerUserId) {
    const peer = c.participants.find((p) => p.userId === c.peerUserId);
    const url = peer ? peerPhoto(peer) : null;
    if (url) {
      return url;
    }
  }
  return null;
}

export function conversationDtoToPreview(
  c: ConversationSummaryDto,
  index: number,
  currentUserId?: string | null,
): ChatPreviewRow {
  const last = lastMessagePreview(c).trim();
  const timeSource = c.updatedAt ?? c.lastActivityAt ?? null;
  return {
    id: c.id,
    name: resolvePreviewName(c, currentUserId),
    lastMessage: last || 'No messages yet',
    timeLabel: formatTimeLabel(timeSource) || '—',
    unreadCount: Math.max(0, c.unreadCount ?? 0),
    isGroup: inferIsGroupFromConversationDto(c),
    isFavorite: Boolean(c.isFavorite),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    imageUrl: resolveConversationAvatarUrl(c, currentUserId),
  };
}
