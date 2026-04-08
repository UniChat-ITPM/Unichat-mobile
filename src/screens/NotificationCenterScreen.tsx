import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NotificationListItem from '../components/NotificationListItem';
import SecurityAlertModal from '../components/SecurityAlertModal';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';
import {
  getNotifications,
  markNotificationAsRead,
  type NotificationItem,
} from '../services/notificationService';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationCenterScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Security Alert UI State
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [selectedSecurityAlert, setSelectedSecurityAlert] = useState<NotificationItem | null>(null);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleNotificationPress = async (notification: NotificationItem) => {
    // Optimistically mark as read in UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    // Call service to mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id).catch(console.error);
    }

    // Handle navigation/action based on type
    switch (notification.type) {
      case 'MESSAGE':
      case 'GROUP':
        if (notification.metadata?.conversationId) {
          navigation.navigate(SCREENS.CHAT, {
            conversationId: notification.metadata.conversationId,
            name: notification.title,
            isGroup: notification.type === 'GROUP',
          });
        }
        break;
      case 'OTP':
        // Typically OTP is a one-off, no specific screen to navigate to other than read
        break;
      case 'SECURITY':
        setSelectedSecurityAlert(notification);
        setSecurityModalVisible(true);
        break;
      case 'SYSTEM':
      default:
        // Do nothing specific
        break;
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Real implementation would call PATCH /api/notifications/read-all
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationListItem
              type={item.type}
              title={item.title}
              body={item.body}
              timeLabel={timeAgo(item.createdAt)}
              read={item.read}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>You have no notifications right now.</Text>
          }
        />
      )}

      {selectedSecurityAlert && (
        <SecurityAlertModal
          visible={securityModalVisible}
          title={selectedSecurityAlert.title}
          message={selectedSecurityAlert.body}
          details={
            selectedSecurityAlert.metadata?.location
              ? `Location: ${selectedSecurityAlert.metadata.location} (${selectedSecurityAlert.metadata.device})`
              : undefined
          }
          onDismiss={() => setSecurityModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  headerSide: {
    width: 44,
    height: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  readAllBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSizeMD,
  },
});

export default NotificationCenterScreen;
