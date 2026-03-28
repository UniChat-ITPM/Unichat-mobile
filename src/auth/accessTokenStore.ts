/**
 * In-memory access token for modules that must avoid importing AuthContext
 * (e.g. Axios interceptors). Synced from AuthProvider.
 */
let accessToken: string | null = null;

export function setAccessTokenMemory(token: string | null): void {
  accessToken = token;
}

export function getAccessTokenMemory(): string | null {
  return accessToken;
}
