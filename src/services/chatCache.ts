import AsyncStorage from '@react-native-async-storage/async-storage';

const CONV_LIST_KEY = '@unichat/cache/conversation_list_v2';
const messagesKey = (conversationId: string) => `@unichat/cache/messages_v2/${conversationId}`;

/** Same ordering as API list: newest first (unshift). */
const MAX_CACHED_MESSAGES = 200;

export async function loadCachedConversationList(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CONV_LIST_KEY);
  } catch {
    return null;
  }
}

export async function saveCachedConversationList(json: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CONV_LIST_KEY, json);
  } catch {
    /* ignore */
  }
}

export async function loadCachedMessagesRaw(conversationId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(messagesKey(conversationId));
  } catch {
    return null;
  }
}

export async function saveCachedMessagesRaw(conversationId: string, json: string): Promise<void> {
  try {
    await AsyncStorage.setItem(messagesKey(conversationId), json);
  } catch {
    /* ignore */
  }
}

/** Merge one message (API / realtime DTO) into the on-device tail cache without refetching history. */
export async function prependMessageDtoToCache(
  conversationId: string,
  dto: Record<string, unknown>,
): Promise<void> {
  try {
    const raw = await loadCachedMessagesRaw(conversationId);
    let arr: unknown[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          arr = parsed;
        }
      } catch {
        /* ignore corrupt */
      }
    }
    const id = dto.id != null ? String(dto.id) : '';
    if (id) {
      arr = arr.filter((row) => {
        if (!row || typeof row !== 'object') {
          return true;
        }
        return String((row as { id?: unknown }).id) !== id;
      });
    }
    arr.unshift(dto);
    if (arr.length > MAX_CACHED_MESSAGES) {
      arr = arr.slice(0, MAX_CACHED_MESSAGES);
    }
    await saveCachedMessagesRaw(conversationId, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}
