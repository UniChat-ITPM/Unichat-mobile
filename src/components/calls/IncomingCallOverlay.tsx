import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIncomingCall } from '../../context/IncomingCallContext';
import { navigateToCallScreen } from '../../navigation/navigationRef';
import { appendCallLog } from '../../services/callLogStorage';
import { getCallSocket } from '../../services/callSocket';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/**
 * Full-screen incoming call UI (replaces system Alert).
 */
const IncomingCallOverlay = () => {
  const { incoming, peerDisplayName, dismissIncomingCall } = useIncomingCall();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  if (!incoming) {
    return null;
  }

  const title =
    incoming.callerDisplayName?.trim() ||
    peerDisplayName?.trim() ||
    `Incoming · ${incoming.fromUserId.slice(0, 8)}…`;

  const decline = () => {
    getCallSocket()?.emit('call:reject', { callId: incoming.callId });
    void appendCallLog({
      callId: incoming.callId,
      peerUserId: incoming.fromUserId,
      name: title.trim() || 'Contact',
      direction: 'incoming',
      isVideo: incoming.mode === 'video',
    });
    dismissIncomingCall();
  };

  const accept = () => {
    dismissIncomingCall();
    navigateToCallScreen({
      mode: incoming.mode,
      peerName: title,
      incomingCallId: incoming.callId,
      peerUserId: incoming.fromUserId,
      fromUserId: incoming.fromUserId,
    });
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={decline}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LinearGradient
        colors={[colors.gradientStart, colors.primaryDark, colors.secondary]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { minHeight: height }]}
      >
        <View style={[styles.inner, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.label}>
            {incoming.mode === 'video' ? 'Incoming video call' : 'Incoming voice call'}
          </Text>

          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.avatar}
            >
              <Text style={styles.avatarLetter}>{title.trim().charAt(0).toUpperCase() || 'U'}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.sub}>Tap accept to answer</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.roundBtn, styles.declineBtn]}
              onPress={decline}
              activeOpacity={0.9}
              accessibilityLabel="Decline call"
            >
              <Ionicons name="call" size={28} color={colors.textLight} style={styles.declineIcon} />
              <Text style={styles.roundLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundBtn, styles.acceptBtn]}
              onPress={accept}
              activeOpacity={0.9}
              accessibilityLabel="Accept call"
            >
              <Ionicons name="call" size={28} color={colors.textLight} style={styles.acceptIcon} />
              <Text style={styles.roundLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.xxl,
  },
  avatarWrap: {
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarLetter: {
    fontSize: 44,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textLight,
  },
  name: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: typography.fontSizeMD,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl + spacing.md,
    marginTop: 'auto',
  },
  roundBtn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  roundLabel: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: 'rgba(255,255,255,0.85)',
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
  acceptIcon: {
    transform: [{ rotate: '0deg' }],
  },
});

export default IncomingCallOverlay;
