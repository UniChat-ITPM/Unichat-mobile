export type CallScreenParams = {
  mode: 'voice' | 'video';
  peerName: string;
  /** Avatar circle fill (defaults to soft indigo-tint) */
  avatarColor?: string;
  peerUserId?: string;
  incomingCallId?: string;
  /** Callee UX: caller user id (for display until profile is resolved). */
  fromUserId?: string;
};
