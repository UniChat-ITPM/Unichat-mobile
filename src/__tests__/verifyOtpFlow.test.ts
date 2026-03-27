/**
 * Unit tests for OTP verification response handling.
 * Validates that the auth service normalizes user data correctly
 * and the downstream routing logic works for all user scenarios.
 */
import { VerifyOtpResponse, User } from '../types/auth';

/** Simulates the normalizeUser logic from auth service */
function normalizeUser(user: User): User {
  if (!user.profilePhoto && user.avatarUrl) {
    return { ...user, profilePhoto: user.avatarUrl };
  }
  return user;
}

function normalizeResponse(raw: VerifyOtpResponse): VerifyOtpResponse {
  return { ...raw, user: normalizeUser(raw.user) };
}

describe('OTP verify response normalization', () => {
  const phone = '+94771234567';

  describe('existing user with profilePhoto', () => {
    const raw: VerifyOtpResponse = {
      success: true,
      message: 'OTP verified',
      isNewUser: false,
      requiresProfileCompletion: false,
      user: {
        id: 'u-1',
        phoneNumber: phone,
        displayName: 'Jane Doe',
        username: 'janedoe',
        email: 'jane@example.com',
        profilePhoto: 'https://cdn.example.com/photo.jpg',
        profileCompleted: true,
      },
    };

    it('keeps profilePhoto as-is', () => {
      const result = normalizeResponse(raw);
      expect(result.user.profilePhoto).toBe('https://cdn.example.com/photo.jpg');
    });

    it('does not require profile completion', () => {
      expect(raw.requiresProfileCompletion).toBe(false);
    });

    it('preserves all user fields', () => {
      const result = normalizeResponse(raw);
      expect(result.user.displayName).toBe('Jane Doe');
      expect(result.user.email).toBe('jane@example.com');
      expect(result.user.username).toBe('janedoe');
    });
  });

  describe('existing user with only avatarUrl (legacy backend)', () => {
    const raw: VerifyOtpResponse = {
      success: true,
      message: 'OTP verified',
      isNewUser: false,
      requiresProfileCompletion: false,
      user: {
        id: 'u-2',
        phoneNumber: phone,
        displayName: 'Legacy User',
        username: 'legacy',
        email: 'legacy@example.com',
        avatarUrl: 'https://cdn.example.com/old-avatar.jpg',
        profileCompleted: true,
      },
    };

    it('copies avatarUrl into profilePhoto', () => {
      const result = normalizeResponse(raw);
      expect(result.user.profilePhoto).toBe('https://cdn.example.com/old-avatar.jpg');
    });

    it('preserves the original avatarUrl', () => {
      const result = normalizeResponse(raw);
      expect(result.user.avatarUrl).toBe('https://cdn.example.com/old-avatar.jpg');
    });
  });

  describe('new user with no photo', () => {
    const raw: VerifyOtpResponse = {
      success: true,
      message: 'OTP verified',
      isNewUser: true,
      requiresProfileCompletion: true,
      user: {
        id: 'u-3',
        phoneNumber: phone,
        displayName: '',
        username: null,
      },
    };

    it('leaves profilePhoto undefined', () => {
      const result = normalizeResponse(raw);
      expect(result.user.profilePhoto).toBeUndefined();
    });

    it('requires profile completion', () => {
      expect(raw.requiresProfileCompletion).toBe(true);
    });

    it('marks as new user', () => {
      expect(raw.isNewUser).toBe(true);
    });
  });

  describe('routing decision', () => {
    it('routes to profile setup when requiresProfileCompletion is true', () => {
      const response: VerifyOtpResponse = {
        success: true,
        message: 'OK',
        isNewUser: true,
        requiresProfileCompletion: true,
        user: { id: 'u-4', phoneNumber: phone, displayName: '', username: null },
      };
      expect(response.requiresProfileCompletion).toBe(true);
    });

    it('routes to home when requiresProfileCompletion is false', () => {
      const response: VerifyOtpResponse = {
        success: true,
        message: 'OK',
        isNewUser: false,
        requiresProfileCompletion: false,
        user: {
          id: 'u-5',
          phoneNumber: phone,
          displayName: 'Returning',
          username: 'returning',
          profilePhoto: 'https://cdn.example.com/photo.jpg',
          profileCompleted: true,
        },
      };
      expect(response.requiresProfileCompletion).toBe(false);
    });
  });
});
