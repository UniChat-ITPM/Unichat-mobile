/** Conversation row from GET /api/conversations (flexible to match backend). */
export interface ConversationSummaryDto {
  id: string;
  /** Backend Prisma enum, e.g. `DIRECT` | `GROUP` */
  type?: string | null;
  title?: string | null;
  name?: string | null;
  isGroup?: boolean;
  /** Other user in a 1:1 thread (when `type === 'DIRECT'`) */
  peerDisplayName?: string | null;
  peerUsername?: string | null;
  peerUserId?: string | null;
  participants?: Array<{
    userId: string;
    role?: string | null;
    displayName?: string | null;
    username?: string | null;
    profilePhoto?: string | null;
  }> | null;
  isFavorite?: boolean | null;
  /** Last message preview text */
  lastMessageText?: string | null;
  lastMessage?: { text?: string; body?: string; content?: string } | string | null;
  updatedAt?: string | null;
  lastActivityAt?: string | null;
  unreadCount?: number | null;
  muted?: boolean | null;
  archived?: boolean | null;
}

export interface ConversationDetailDto extends ConversationSummaryDto {
  participantUserIds?: string[];
  participantIds?: string[];
  imageUrl?: string | null;
  [key: string]: unknown;
}

export interface CreatePrivateConversationBody {
  participantUserId: string;
}

export interface CreateGroupConversationBody {
  title: string;
  imageUrl?: string;
  participantUserIds: string[];
}

export interface AddParticipantsBody {
  participantUserIds: string[];
}

export interface PatchConversationSettingsBody {
  title?: string;
  imageUrl?: string | null;
  [key: string]: unknown;
}
