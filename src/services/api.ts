import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { ApiErrorBody } from '../types/auth';

/** Pre-configured Axios instance pointing at the API gateway */
const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor (logging / future token injection) ─ */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
export function extractErrorMessage(error: AxiosError<ApiErrorBody>): string {
  // Backend returned an error body
  if (error.response?.data?.message) {
    return error.response.data.message;
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
