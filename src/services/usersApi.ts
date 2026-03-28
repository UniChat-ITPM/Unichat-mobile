import apiClient, { extractErrorMessage } from './api';
import type { AxiosError } from 'axios';
import type { ContactMatchDto, MatchContactsRequest, MatchContactsResponse } from '../types/contactMatch';

const MAX_BATCH = 1000;

/**
 * POST /users/match-contacts — requires Bearer token (set by api client).
 */
export async function matchContacts(body: MatchContactsRequest): Promise<MatchContactsResponse> {
  const { data } = await apiClient.post<MatchContactsResponse>('/users/match-contacts', {
    phoneNumbers: body.phoneNumbers,
    ...(body.excludeSelf !== undefined ? { excludeSelf: body.excludeSelf } : {}),
  });
  return data;
}

/**
 * Splits into chunks of ≤1000 and merges `matches` from each response.
 */
export async function matchContactsInBatches(
  phoneNumbers: string[],
  options?: { excludeSelf?: boolean },
): Promise<ContactMatchDto[]> {
  const merged: ContactMatchDto[] = [];
  const seenUser = new Set<string>();

  for (let i = 0; i < phoneNumbers.length; i += MAX_BATCH) {
    const chunk = phoneNumbers.slice(i, i + MAX_BATCH);
    const { matches } = await matchContacts({
      phoneNumbers: chunk,
      excludeSelf: options?.excludeSelf,
    });
    for (const m of matches) {
      if (!seenUser.has(m.userId)) {
        seenUser.add(m.userId);
        merged.push(m);
      }
    }
  }

  return merged;
}

export function usersErrorMessage(err: unknown): string {
  return extractErrorMessage(err as AxiosError);
}
