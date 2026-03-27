import { User } from '../types/auth';

/**
 * Resolve the best available profile image URL for a user.
 * Prefers `profilePhoto`; falls back to legacy `avatarUrl`; returns `null` if neither exists.
 */
export function getProfileImageUrl(user: User | null | undefined): string | null {
  if (!user) return null;
  return user.profilePhoto ?? user.avatarUrl ?? null;
}
