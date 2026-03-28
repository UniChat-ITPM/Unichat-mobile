/** Authenticated user returned from the backend */
export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  username: string | null;
  email?: string;
  profilePhoto?: string;
  /** @deprecated Use `profilePhoto` instead. Kept for backward compatibility. */
  avatarUrl?: string;
  profileCompleted?: boolean;
  status?: string;
}

/** Image selected from the device for profile photo upload */
export interface ProfileImage {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

/* ─── Request payloads ────────────────────────────────────── */

export interface RequestOtpPayload {
  phoneNumber: string;
}

export interface VerifyOtpPayload {
  phoneNumber: string;
  otpCode: string;
}

export interface CompleteProfilePayload {
  phoneNumber: string;
  username: string;
  email: string;
  profilePhoto?: ProfileImage;
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
  requiresProfileCompletion: boolean;
  user: User;
  /** JWT for Socket.IO `auth.token` and REST `Authorization` */
  accessToken?: string;
}

export interface CompleteProfileResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken?: string;
}

export interface UpdateUserPayload {
  displayName?: string;
  username?: string;
  email?: string;
  profilePhoto?: string;
}

export interface UpdateUserResponse {
  success: boolean;
  user: User;
  accessToken?: string;
}

/** Generic error body the backend may return */
export interface ApiErrorBody {
  success: false;
  message: string;
}
