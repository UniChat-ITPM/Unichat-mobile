/** Ack from `join_conversation` Socket.IO emit */
export type JoinConversationSuccess = { ok: true };

export type JoinConversationErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CONVERSATION';

export type JoinConversationFailure = {
  ok: false;
  error: JoinConversationErrorCode;
};

export type JoinConversationAck = JoinConversationSuccess | JoinConversationFailure;

export type RealtimeEventType =
  | 'MESSAGE_CREATED'
  | 'MESSAGE_EDITED'
  | 'MESSAGE_DELETED'
  | 'MESSAGE_STATUS_UPDATED';

/** Payload always includes conversationId for routing (full message objects may be present). */
export type RealtimePayload = {
  conversationId: string;
} & Record<string, unknown>;

export interface RealtimeEnvelope<T extends RealtimePayload = RealtimePayload> {
  type: RealtimeEventType | string;
  payload: T;
}
