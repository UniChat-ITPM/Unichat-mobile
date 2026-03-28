import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { REALTIME_BASE_URL_RESOLVED } from '../config/env';
import type {
  JoinConversationAck,
  JoinConversationFailure,
  RealtimeEnvelope,
} from '../types/realtime';

const SOCKET_OPTIONS = {
  /** Prefer WebSocket first for lowest latency (falls back to polling). */
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  reconnection: true,
  reconnectionDelay: 400,
  reconnectionDelayMax: 4000,
  reconnectionAttempts: 12,
};

let socket: Socket | null = null;
/** JWT used for the current logical session (reconnect / AppState). */
let activeAuthToken: string | null = null;
/** Avoids recreating the client when `connectChatSocket` is called with the same token. */
let lastConnectedToken: string | null = null;

const joinRefCounts = new Map<string, number>();
const realtimeListeners = new Set<(envelope: RealtimeEnvelope) => void>();
const disconnectListeners = new Set<(reason: string) => void>();
const joinFailureListeners = new Set<
  (conversationId: string, failure: JoinConversationFailure) => void
>();

let appStateSubscribed = false;

function isJoinFailure(ack: JoinConversationAck): ack is JoinConversationFailure {
  return ack.ok === false;
}

function notifyRealtime(envelope: RealtimeEnvelope): void {
  realtimeListeners.forEach((fn) => {
    try {
      fn(envelope);
    } catch {
      /* listener errors should not tear down the socket */
    }
  });
}

function notifyDisconnect(reason: string): void {
  disconnectListeners.forEach((fn) => {
    try {
      fn(reason);
    } catch {
      /* ignore */
    }
  });
}

function notifyJoinFailure(conversationId: string, failure: JoinConversationFailure): void {
  joinFailureListeners.forEach((fn) => {
    try {
      fn(conversationId, failure);
    } catch {
      /* ignore */
    }
  });
}

function rejoinAllConversations(): void {
  if (!socket?.connected) return;
  const ids = [...joinRefCounts.keys()];
  for (const conversationId of ids) {
    socket.emit('join_conversation', { conversationId }, (ack: JoinConversationAck) => {
      if (isJoinFailure(ack)) {
        joinRefCounts.delete(conversationId);
        notifyJoinFailure(conversationId, ack);
      }
    });
  }
}

function attachSocketCoreHandlers(s: Socket): void {
  s.on('connect', () => {
    rejoinAllConversations();
  });

  s.on('disconnect', (reason) => {
    notifyDisconnect(String(reason));
  });

  s.on('connect_error', (err) => {
    if (__DEV__) {
      console.warn('[chatSocket] connect_error', err?.message ?? err);
    }
  });

  s.on('realtime', (envelope: RealtimeEnvelope) => {
    if (envelope && typeof envelope === 'object' && 'type' in envelope) {
      notifyRealtime(envelope as RealtimeEnvelope);
    }
  });
}

function ensureAppStateListener(): void {
  if (appStateSubscribed) return;
  appStateSubscribed = true;

  const handleAppState = (state: AppStateStatus) => {
    if (state !== 'active') return;
    if (!activeAuthToken) return;
    const s = socket;
    if (s && !s.connected) {
      s.connect();
    }
  };

  AppState.addEventListener('change', handleAppState);
}

function createSocket(token: string): Socket {
  const s = io(REALTIME_BASE_URL_RESOLVED, {
    ...SOCKET_OPTIONS,
    auth: { token },
    autoConnect: true,
  });
  attachSocketCoreHandlers(s);
  return s;
}

/**
 * Maintains a single shared client. Replaces the socket when `token` changes.
 */
export function connectChatSocket(token: string): void {
  activeAuthToken = token;
  ensureAppStateListener();

  if (socket?.connected && lastConnectedToken === token) {
    return;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  lastConnectedToken = token;
  socket = createSocket(token);
}

/** Disconnect and drop all join state (call on logout). */
export function disconnectChatSocket(): void {
  activeAuthToken = null;
  lastConnectedToken = null;
  joinRefCounts.clear();
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * After refreshing JWT: replace the socket with a new connection using `auth.token`.
 * Join ref-counts are kept so rooms are re-joined on `connect`.
 */
export function reconnectChatSocketWithToken(newToken: string): void {
  connectChatSocket(newToken);
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function isChatSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function subscribeRealtime(listener: (envelope: RealtimeEnvelope) => void): () => void {
  realtimeListeners.add(listener);
  return () => realtimeListeners.delete(listener);
}

export function subscribeSocketDisconnect(listener: (reason: string) => void): () => void {
  disconnectListeners.add(listener);
  return () => disconnectListeners.delete(listener);
}

export function subscribeJoinFailures(
  listener: (conversationId: string, failure: JoinConversationFailure) => void,
): () => void {
  joinFailureListeners.add(listener);
  return () => joinFailureListeners.delete(listener);
}

function waitForSocketConnect(timeoutMs: number): Promise<boolean> {
  const s = socket;
  if (!s) return Promise.resolve(false);
  if (s.connected) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      resolve(false);
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timer);
      s.off('connect', onConnect);
      resolve(true);
    };

    s.once('connect', onConnect);
  });
}

/**
 * Ref-counted join. First subscriber emits `join_conversation`; further subscribers are no-ops until leave.
 */
export async function joinConversationAsync(
  conversationId: string,
  connectTimeoutMs = 15_000,
): Promise<JoinConversationAck> {
  const next = (joinRefCounts.get(conversationId) ?? 0) + 1;
  joinRefCounts.set(conversationId, next);

  if (next > 1) {
    return { ok: true };
  }

  if (!socket) {
    joinRefCounts.delete(conversationId);
    return { ok: false, error: 'UNAUTHORIZED' };
  }

  const connected = await waitForSocketConnect(connectTimeoutMs);
  if (!connected || !socket) {
    joinRefCounts.delete(conversationId);
    return { ok: false, error: 'UNAUTHORIZED' };
  }

  return new Promise((resolve) => {
    socket!.emit('join_conversation', { conversationId }, (ack: JoinConversationAck) => {
      if (isJoinFailure(ack)) {
        joinRefCounts.delete(conversationId);
        notifyJoinFailure(conversationId, ack);
      }
      resolve(ack);
    });
  });
}

export function leaveConversation(conversationId: string): void {
  const prev = joinRefCounts.get(conversationId) ?? 0;
  if (prev <= 0) {
    return;
  }
  const next = prev - 1;
  if (next <= 0) {
    joinRefCounts.delete(conversationId);
    socket?.emit('leave_conversation', { conversationId }, () => {});
  } else {
    joinRefCounts.set(conversationId, next);
  }
}

/**
 * Sync connection to auth: connects when authenticated, tears down when logged out or token cleared.
 */
export function syncChatSocketWithAuth(isAuthenticated: boolean, token: string | null): void {
  if (!isAuthenticated || !token) {
    disconnectChatSocket();
    return;
  }
  connectChatSocket(token);
}
