import apiClient from './api';
import {
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from '../types/auth';

const AUTH_ENDPOINTS = {
  REQUEST_OTP: '/auth/otp/request',
  VERIFY_OTP: '/auth/otp/verify',
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
    console.log('🔐 verifyOtp payload:', JSON.stringify(payload));
  }

  try {
    const { data } = await apiClient.post<VerifyOtpResponse>(
      AUTH_ENDPOINTS.VERIFY_OTP,
      payload,
    );

    if (__DEV__) {
      console.log('✅ verifyOtp response:', JSON.stringify(data));
    }

    return data;
  } catch (error: any) {
    if (__DEV__) {
      console.log('❌ verifyOtp error status:', error.response?.status);
      console.log('❌ verifyOtp error data:', JSON.stringify(error.response?.data));
      console.log('❌ verifyOtp error message:', error.message);
    }
    throw error;
  }
}
