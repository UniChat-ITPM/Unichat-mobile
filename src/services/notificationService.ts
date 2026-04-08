export type NotificationType = 'MESSAGE' | 'GROUP' | 'OTP' | 'SECURITY' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  metadata?: any;
}

export interface NotificationPreferences {
  messageNotifications: boolean;
  groupNotifications: boolean;
  otpNotifications: boolean;
  securityNotifications: boolean;
  pushNotifications: boolean;
}

/**
 * Conceptual endpoints for the Notification Service
 * GET /api/notifications
 * GET /api/notifications/unread-count
 * GET /api/notifications/:notificationId
 * PATCH /api/notifications/:notificationId/read
 * PATCH /api/notifications/read-all
 * PATCH /api/notifications/:notificationId/unread
 * DELETE /api/notifications/:notificationId
 * GET /api/notifications/preferences
 * PATCH /api/notifications/preferences
 * POST /api/notifications/devices
 * DELETE /api/notifications/devices/:deviceToken
 * GET /api/notifications/devices
 */

export const getNotifications = async (): Promise<NotificationItem[]> => {
  // Mock implementations for demo
  return [
    {
      id: '1',
      type: 'SECURITY',
      title: 'Suspicious Login Attempt',
      body: 'A login attempt was made from a new device in Colombo.',
      createdAt: new Date().toISOString(),
      read: false,
      metadata: { location: 'Colombo', device: 'Chrome on Windows' },
    },
    {
      id: '2',
      type: 'MESSAGE',
      title: 'Jane Doe',
      body: 'Hey, are you joining the meeting?',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      read: false,
      metadata: { conversationId: 'c_123' },
    },
    {
      id: '3',
      type: 'GROUP',
      title: 'Engineering Team',
      body: 'John: The deploy is finished.',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      read: true,
      metadata: { conversationId: 'g_456' },
    },
    {
      id: '4',
      type: 'OTP',
      title: 'OTP Request',
      body: 'Your verification code was requested.',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      read: true,
    },
  ];
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  return 2;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  console.log(`Marking notification ${notificationId} as read`);
};

export const registerPushDeviceToken = async (token: string): Promise<void> => {
  // POST /api/notifications/devices
  console.log('Registering push device token:', token);
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  return {
    messageNotifications: true,
    groupNotifications: true,
    otpNotifications: true,
    securityNotifications: true,
    pushNotifications: false,
  };
};

export const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>): Promise<void> => {
  console.log('Updating notification preferences:', prefs);
};
