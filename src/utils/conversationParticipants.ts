import type { ConversationDetailDto } from '../types/conversations';

/** Backend GET /conversations/:id returns `participants[]` with `userId`, not always `participantUserIds`. */
export function participantUserIdsFromDetail(c: ConversationDetailDto): string[] {
  const rows = c.participants;
  if (Array.isArray(rows)) {
    const out: string[] = [];
    for (const row of rows) {
      if (row && typeof row === 'object') {
        const r = row as { userId?: string; user?: { id?: string } };
        const id =
          typeof r.userId === 'string' ? r.userId : typeof r.user?.id === 'string' ? r.user.id : null;
        if (id) {
          out.push(id);
        }
      }
    }
    if (out.length > 0) {
      return out;
    }
  }
  const a = c.participantUserIds;
  const b = c.participantIds;
  if (Array.isArray(a)) {
    return a.filter((x): x is string => typeof x === 'string');
  }
  if (Array.isArray(b)) {
    return b.filter((x): x is string => typeof x === 'string');
  }
  return [];
}
