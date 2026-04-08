import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import {
  connectCallSocket,
  getCallSocket,
  waitForCallSocketConnect,
} from '../services/callSocket';
import { appendCallLog } from '../services/callLogStorage';
import { emitCallAccept, emitCallEnd, emitCallInvite } from '../services/callSignaling';
import type { CallInviteAck, CallSimpleAck } from '../types/callSignaling';
import type { CallScreenParams } from '../types/callScreenParams';

export type { CallScreenParams };

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

/**
 * Signaling-only call UI (Socket.IO + call-service). No native WebRTC — runs in Expo Go.
 * Real microphone/speaker requires a dev build with react-native-webrtc later.
 */
const CallScreen = ({ navigation, route }: Props) => {
  const params = route.params;
  const mode = params?.mode ?? 'voice';
  const peerName = params?.peerName?.trim() || 'Contact';
  const avatarColor = params?.avatarColor ?? colors.dotInactive;
  const initial = peerName.charAt(0).toUpperCase() || 'C';
  const peerUserId = params?.peerUserId?.trim();
  const incomingCallId = params?.incomingCallId?.trim();

  const { accessToken, user } = useAuth();
  const callIdRef = useRef<string | null>(null);

  const [connected, setConnected] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [signalingLine, setSignalingLine] = useState<string | null>(null);

  const canSignal = Boolean(accessToken && (peerUserId || incomingCallId));
  const invalidCallRef = useRef(false);
  const hasLoggedCallRef = useRef(false);

  const appendSessionLog = useCallback(
    (callIdOverride?: string | null) => {
      if (hasLoggedCallRef.current) {
        return;
      }
      const pid = (peerUserId ?? params?.fromUserId ?? '').trim();
      if (!pid) {
        return;
      }
      hasLoggedCallRef.current = true;
      const cidRaw =
        (callIdOverride != null ? String(callIdOverride).trim() : '') ||
        callIdRef.current?.trim() ||
        incomingCallId?.trim() ||
        '';
      void appendCallLog({
        callId: cidRaw || undefined,
        peerUserId: pid,
        name: peerName.trim() || 'Contact',
        direction: incomingCallId ? 'incoming' : 'outgoing',
        isVideo: mode === 'video',
        avatarColor,
      });
    },
    [peerUserId, params?.fromUserId, peerName, incomingCallId, mode, avatarColor],
  );

  useEffect(() => {
    if (!canSignal) {
      if (invalidCallRef.current) {
        return undefined;
      }
      invalidCallRef.current = true;
      const msg = !accessToken
        ? 'Sign in to use calls.'
        : 'Open a private chat and start a call from there.';
      Alert.alert('Call unavailable', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      return undefined;
    }

    invalidCallRef.current = false;
    connectCallSocket(accessToken!);

    let cancelled = false;
    const s = getCallSocket();
    if (!s) {
      Alert.alert('Call', 'Signaling not ready. Try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return undefined;
    }

    setSignalingLine('Connecting signaling…');

    const fail = (msg: string) => {
      if (cancelled) {
        return;
      }
      appendSessionLog(callIdRef.current ?? incomingCallId ?? null);
      setSignalingLine(msg);
      Alert.alert('Call', msg);
    };

    const onAccepted = () => {
      if (cancelled) {
        return;
      }
      setConnected(true);
      setSignalingLine(null);
    };

    const tearDownPeer = (label: string) => {
      if (cancelled) {
        return;
      }
      appendSessionLog(callIdRef.current ?? incomingCallId ?? null);
      setSignalingLine(label);
      navigation.goBack();
    };

    const onRejected = () => tearDownPeer('Call declined');
    const onCancelled = () => tearDownPeer('Call cancelled');
    const onEnded = () => tearDownPeer('Call ended');

    const beginInviteOrAccept = () => {
      if (cancelled) {
        return;
      }
      if (incomingCallId) {
        setSignalingLine('Connecting…');
        emitCallAccept(s, incomingCallId, (ack: CallSimpleAck) => {
          if (cancelled) {
            return;
          }
          if (ack.ok) {
            callIdRef.current = incomingCallId;
            setConnected(true);
            setSignalingLine(null);
          } else {
            fail(ack.error ?? 'Could not accept call');
          }
        });
        return;
      }
      if (peerUserId) {
        setSignalingLine('Ringing…');
        emitCallInvite(
          s,
          peerUserId,
          mode,
          (ack: CallInviteAck) => {
            if (cancelled) {
              return;
            }
            if (ack.ok) {
              callIdRef.current = ack.callId;
            } else {
              fail(ack.error ?? 'Could not start call');
            }
          },
          { callerDisplayName: user?.displayName },
        );
      }
    };

    const onConnectError = () => {
      fail('Signaling unreachable — is the gateway + call-service running?');
    };

    s.on('call:accepted', onAccepted);
    s.on('call:rejected', onRejected);
    s.on('call:cancelled', onCancelled);
    s.on('call:ended', onEnded);
    s.on('connect_error', onConnectError);

    void waitForCallSocketConnect(15_000).then((ok) => {
      if (cancelled) {
        return;
      }
      if (!ok || !getCallSocket()?.connected) {
        fail('Signaling unreachable — is the gateway + call-service running?');
        navigation.goBack();
        return;
      }
      beginInviteOrAccept();
    });

    return () => {
      cancelled = true;
      s.off('call:accepted', onAccepted);
      s.off('call:rejected', onRejected);
      s.off('call:cancelled', onCancelled);
      s.off('call:ended', onEnded);
      s.off('connect_error', onConnectError);
      const cid = callIdRef.current;
      const gs = getCallSocket();
      if (cid && gs?.connected) {
        emitCallEnd(gs, cid);
      }
      if (!hasLoggedCallRef.current && cid) {
        appendSessionLog(cid);
      }
      callIdRef.current = null;
    };
  }, [
    canSignal,
    accessToken,
    peerUserId,
    incomingCallId,
    mode,
    navigation,
    user?.displayName,
    appendSessionLog,
  ]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const id = setInterval(() => setElapsedSec((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  const statusLabel = useMemo(() => {
    if (signalingLine) {
      return signalingLine;
    }
    if (!connected) {
      return mode === 'video' ? 'Connecting video…' : 'Connecting…';
    }
    return formatDuration(elapsedSec);
  }, [connected, mode, elapsedSec, signalingLine]);

  const subtitle = useMemo(() => {
    if (!connected) {
      return 'Signaling';
    }
    return mode === 'video' ? 'Video call' : 'Voice call';
  }, [connected, mode]);

  const endCall = useCallback(() => {
    appendSessionLog(callIdRef.current ?? incomingCallId ?? null);
    const cid = callIdRef.current;
    const gs = getCallSocket();
    if (cid && gs?.connected) {
      emitCallEnd(gs, cid);
    }
    navigation.goBack();
  }, [navigation, appendSessionLog, incomingCallId]);

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
              <Text style={styles.remoteHint}>Signaling only — no live video in Expo Go</Text>
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
            {connected ? (
              <Text style={styles.signalingOk}>Call connected (signaling)</Text>
            ) : null}
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
                  accessibilityLabel="Speaker (UI only — no live audio)"
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
                  accessibilityLabel="Mute (UI only — no live audio)"
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

          {canSignal ? (
            <Text style={styles.demoNote}>
              Expo Go: signaling only. Real audio/video needs a development build with WebRTC.
            </Text>
          ) : null}
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
    textAlign: 'center',
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
  signalingOk: {
    marginTop: spacing.md,
    fontSize: typography.fontSizeSM,
    color: 'rgba(34,197,94,0.95)',
    fontWeight: typography.fontWeightSemiBold,
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
