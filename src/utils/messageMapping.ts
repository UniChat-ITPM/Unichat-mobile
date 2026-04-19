import type { MessageDto } from '../types/messages';
import { colors } from '../theme/colors';

/** Row shape compatible with ChatScreen list items (text path). */
export interface MappedQuote {
  author: string;
  snippet: string;
  accent: string;
}

export interface MappedChatTextMessage {
  id: string;
  body: string;
  time: string;
  isMine: boolean;
  read?: boolean;
  sentAtMs?: number;
  quote?: MappedQuote;
  imageUri?: string;
  /** True when attachment is VIDEO (thumbnail still uses imageUri / video URL). */
  isVideo?: boolean;
  /** Duration in seconds for video attachments. */
  videoDurationSec?: number;
  voiceUri?: string;
  voiceDurationSec?: number;
  docName?: string;
  docMimeType?: string;
  docSizeBytes?: number;
  /** Download/preview URL for document attachments when available. */
  docUri?: string;
}

export type MessageMapContext = {
  /** Chat header name — used as fallback when reply parent sender label is missing */
  peerDisplayName?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

function normalizeReplyTo(
  raw: unknown,
): { rawText?: string | null; senderId?: string | null; sender?: { displayName?: string | null } | null } | null {
  if (!isObject(raw)) {
    return null;
  }
  return {
    rawText: (raw.rawText as string | null | undefined) ?? null,
    senderId: (raw.senderId as string | null | undefined) ?? null,
    sender: (raw.sender as { displayName?: string | null } | null | undefined) ?? null,
  };
}

export function coerceMessageDto(raw: unknown): MessageDto | null {
  if (!isObject(raw) || typeof raw.id !== 'string') {
    return null;
  }
  const conversationId =
    typeof raw.conversationId === 'string'
      ? raw.conversationId
      : typeof (raw as MessageDto).conversationId === 'string'
        ? (raw as MessageDto).conversationId
        : '';
  return { ...(raw as MessageDto), conversationId };
}

function messageBodyFromDto(msg: MessageDto): string {
  return String(
    msg.text ??
      msg.body ??
      msg.rawText ??
      msg.normalizedText ??
      msg.convertedText ??
      msg.caption ??
      '',
  ).trim();
}

function mediaFieldsFromDto(msg: MessageDto): Partial<
  Pick<
    MappedChatTextMessage,
    | 'imageUri'
    | 'isVideo'
    | 'videoDurationSec'
    | 'voiceUri'
    | 'voiceDurationSec'
    | 'docName'
    | 'docMimeType'
    | 'docSizeBytes'
    | 'docUri'
  >
> {
  const raw = msg.attachments;
  if (!Array.isArray(raw) || raw.length === 0) {
    return {};
  }
  type Att = {
    sortOrder?: number;
    mediaAsset?: {
      secureUrl?: string;
      mediaType?: string;
      originalFileName?: string;
      mimeType?: string;
      durationSeconds?: number | null;
      sizeBytes?: number | null;
    };
  };
  const sorted = [...(raw as Att[])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const asset = sorted[0]?.mediaAsset;
  if (!asset?.secureUrl) {
    return {};
  }
  const mt = String(asset.mediaType ?? 'IMAGE').toUpperCase();
  if (mt === 'IMAGE' || mt === 'OTHER') {
    return { imageUri: asset.secureUrl };
  }
  if (mt === 'VIDEO') {
    return {
      imageUri: asset.secureUrl,
      isVideo: true,
      videoDurationSec: Math.max(0, Number(asset.durationSeconds) || 0),
    };
  }
  if (mt === 'AUDIO') {
    return {
      voiceUri: asset.secureUrl,
      voiceDurationSec: Math.max(0, Number(asset.durationSeconds) || 0),
    };
  }
  if (mt === 'DOCUMENT') {
    const sz = asset.sizeBytes;
    return {
      docName: asset.originalFileName ?? 'File',
      docMimeType: asset.mimeType,
      ...(asset.secureUrl ? { docUri: asset.secureUrl } : {}),
      ...(typeof sz === 'number' && Number.isFinite(sz) ? { docSizeBytes: sz } : {}),
    };
  }
  return { imageUri: asset.secureUrl };
}

function quoteFromReplyBlock(
  msg: MessageDto,
  currentUserId: string | undefined,
  peerDisplayName?: string,
): MappedQuote | undefined {
  const rt = normalizeReplyTo(msg.replyTo);
  if (!rt) {
    return undefined;
  }
  const snippet = String(rt.rawText ?? '').trim();
  if (!snippet) {
    return undefined;
  }
  const repliedSender = rt.senderId != null ? String(rt.senderId) : '';
  const author =
    currentUserId && repliedSender && repliedSender === currentUserId
      ? 'You'
      : String(rt.sender?.displayName ?? peerDisplayName ?? '').trim() || 'Message';
  const mineReply = Boolean(currentUserId && repliedSender && repliedSender === currentUserId);
  return {
    author,
    snippet: snippet.length > 72 ? `${snippet.slice(0, 69)}…` : snippet,
    accent: mineReply ? colors.secondary : colors.primary,
  };
}

export function mapMessageDtoToListRow(
  msg: MessageDto,
  currentUserId: string | undefined,
  context?: MessageMapContext,
): MappedChatTextMessage | null {
  const id = msg.id;
  let body = messageBodyFromDto(msg);
  const media = mediaFieldsFromDto(msg);
  if (media.imageUri && !body) {
    body = ' ';
  }
  if (media.voiceUri && !body) {
    body = '';
  }
  if (media.docName && !body) {
    body = media.docName;
  }
  const sender =
    msg.senderId ?? msg.userId ?? (isObject(msg.sender) ? (msg.sender as { id?: string }).id : undefined);
  const isMine = Boolean(currentUserId && sender != null && String(sender) === currentUserId);

  let time = '';
  let sentAtMs: number | undefined;
  const created = msg.createdAt ?? msg.sentAt ?? msg.updatedAt;
  if (typeof created === 'string') {
    const d = new Date(created);
    if (!Number.isNaN(d.getTime())) {
      sentAtMs = d.getTime();
      time = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
  }
  if (!time) {
    const d = new Date();
    time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    sentAtMs = d.getTime();
  }

  const statusUpper = String(msg.status ?? '').toUpperCase();
  const read = Boolean(msg.read) || statusUpper === 'READ';

  const quote = quoteFromReplyBlock(msg, currentUserId, context?.peerDisplayName);

  return {
    id,
    body,
    time,
    isMine,
    read: Boolean(read),
    sentAtMs,
    ...(quote ? { quote } : {}),
    ...media,
  };
}

export function mapUnknownMessagePayload(
  payload: unknown,
  currentUserId: string | undefined,
  context?: MessageMapContext,
): MappedChatTextMessage | null {
  const dto = coerceMessageDto(payload);
  if (dto) {
    return mapMessageDtoToListRow(dto, currentUserId, context);
  }
  if (!isObject(payload)) {
    return null;
  }
  const id = payload.id ?? payload.messageId;
  if (id == null) {
    return null;
  }
  const conversationId =
    typeof payload.conversationId === 'string' ? payload.conversationId : '';
  const p = payload as Record<string, unknown>;
  return mapMessageDtoToListRow(
    {
      id: String(id),
      conversationId,
      text: p.text as string | undefined,
      body: p.body as string | undefined,
      rawText: p.rawText as string | undefined,
      normalizedText: p.normalizedText as string | undefined,
      convertedText: p.convertedText as string | undefined,
      caption: p.caption as string | undefined,
      senderId: p.senderId as string | undefined,
      userId: p.userId as string | undefined,
      createdAt: p.createdAt as string | undefined,
      sentAt: p.sentAt as string | undefined,
      updatedAt: p.updatedAt as string | undefined,
      status: p.status as string | undefined,
      read: p.read as boolean | undefined,
      sender: p.sender as { id?: string } | undefined,
      replyTo: p.replyTo as MessageDto['replyTo'],
      replyToMessageId: p.replyToMessageId as string | undefined,
      type: p.type as string | undefined,
      attachments: p.attachments as MessageDto['attachments'],
    },
    currentUserId,
    context,
  );
}
