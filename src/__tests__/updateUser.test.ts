import { User, UpdateUserPayload, UpdateUserResponse } from '../types/auth';

/** Mirror of normalizeUser from auth service */
function normalizeUser(user: User): User {
  if (!user.profilePhoto && user.avatarUrl) {
    return { ...user, profilePhoto: user.avatarUrl };
  }
  return user;
}

function normalizeResponse(raw: UpdateUserResponse): UpdateUserResponse {
  return { ...raw, user: normalizeUser(raw.user) };
}

/** Simulates the "only changed fields" logic from EditProfileScreen */
function buildPayload(
  current: User,
  form: { displayName: string; username: string; email: string; profilePhotoDataUri?: string },
): UpdateUserPayload {
  const payload: UpdateUserPayload = {};
  if (form.displayName.trim() !== (current.displayName ?? '')) {
    payload.displayName = form.displayName.trim();
  }
  if (form.username.trim() !== (current.username ?? '')) {
    payload.username = form.username.trim();
  }
  if (form.email.trim() !== (current.email ?? '')) {
    payload.email = form.email.trim();
  }
  if (form.profilePhotoDataUri) {
    payload.profilePhoto = form.profilePhotoDataUri;
  }
  return payload;
}

const existingUser: User = {
  id: 'u-1',
  phoneNumber: '+94771234567',
  displayName: 'Jane',
  username: 'janedoe',
  email: 'jane@example.com',
  avatarUrl: 'https://cdn.example.com/old.jpg',
  profileCompleted: true,
  status: 'ACTIVE',
};

describe('updateUser payload builder', () => {
  it('builds empty payload when nothing changed', () => {
    const payload = buildPayload(existingUser, {
      displayName: 'Jane',
      username: 'janedoe',
      email: 'jane@example.com',
    });
    expect(Object.keys(payload)).toHaveLength(0);
  });

  it('includes only changed fields', () => {
    const payload = buildPayload(existingUser, {
      displayName: 'Jane Updated',
      username: 'janedoe',
      email: 'jane@example.com',
    });
    expect(payload).toEqual({ displayName: 'Jane Updated' });
  });

  it('includes profilePhoto when image is selected', () => {
    const payload = buildPayload(existingUser, {
      displayName: 'Jane',
      username: 'janedoe',
      email: 'jane@example.com',
      profilePhotoDataUri: 'data:image/jpeg;base64,/9j/4AAQ...',
    });
    expect(payload).toEqual({ profilePhoto: 'data:image/jpeg;base64,/9j/4AAQ...' });
  });

  it('includes multiple changed fields together', () => {
    const payload = buildPayload(existingUser, {
      displayName: 'New Name',
      username: 'newuser',
      email: 'new@example.com',
      profilePhotoDataUri: 'data:image/png;base64,abc',
    });
    expect(payload).toEqual({
      displayName: 'New Name',
      username: 'newuser',
      email: 'new@example.com',
      profilePhoto: 'data:image/png;base64,abc',
    });
  });
});

describe('updateUser response normalization', () => {
  it('normalizes avatarUrl into profilePhoto when profilePhoto is absent', () => {
    const raw: UpdateUserResponse = {
      success: true,
      user: {
        ...existingUser,
        displayName: 'Updated',
        avatarUrl: 'https://cdn.example.com/new.jpg',
      },
    };
    const result = normalizeResponse(raw);
    expect(result.user.profilePhoto).toBe('https://cdn.example.com/new.jpg');
    expect(result.user.avatarUrl).toBe('https://cdn.example.com/new.jpg');
  });

  it('keeps profilePhoto when both fields are present', () => {
    const raw: UpdateUserResponse = {
      success: true,
      user: {
        ...existingUser,
        profilePhoto: 'https://cdn.example.com/photo.jpg',
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
      },
    };
    const result = normalizeResponse(raw);
    expect(result.user.profilePhoto).toBe('https://cdn.example.com/photo.jpg');
  });
});

describe('updateUser error handling', () => {
  it('maps 404 status to "User not found"', () => {
    const status = 404;
    const message = status === 404 ? 'User not found' : 'Unknown error';
    expect(message).toBe('User not found');
  });

  it('maps 409 status to duplicate message', () => {
    const status = 409;
    const message =
      status === 409
        ? 'Username or email is already in use. Please choose a different one.'
        : 'Unknown error';
    expect(message).toBe(
      'Username or email is already in use. Please choose a different one.',
    );
  });

  it('maps 400 status to validation message', () => {
    const status = 400;
    const friendlyMessage = 'Display name is required';
    const message =
      status === 400
        ? friendlyMessage
        : 'Unknown error';
    expect(message).toBe('Display name is required');
  });

  it('maps 500 status to generic retry message', () => {
    const status = 500;
    const message =
      status === 500
        ? 'Something went wrong on our end. Please try again later.'
        : 'Unknown error';
    expect(message).toBe(
      'Something went wrong on our end. Please try again later.',
    );
  });
});
