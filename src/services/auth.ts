import apiClient from './api';
import {
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  CompleteProfilePayload,
  CompleteProfileResponse,
  User,
} from '../types/auth';

/** Ensure `profilePhoto` is populated from legacy `avatarUrl` when absent. */
function normalizeUser(user: User): User {
  if (!user.profilePhoto && user.avatarUrl) {
    return { ...user, profilePhoto: user.avatarUrl };
  }
  return user;
}

const AUTH_ENDPOINTS = {
  REQUEST_OTP: '/auth/otp/request',
  VERIFY_OTP: '/auth/otp/verify',
  COMPLETE_PROFILE: '/auth/register/complete',
} as const;

/**
 * Request a one-time password for the given phone number.
 * The backend will deliver the OTP via SMS.
 */
export async function requestOtp(phoneNumber: string): Promise<RequestOtpResponse> {
  const payload: RequestOtpPayload = { phoneNumber };
  const { data } = await apiClient.post<RequestOtpResponse>(
    AUTH_ENDPOINTS.REQUEST_OTP,
    payload,
  );
  return data;
}

/**
 * Verify the OTP code entered by the user.
 * Returns the authenticated user and whether they are new.
 */
export async function verifyOtp(
  phoneNumber: string,
  otpCode: string,
): Promise<VerifyOtpResponse> {
  const payload: VerifyOtpPayload = { phoneNumber, otpCode };

  if (__DEV__) {
    console.log('verifyOtp payload:', JSON.stringify(payload));
  }

  try {
    const { data } = await apiClient.post<VerifyOtpResponse>(
      AUTH_ENDPOINTS.VERIFY_OTP,
      payload,
    );

    if (__DEV__) {
      console.log('verifyOtp response:', JSON.stringify(data));
    }

    return { ...data, user: normalizeUser(data.user) };
  } catch (error: any) {
    if (__DEV__) {
      console.log('verifyOtp error status:', error.response?.status);
      console.log('verifyOtp error data:', JSON.stringify(error.response?.data));
      console.log('verifyOtp error message:', error.message);
    }
    throw error;
  }
}

/**
 * Complete user profile registration.
 * Sends multipart/form-data when an image is included, otherwise JSON.
 */
export async function completeProfile(
  payload: CompleteProfilePayload,
): Promise<CompleteProfileResponse> {
  if (payload.profilePhoto) {
    const formData = new FormData();
    formData.append('phoneNumber', payload.phoneNumber);
    formData.append('username', payload.username);
    formData.append('email', payload.email);
    formData.append('profilePhoto', {
      uri: payload.profilePhoto.uri,
      type: payload.profilePhoto.mimeType,
      name: payload.profilePhoto.fileName,
    } as any);

    const { data } = await apiClient.post<CompleteProfileResponse>(
      AUTH_ENDPOINTS.COMPLETE_PROFILE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  const { data } = await apiClient.post<CompleteProfileResponse>(
    AUTH_ENDPOINTS.COMPLETE_PROFILE,
    {
      phoneNumber: payload.phoneNumber,
      username: payload.username,
      email: payload.email,
    },
  );
  return data;
}
