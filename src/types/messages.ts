/** Message from REST or realtime `MESSAGE_CREATED` payload. */
export interface MessageDto {
  id: string;
  conversationId: string;
  text?: string | null;
  body?: string | null;
  /** Prisma / messaging-service text fields */
  rawText?: string | null;
  normalizedText?: string | null;
  convertedText?: string | null;
  caption?: string | null;
  senderId?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
  updatedAt?: string | null;
  replyToMessageId?: string | null;
  replyTo?: {
    id?: string;
    rawText?: string | null;
    senderId?: string | null;
    sender?: { displayName?: string | null } | null;
  } | null;
  /** Prisma `MessageType` e.g. TEXT, IMAGE, AUDIO */
  type?: string | null;
  attachments?: Array<{
    sortOrder?: number;
    mediaAsset?: {
      secureUrl?: string;
      mediaType?: string;
      originalFileName?: string;
      mimeType?: string;
      durationSeconds?: number | null;
      sizeBytes?: number | null;
    };
  }> | null;
  status?: string | null;
  read?: boolean | null;
  isDeleted?: boolean | null;
  sender?: { id?: string } | null;
  [key: string]: unknown;
}

export interface PostTextMessageBody {
  conversationId: string;
  text: string;
  replyToMessageId?: string | null;
}

export interface PostMediaMessageBody {
  conversationId: string;
  mediaAssetIds: string[];
  caption?: string | null;
  replyToMessageId?: string | null;
}

export interface ForwardMessageBody {
  targetConversationId: string;
}

export interface EditMessageBody {
  newText: string;
}

export interface MessagesPage {
  messages: MessageDto[];
  nextCursor: string | null | undefined;
}
