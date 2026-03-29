import apiClient, { extractErrorMessage } from './api';
import type { AxiosError } from 'axios';
import type {
  EditMessageBody,
  ForwardMessageBody,
  MessageDto,
  MessagesPage,
  PostMediaMessageBody,
  PostTextMessageBody,
} from '../types/messages';

const BASE = '/messages';

export async function uploadChatMediaFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ mediaAssetId: string; secureUrl: string; mediaType: string }> {
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  const { data } = await apiClient.post<{
    mediaAssetId: string;
    secureUrl: string;
    mediaType: string;
  }>(`${BASE}/upload`, form, {
    timeout: 120_000,
  });
  return data;
}

export async function uploadAndSendChatMedia(params: {
  conversationId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  replyToMessageId?: string | null;
}): Promise<MessageDto> {
  const uploaded = await uploadChatMediaFile(params.fileUri, params.fileName, params.mimeType);
  const { data } = await apiClient.post<MessageDto>(`${BASE}/media`, {
    conversationId: params.conversationId,
    mediaAssetIds: [uploaded.mediaAssetId],
    replyToMessageId: params.replyToMessageId ?? undefined,
  });
  return data;
}

function normalizeMessagesPage(data: unknown): MessagesPage {
  if (Array.isArray(data)) {
    return { messages: data as MessageDto[], nextCursor: undefined };
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const messages = (o.messages ?? o.items ?? o.data) as MessageDto[] | undefined;
    if (Array.isArray(messages)) {
      const nextCursor =
        (o.nextCursor as string | undefined) ??
        (o.cursor as string | undefined) ??
        (o.next as string | undefined);
      return { messages, nextCursor };
    }
  }
  return { messages: [], nextCursor: undefined };
}

export async function fetchConversationMessages(
  conversationId: string,
  options?: { limit?: number; cursor?: string },
): Promise<MessagesPage> {
  const params: Record<string, string | number> = {
    limit: options?.limit ?? 50,
  };
  if (options?.cursor) {
    params.cursor = options.cursor;
  }
  const { data } = await apiClient.get<unknown>(
    `${BASE}/conversation/${conversationId}`,
    { params },
  );
  return normalizeMessagesPage(data);
}

export async function markConversationViewed(conversationId: string): Promise<void> {
  await apiClient.patch(`${BASE}/conversation/${conversationId}/viewed`);
}

export async function getUnreadCount(conversationId: string): Promise<number> {
  const { data } = await apiClient.get<unknown>(`${BASE}/unread-counts/${conversationId}`);
  if (typeof data === 'number') {
    return data;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const n = o.count ?? o.unreadCount ?? o.value;
    if (typeof n === 'number') {
      return n;
    }
  }
  return 0;
}

export async function getMessage(id: string): Promise<MessageDto> {
  const { data } = await apiClient.get<MessageDto>(`${BASE}/${id}`);
  return data;
}

export async function postTextMessage(body: PostTextMessageBody): Promise<MessageDto> {
  const { data } = await apiClient.post<MessageDto>(`${BASE}/text`, body);
  return data;
}

export async function postMediaMessage(body: PostMediaMessageBody): Promise<MessageDto | MessageDto[]> {
  const { data } = await apiClient.post<MessageDto | MessageDto[]>(`${BASE}/media`, body);
  return data;
}

export async function forwardMessage(messageId: string, body: ForwardMessageBody): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/${messageId}/forward`, body);
  return data;
}

export async function markMessageDelivered(messageId: string): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${messageId}/delivered`);
  return data;
}

export async function markMessageRead(messageId: string): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${messageId}/read`);
  return data;
}

export async function editMessage(messageId: string, body: EditMessageBody): Promise<MessageDto> {
  const { data } = await apiClient.patch<MessageDto>(`${BASE}/${messageId}/edit`, body);
  return data;
}

export async function deleteMessage(messageId: string): Promise<unknown> {
  const { data } = await apiClient.delete(`${BASE}/${messageId}`);
  return data;
}

export function messagesErrorMessage(err: unknown): string {
  return extractErrorMessage(err as AxiosError);
}