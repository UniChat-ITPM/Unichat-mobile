export type CallMode = 'voice' | 'video';

export type CallInviteAck =
  | { ok: true; callId: string }
  | { ok: false; error?: string };

export type CallSimpleAck =
  | { ok: true; callId?: string }
  | { ok: false; error?: string };

export interface CallIncomingPayload {
  callId: string;
  fromUserId: string;
  mode: CallMode;
  /** Sent by call-service from invite body; for callee UI only. */
  callerDisplayName?: string;
}

export interface CallAcceptedPayload {
  callId: string;
  byUserId: string;
  mode: CallMode;
}

export interface CallEndedPayload {
  callId: string;
  byUserId: string;
}

export interface CallOfferPayload {
  callId: string;
  sdp: string;
  type: string;
  fromUserId?: string;
}

export interface CallAnswerPayload {
  callId: string;
  sdp: string;
  type: string;
  fromUserId?: string;
}

export interface CallIcePayload {
  callId: string;
  candidate: Record<string, unknown> | null;
  fromUserId?: string;
}
