import { AppState, AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { CALL_SIGNALING_ORIGIN_RESOLVED } from '../config/env';
import type { CallIncomingPayload } from '../types/callSignaling';

const CALL_SOCKET_PATH = '/call/socket.io';

const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  reconnection: true,
  reconnectionDelay: 400,
  reconnectionDelayMax: 4000,
  reconnectionAttempts: 12,
};

let socket: Socket | null = null;
let activeAuthToken: string | null = null;
let lastConnectedToken: string | null = null;

let appStateSubscribed = false;

const incomingCallListeners = new Set<(payload: CallIncomingPayload) => void>();

function notifyIncomingCall(payload: CallIncomingPayload): void {
  incomingCallListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore */
    }
  });
}

function attachSocketHandlers(s: Socket): void {
  s.on('call:incoming', (raw: unknown) => {
    if (
      raw &&
      typeof raw === 'object' &&
      'callId' in raw &&
      'fromUserId' in raw &&
      'mode' in raw
    ) {
      const p = raw as CallIncomingPayload;
      if (
        typeof p.callId === 'string' &&
        typeof p.fromUserId === 'string' &&
        (p.mode === 'voice' || p.mode === 'video')
      ) {
        const base: CallIncomingPayload = {
          callId: p.callId,
          fromUserId: p.fromUserId,
          mode: p.mode,
        };
        const rawName = (p as CallIncomingPayload).callerDisplayName;
        const callerDisplayName =
          typeof rawName === 'string' ? rawName.trim() || undefined : undefined;
        notifyIncomingCall(
          callerDisplayName ? { ...base, callerDisplayName } : base,
        );
      }
    }
  });

  s.on('connect_error', (err) => {
    if (__DEV__) {
      console.warn('[callSocket] connect_error', err?.message ?? err);
    }
  });
}

function ensureAppStateListener(): void {
  if (appStateSubscribed) {
    return;
  }
  appStateSubscribed = true;

  const handleAppState = (state: AppStateStatus) => {
    if (state !== 'active') {
      return;
    }
    if (!activeAuthToken) {
      return;
    }
    const s = socket;
    if (s && !s.connected) {
      s.connect();
    }
  };

  AppState.addEventListener('change', handleAppState);
}

function createSocket(token: string): Socket {
  const s = io(CALL_SIGNALING_ORIGIN_RESOLVED, {
    ...SOCKET_OPTIONS,
    path: CALL_SOCKET_PATH,
    auth: { token },
    autoConnect: true,
  });
  attachSocketHandlers(s);
  return s;
}

/**
 * Single shared call signaling socket (must stay connected while logged in so
 * `call:incoming` can be delivered — separate from chat `/socket.io`).
 */
export function connectCallSocket(token: string): void {
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

export function disconnectCallSocket(): void {
  activeAuthToken = null;
  lastConnectedToken = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function reconnectCallSocketWithToken(newToken: string): void {
  connectCallSocket(newToken);
}

export function getCallSocket(): Socket | null {
  return socket;
}

export function isCallSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function subscribeIncomingCall(
  listener: (payload: CallIncomingPayload) => void,
): () => void {
  incomingCallListeners.add(listener);
  return () => incomingCallListeners.delete(listener);
}

export function syncCallSocketWithAuth(
  isAuthenticated: boolean,
  token: string | null,
): void {
  if (!isAuthenticated || !token) {
    disconnectCallSocket();
    return;
  }
  connectCallSocket(token);
}

export function waitForCallSocketConnect(timeoutMs: number): Promise<boolean> {
  const s = socket;
  if (!s) {
    return Promise.resolve(false);
  }
  if (s.connected) {
    return Promise.resolve(true);
  }

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
