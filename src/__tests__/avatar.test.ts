import { getProfileImageUrl } from '../utils/avatar';
import { User } from '../types/auth';

const baseUser: User = {
  id: '1',
  phoneNumber: '+94771234567',
  displayName: 'Test User',
  username: 'testuser',
};

describe('getProfileImageUrl', () => {
  it('returns profilePhoto when both profilePhoto and avatarUrl are set', () => {
    const user: User = {
      ...baseUser,
      profilePhoto: 'https://cdn.example.com/photo.jpg',
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
    };
    expect(getProfileImageUrl(user)).toBe('https://cdn.example.com/photo.jpg');
  });

  it('falls back to avatarUrl when profilePhoto is undefined', () => {
    const user: User = {
      ...baseUser,
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
    };
    expect(getProfileImageUrl(user)).toBe('https://cdn.example.com/avatar.jpg');
  });

  it('returns null when neither profilePhoto nor avatarUrl is set', () => {
    expect(getProfileImageUrl(baseUser)).toBeNull();
  });

  it('returns null for null user', () => {
    expect(getProfileImageUrl(null)).toBeNull();
  });

  it('returns null for undefined user', () => {
    expect(getProfileImageUrl(undefined)).toBeNull();
  });
});
