import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { typography } from '../../theme/typography';

const CHROME = '#FFFFFF';
const META_SUB = 'rgba(255,255,255,0.62)';
const FW_SEMI = typography.fontWeightSemiBold;

export function formatChatImageViewerDate(sentAtMs: number | undefined, clockTime: string): string {
  const d = sentAtMs ? new Date(sentAtMs) : new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}, ${clockTime}`;
}

export type ChatImageViewerProps = {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  caption?: string;
  senderLabel: string;
  dateTimeLabel: string;
  canDelete?: boolean;
  onReply?: () => void;
  onShare?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onMore?: () => void;
  onCaptionSticker?: () => void;
};

export function ChatImageViewer({
  visible,
  onClose,
  imageUri,
  caption,
  senderLabel,
  dateTimeLabel,
  canDelete = true,
  onReply,
  onShare,
  onForward,
  onStar,
  onDelete,
  onEdit,
  onMore,
  onCaptionSticker,
}: ChatImageViewerProps) {
  const run = (fn?: () => void) => {
    if (fn) {
      fn();
    }
  };

  const shareImage = () => {
    void Share.share({
      url: imageUri,
      message: imageUri,
    }).catch(() => {
      Alert.alert('Share', 'Sharing is not available for this image.');
    });
    onShare?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style="light" />
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(0,0,0,0.82)', 'rgba(0,0,0,0.25)', 'transparent']}
          locations={[0, 0.55, 1]}
          style={styles.headerGradient}
          pointerEvents="none"
        />

        <SafeAreaView style={styles.topSafe} edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconHit} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={28} color={CHROME} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.senderName} numberOfLines={1}>
                {senderLabel}
              </Text>
              <Text style={styles.senderMeta} numberOfLines={1}>
                {dateTimeLabel}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => run(onEdit)} style={styles.iconHit} accessibilityRole="button" accessibilityLabel="Edit">
                <Ionicons name="brush-outline" size={22} color={CHROME} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => run(onMore)}
                style={styles.iconHitCircle}
                accessibilityRole="button"
                accessibilityLabel="More"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={CHROME} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.imageStage}>
          <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="contain" accessibilityLabel="Photo" />
        </View>

        <View style={styles.footerOverlay} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.94)']}
            locations={[0, 0.35, 1]}
            style={styles.footerGradientFill}
            pointerEvents="none"
          />
          <SafeAreaView style={styles.bottomSafe} edges={['bottom']}>
            {caption ? (
              <Text style={styles.captionText} numberOfLines={3}>
                {caption}
              </Text>
            ) : null}

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.stickerCircle}
                onPress={() => run(onCaptionSticker)}
                accessibilityRole="button"
                accessibilityLabel="Sticker or caption"
              >
                <Ionicons name="happy-outline" size={26} color={CHROME} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.replyPill}
                onPress={() => run(onReply)}
                accessibilityRole="button"
                accessibilityLabel="Reply"
              >
                <Ionicons name="return-down-back" size={18} color={CHROME} />
                <Text style={styles.replyPillLabel}>Reply</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.thumbRow}>
              <View style={styles.thumbFrameActive}>
                <Image source={{ uri: imageUri }} style={styles.thumb} />
              </View>
            </View>

            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolBtn} onPress={shareImage} accessibilityLabel="Share">
                <Ionicons name="share-outline" size={26} color={CHROME} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => run(onForward)} accessibilityLabel="Forward">
                <Ionicons name="arrow-redo-outline" size={26} color={CHROME} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => run(onStar)} accessibilityLabel="Star">
                <Ionicons name="star-outline" size={26} color={CHROME} />
              </TouchableOpacity>
              {canDelete ? (
                <TouchableOpacity style={styles.toolBtn} onPress={() => run(onDelete)} accessibilityLabel="Delete">
                  <Ionicons name="trash-outline" size={26} color={CHROME} />
                </TouchableOpacity>
              ) : (
                <View style={styles.toolBtn} />
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 1,
  },
  topSafe: {
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  senderName: {
    color: CHROME,
    fontSize: typography.fontSizeLG,
    fontWeight: FW_SEMI,
  },
  senderMeta: {
    color: META_SUB,
    fontSize: typography.fontSizeSM,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHitCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageStage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  heroImage: {
    flex: 1,
    width: '100%',
  },
  footerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  footerGradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSafe: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  captionText: {
    color: META_SUB,
    fontSize: typography.fontSizeMD,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stickerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  replyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  replyPillLabel: {
    color: CHROME,
    fontSize: typography.fontSizeMD,
    fontWeight: FW_SEMI,
  },
  thumbRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  thumbFrameActive: {
    padding: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: CHROME,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#222',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  toolBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
