import { io, type Socket } from 'socket.io-client';
import { CALL_SIGNALING_ORIGIN_RESOLVED } from '../config/env';
import type { CallInviteAck, CallMode, CallSimpleAck } from '../types/callSignaling';

const CALL_SOCKET_PATH = '/call/socket.io';

const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  reconnection: true,
  reconnectionDelay: 400,
  reconnectionDelayMax: 4000,
  reconnectionAttempts: 8,
};

/**
 * Single dedicated Socket.IO connection for WebRTC signaling (separate from chat realtime).
 */
export function createCallSignalingSocket(accessToken: string): Socket {
  return io(CALL_SIGNALING_ORIGIN_RESOLVED, {
    ...SOCKET_OPTIONS,
    path: CALL_SOCKET_PATH,
    auth: { token: accessToken },
  });
}

export function emitCallInvite(
  socket: Socket,
  targetUserId: string,
  mode: CallMode,
  onAck: (ack: CallInviteAck) => void,
  options?: { callerDisplayName?: string | null },
): void {
  const n = options?.callerDisplayName?.trim();
  const payload: {
    targetUserId: string;
    mode: CallMode;
    callerDisplayName?: string;
  } = { targetUserId, mode };
  if (n) {
    payload.callerDisplayName = n.length > 120 ? n.slice(0, 120) : n;
  }
  socket.emit('call:invite', payload, (ack: CallInviteAck) => {
    onAck(ack);
  });
}

export function emitCallAccept(
  socket: Socket,
  callId: string,
  onAck?: (ack: CallSimpleAck) => void,
): void {
  socket.emit('call:accept', { callId }, onAck ?? (() => undefined));
}

export function emitCallReject(socket: Socket, callId: string, onAck?: (ack: CallSimpleAck) => void): void {
  socket.emit('call:reject', { callId }, onAck ?? (() => undefined));
}

export function emitCallCancel(socket: Socket, callId: string, onAck?: (ack: CallSimpleAck) => void): void {
  socket.emit('call:cancel', { callId }, onAck ?? (() => undefined));
}

export function emitCallEnd(socket: Socket, callId: string, onAck?: (ack: CallSimpleAck) => void): void {
  socket.emit('call:end', { callId }, onAck ?? (() => undefined));
}

export function emitCallOffer(
  socket: Socket,
  callId: string,
  sdp: string,
  type: string,
  onAck?: (ack: CallSimpleAck) => void,
): void {
  socket.emit('call:offer', { callId, sdp, type }, onAck ?? (() => undefined));
}

export function emitCallAnswer(
  socket: Socket,
  callId: string,
  sdp: string,
  type: string,
  onAck?: (ack: CallSimpleAck) => void,
): void {
  socket.emit('call:answer', { callId, sdp, type }, onAck ?? (() => undefined));
}

export function emitCallIceCandidate(
  socket: Socket,
  callId: string,
  candidate: Record<string, unknown> | null,
  onAck?: (ack: CallSimpleAck) => void,
): void {
  socket.emit('call:ice', { callId, candidate }, onAck ?? (() => undefined));
}

/** GET `/api/calls/ice-config` on the gateway. */
export async function fetchIceConfig(
  accessToken: string,
): Promise<{ iceServers: unknown[] }> {
  const base = CALL_SIGNALING_ORIGIN_RESOLVED.replace(/\/$/, '');
  const res = await fetch(`${base}/api/calls/ice-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`ice-config failed: ${res.status}`);
  }
  return res.json() as Promise<{ iceServers: unknown[] }>;
}
