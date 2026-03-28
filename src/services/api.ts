import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessTokenMemory } from '../auth/accessTokenStore';
import { getUserIdMemory } from '../auth/userIdStore';
import { API_BASE_URL_RESOLVED, ENV } from '../config/env';
import { ApiErrorBody } from '../types/auth';

/** Pre-configured Axios instance pointing at the HTTP API (`/api/...`). */
const apiClient = axios.create({
  baseURL: API_BASE_URL_RESOLVED,
  timeout: ENV.REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

if (__DEV__) {
  console.log('[api] baseURL resolved to:', API_BASE_URL_RESOLVED);
}

/* ─── Request interceptor ─ */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessTokenMemory();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const uid = getUserIdMemory();
    if (uid) {
      config.headers['x-user-id'] = uid;
    }
    // Let the runtime set multipart boundary; default `application/json` breaks file uploads.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    if (__DEV__) {
      console.log(`➡️  ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ─── Response interceptor ───────────────────────────────── */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const friendlyMessage = extractErrorMessage(error);
    // Attach a human-readable message for UI consumption
    (error as any).friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  },
);

/** Turn an AxiosError into a user-friendly string */
export function extractErrorMessage(
  error: AxiosError<ApiErrorBody | { error?: string; message?: string }>,
): string {
  const status = error.response?.status;
  const data = error.response?.data as { message?: string; error?: string } | undefined;

  if (data?.message) {
    return data.message;
  }
  if (typeof data?.error === 'string') {
    return data.error;
  }

  if (status === 401) {
    return 'Session expired or not signed in. Please log in again.';
  }
  if (status === 429) {
    return 'Too many requests. Please try again in a moment.';
  }

  // Network-level failures
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your connection and try again.';
  }
  if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  return 'Something went wrong. Please try again later.';
}

export default apiClient;
