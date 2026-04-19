import type { GroupMemberListItem } from '../types/groupMember';

function roleSortOrder(role: string): number {
  const r = role.toUpperCase();
  if (r === 'OWNER') return 0;
  if (r === 'ADMIN') return 1;
  return 2;
}

function roleLabel(role: string): string | null {
  const r = role.toUpperCase();
  if (r === 'OWNER') return 'Owner';
  if (r === 'ADMIN') return 'Admin';
  return null;
}

/**
 * Maps API conversation participants (flat or Prisma-shaped with nested `user`) into UI rows.
 */
export function mapParticipantsToGroupMemberList(
  participants: unknown,
  selfUserId?: string | null,
): GroupMemberListItem[] {
  if (!Array.isArray(participants)) {
    return [];
  }

  type Row = GroupMemberListItem & { _order: number };

  const rows: Row[] = participants.map((p: Record<string, unknown>) => {
    const userObj = p.user as
      | {
          displayName?: string | null;
          username?: string | null;
          avatarUrl?: string | null;
        }
      | undefined;
    const userId = String(p.userId ?? '');
    const displayName = String(userObj?.displayName ?? p.displayName ?? '').trim();
    const username = String(userObj?.username ?? p.username ?? '').trim();
    const title =
      displayName ||
      (username ? (username.startsWith('@') ? username : `@${username}`) : '') ||
      (userId ? `Member · ${userId.slice(0, 8)}…` : 'Member');
    const role = String(p.role ?? 'MEMBER');
    const avatarUrl = (userObj?.avatarUrl ?? p.profilePhoto ?? p.avatarUrl ?? null) as string | null;

    return {
      userId,
      title,
      role,
      roleLabel: roleLabel(role),
      avatarUrl,
      isSelf: Boolean(selfUserId && userId === selfUserId),
      _order: roleSortOrder(role),
    };
  });

  rows.sort((a, b) => {
    const rd = a._order - b._order;
    if (rd !== 0) return rd;
    return a.title.localeCompare(b.title);
  });

  return rows.map(({ _order: _ignored, ...rest }) => rest);
}
