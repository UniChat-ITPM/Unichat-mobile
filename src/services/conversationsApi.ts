import apiClient, { extractErrorMessage } from './api';
import type { AxiosError } from 'axios';
import type {
  AddParticipantsBody,
  ConversationDetailDto,
  ConversationSummaryDto,
  CreateGroupConversationBody,
  CreatePrivateConversationBody,
  PatchConversationSettingsBody,
} from '../types/conversations';

const BASE = '/conversations';

/**
 * Conversation microservice returns `{ success, conversation }` for creates and GET-by-id.
 * Normalize to the inner document the UI expects.
 */
function unwrapConversationDetail(data: unknown): ConversationDetailDto {
  if (data && typeof data === 'object' && 'conversation' in data) {
    const inner = (data as { conversation: unknown }).conversation;
    if (inner && typeof inner === 'object' && 'id' in inner) {
      return inner as ConversationDetailDto;
    }
  }
  if (data && typeof data === 'object' && 'id' in data) {
    return data as ConversationDetailDto;
  }
  throw new Error('Unexpected conversation response from API');
}

function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  if (data && typeof data === 'object' && 'conversations' in data) {
    const c = (data as { conversations: unknown }).conversations;
    if (Array.isArray(c)) {
      return c as T[];
    }
  }
  return [];
}

export async function listMyConversations(): Promise<ConversationSummaryDto[]> {
  const { data } = await apiClient.get<unknown>(BASE);
  return unwrapArray<ConversationSummaryDto>(data);
}

export async function getConversation(id: string): Promise<ConversationDetailDto> {
  const { data } = await apiClient.get<unknown>(`${BASE}/${id}`);
  return unwrapConversationDetail(data);
}

export async function createPrivateConversation(
  body: CreatePrivateConversationBody,
): Promise<ConversationDetailDto> {
  const { data } = await apiClient.post<unknown>(`${BASE}/private`, body);
  return unwrapConversationDetail(data);
}

export async function createGroupConversation(
  body: CreateGroupConversationBody,
): Promise<ConversationDetailDto> {
  const { data } = await apiClient.post<unknown>(`${BASE}/group`, body);
  return unwrapConversationDetail(data);
}

export async function addConversationParticipants(
  conversationId: string,
  body: AddParticipantsBody,
): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/${conversationId}/participants`, body);
  return data;
}

export async function removeConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`${BASE}/${conversationId}/participants/${userId}`);
}

export async function promoteConversationAdmin(
  conversationId: string,
  userId: string,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${conversationId}/admins/${userId}/promote`);
  return data;
}

export async function demoteConversationAdmin(
  conversationId: string,
  userId: string,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${conversationId}/admins/${userId}/demote`);
  return data;
}

export async function leaveConversationRequest(conversationId: string): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/${conversationId}/leave`);
  return data;
}

export async function patchConversationSettings(
  conversationId: string,
  body: PatchConversationSettingsBody,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${conversationId}/settings`, body);
  return data;
}

export async function muteConversation(
  conversationId: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${conversationId}/mute`, body ?? {});
  return data;
}

export async function archiveConversation(
  conversationId: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${BASE}/${conversationId}/archive`, body ?? {});
  return data;
}

export function conversationsErrorMessage(err: unknown): string {
  return extractErrorMessage(err as AxiosError);
}
