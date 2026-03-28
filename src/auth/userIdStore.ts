/**
 * Logged-in user id (must match JWT `sub`). Used for `x-user-id` on REST calls.
 * Synced from AuthProvider whenever `user.id` changes.
 */
let userId: string | null = null;

export function setUserIdMemory(id: string | null): void {
  userId = id;
}

export function getUserIdMemory(): string | null {
  return userId;
}
