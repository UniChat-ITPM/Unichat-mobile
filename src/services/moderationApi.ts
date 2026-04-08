import apiClient from './api';

export type UserBlockStatus = {
  amIBlockedByThem: boolean;
  haveIBlockedThem: boolean;
};

export async function getBlockStatus(targetUserId: string): Promise<UserBlockStatus> {
  const { data } = await apiClient.get<UserBlockStatus>(`/moderation/users/${targetUserId}/block-status`);
  return data;
}

export async function blockUser(
  targetUserId: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `/moderation/users/${targetUserId}/block`,
    reason ? { reason } : {},
  );
  return data;
}

export async function unblockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `/moderation/users/${targetUserId}/unblock`,
    {},
  );
  return data;
}
