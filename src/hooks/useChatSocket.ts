import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  joinConversationAsync,
  leaveConversation,
  subscribeJoinFailures,
  subscribeRealtime,
  subscribeSocketDisconnect,
  syncChatSocketWithAuth,
} from '../services/chatSocket';
import type { JoinConversationFailure, RealtimeEnvelope } from '../types/realtime';

export type UseChatSocketOptions = {
  /** Called for every `realtime` event from the server. */
  onRealtime?: (envelope: RealtimeEnvelope) => void;
  /** Failed `join_conversation` ack (also emitted after reconnect if re-join fails). */
  onJoinFailure?: (conversationId: string, failure: JoinConversationFailure) => void;
  /** Socket disconnect reason (see socket.io `DisconnectReason`). */
  onDisconnect?: (reason: string) => void;
};

/**
 * Owns sync of the shared Socket.IO client with auth and exposes conversation join/leave helpers.
 * Subscribe to `onRealtime` via options or the returned `subscribeRealtime` for decoupled listeners.
 */
export function useChatSocket(options?: UseChatSocketOptions) {
  const { accessToken, isAuthenticated } = useAuth();
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    syncChatSocketWithAuth(isAuthenticated, accessToken);
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!options?.onRealtime) return;
    return subscribeRealtime(options.onRealtime);
  }, [options?.onRealtime]);

  useEffect(() => {
    return subscribeSocketDisconnect((reason) => {
      optsRef.current?.onDisconnect?.(reason);
    });
  }, []);

  useEffect(() => {
    return subscribeJoinFailures((conversationId, failure) => {
      optsRef.current?.onJoinFailure?.(conversationId, failure);
    });
  }, []);

  const joinConversation = useCallback(async (conversationId: string) => {
    return joinConversationAsync(conversationId);
  }, []);

  const leave = useCallback((conversationId: string) => {
    leaveConversation(conversationId);
  }, []);

  return {
    joinConversation,
    leaveConversation: leave,
    subscribeRealtime,
  };
}

export type UseChatSocketReturn = ReturnType<typeof useChatSocket>;
