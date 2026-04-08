export type CallLogEntry = {
  id: string;
  name: string;
  direction: 'incoming' | 'outgoing';
  isVideo?: boolean;
  timeLabel: string;
  streakCount?: number;
  avatarColor?: string;
};
