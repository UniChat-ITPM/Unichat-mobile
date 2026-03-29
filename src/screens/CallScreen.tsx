import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type CallScreenParams = {
  mode: 'voice' | 'video';
  peerName: string;
  /** Avatar circle fill (defaults to soft indigo-tint) */
  avatarColor?: string;
};

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

type Props = {
  navigation: { goBack: () => void };
  route: { params?: CallScreenParams };
};

const CallScreen = ({ navigation, route }: Props) => {
  const params = route.params;
  const mode = params?.mode ?? 'voice';
  const peerName = params?.peerName?.trim() || 'Contact';
  const avatarColor = params?.avatarColor ?? colors.dotInactive;
  const initial = peerName.charAt(0).toUpperCase() || 'C';

  const [connected, setConnected] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const id = setInterval(() => setElapsedSec((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  const statusLabel = useMemo(() => {
    if (!connected) {
      return mode === 'video' ? 'Connecting video…' : 'Connecting…';
    }
    return formatDuration(elapsedSec);
  }, [connected, mode, elapsedSec]);

  const subtitle = useMemo(() => {
    if (!connected) {
      return 'Demo call';
    }
    return mode === 'video' ? 'Video call' : 'Voice call';
  }, [connected, mode]);

  const endCall = useCallback(() => navigation.goBack(), [navigation]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LinearGradient
        colors={[colors.gradientStart, colors.primaryDark, colors.secondary]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconGhost}
            onPress={endCall}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close call"
          >
            <Ionicons name="chevron-down" size={28} color={colors.textLight} />
          </TouchableOpacity>
          <View style={styles.topMeta}>
            <Text style={styles.statusSmall}>{subtitle}</Text>
            <Text style={styles.timerLarge}>{statusLabel}</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        {mode === 'video' ? (
          <View style={styles.videoStage}>
            <View style={styles.remoteDim}>
              <Ionicons name="videocam-outline" size={56} color="rgba(255,255,255,0.35)" />
              <Text style={styles.remoteHint}>Remote video (demo)</Text>
              <Text style={styles.remoteName} numberOfLines={1}>
                {peerName}
              </Text>
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(30,27,75,0.55)']}
              style={styles.stageFade}
              pointerEvents="none"
            />
            <View style={styles.localPip}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                style={styles.localPipInner}
              >
                <Ionicons name="person" size={32} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
              <Text style={styles.pipLabel}>You</Text>
            </View>
          </View>
        ) : (
          <View style={styles.voiceStage}>
            <View style={[styles.heroAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.heroInitial}>{initial}</Text>
            </View>
            <Text style={styles.peerName} numberOfLines={2}>
              {peerName}
            </Text>
            <Text style={styles.peerSubtitle}>{subtitle}</Text>
          </View>
        )}

        <View style={styles.controlsWrap}>
          <View style={styles.controlRow}>
            {mode === 'voice' ? (
              <>
                <TouchableOpacity
                  style={[styles.ctrlBtn, speakerOn && styles.ctrlBtnActive]}
                  onPress={() => setSpeakerOn((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={speakerOn ? 'volume-high' : 'volume-medium-outline'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctrlBtn, muted && styles.ctrlBtnMuted]}
                  onPress={toggleMute}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={muted ? 'mic-off' : 'mic'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.ctrlBtn, !camOn && styles.ctrlBtnMuted]}
                  onPress={() => setCamOn((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={camOn ? 'videocam' : 'videocam-off'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => {}} activeOpacity={0.85}>
                  <Ionicons name="camera-reverse-outline" size={24} color={colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctrlBtn, muted && styles.ctrlBtnMuted]}
                  onPress={toggleMute}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={muted ? 'mic-off' : 'mic'}
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.9}>
            <Ionicons name="call" size={28} color={colors.textLight} style={styles.endIcon} />
          </TouchableOpacity>

          <Text style={styles.demoNote}>
            {Platform.OS === 'web' ? 'Demo UI — no real media' : 'Demo — no real media yet'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  iconGhost: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMeta: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 2,
  },
  topSpacer: {
    width: 44,
  },
  statusSmall: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightMedium,
    color: 'rgba(255,255,255,0.72)',
  },
  timerLarge: {
    marginTop: 2,
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  videoStage: {
    flex: 1,
    marginTop: spacing.lg,
    marginHorizontal: spacing.base,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  remoteDim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  remoteHint: {
    marginTop: spacing.md,
    fontSize: typography.fontSizeMD,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: typography.fontWeightMedium,
  },
  remoteName: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightSemiBold,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  stageFade: {
    ...StyleSheet.absoluteFillObject,
  },
  localPip: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    alignItems: 'center',
  },
  localPipInner: {
    width: 92,
    height: 120,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pipLabel: {
    marginTop: 6,
    fontSize: typography.fontSizeXS,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: typography.fontWeightSemiBold,
  },
  voiceStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroAvatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  heroInitial: {
    fontSize: 48,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.primaryDark,
  },
  peerName: {
    marginTop: spacing.xl,
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
    textAlign: 'center',
  },
  peerSubtitle: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizeMD,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: typography.fontWeightMedium,
  },
  controlsWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  ctrlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  ctrlBtnMuted: {
    backgroundColor: 'rgba(239,68,68,0.45)',
    borderColor: 'rgba(252,165,165,0.5)',
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  endIcon: {
    transform: [{ rotate: '135deg' }],
  },
  demoNote: {
    marginTop: spacing.lg,
    fontSize: typography.fontSizeXS,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
});

export default CallScreen;
