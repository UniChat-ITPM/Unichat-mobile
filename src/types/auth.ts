/** Authenticated user returned from the backend */
export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  username: string | null;
}

/* ─── Request payloads ────────────────────────────────────── */

export interface RequestOtpPayload {
  phoneNumber: string;
}

export interface VerifyOtpPayload {
  phoneNumber: string;
  otpCode: string;
}

/* ─── Response shapes ─────────────────────────────────────── */

export interface RequestOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  isNewUser: boolean;
  user: User;
}

/** Generic error body the backend may return */
export interface ApiErrorBody {
  success: false;
  message: string;
}
