export type GroupMemberListItem = {
  userId: string;
  /** Resolved primary line (display name or username) */
  title: string;
  /** Role label e.g. Owner, Admin */
  roleLabel: string | null;
  avatarUrl: string | null;
  /** Show "You" badge when this row is the signed-in user */
  isSelf: boolean;
};
