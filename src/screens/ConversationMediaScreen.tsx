import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
  Modal,
  Linking,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { fetchAllConversationMessages, messagesErrorMessage } from '../services/messagesApi';
import {
  mapUnknownMessagePayload,
  type MappedChatTextMessage,
  type MessageMapContext,
} from '../utils/messageMapping';
import {
  countMediaGalleryRows,
  formatClockDuration,
  firstHttpUrlInText,
  isGalleryDocRow,
  isGalleryMediaRow,
  isLinkShareRow,
} from '../utils/chatMessageCategorize';

export type ConversationMediaScreenParams = {
  conversationId: string;
  peerDisplayName?: string;
};

type Segment = 'media' | 'links' | 'docs';

function sortNewestFirst(a: MappedChatTextMessage, b: MappedChatTextMessage): number {
  return (b.sentAtMs ?? 0) - (a.sentAtMs ?? 0);
}

function formatFileSizeShort(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function mediaFooterSummary(photos: number, videos: number): string {
  const parts: string[] = [];
  if (photos > 0) {
    parts.push(`${photos} Photo${photos === 1 ? '' : 's'}`);
  }
  if (videos > 0) {
    parts.push(`${videos} Video${videos === 1 ? '' : 's'}`);
  }
  return parts.join(', ') || 'No photos or videos';
}

const COLS = 4;

const ConversationMediaScreen = ({
  navigation,
  route,
}: {
  navigation: { goBack: () => void };
  route: { params?: ConversationMediaScreenParams };
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  const conversationId = route.params?.conversationId ?? '';
  const peerDisplayName = route.params?.peerDisplayName?.trim();

  const messageMapContext = useMemo<MessageMapContext>(
    () => ({ peerDisplayName: peerDisplayName || undefined }),
    [peerDisplayName],
  );

  const [segment, setSegment] = useState<Segment>('media');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MappedChatTextMessage[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [viewer, setViewer] = useState<{
    uri: string;
    isVideo: boolean;
    caption?: string;
  } | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const rawList = await fetchAllConversationMessages(conversationId);
        if (cancelled) {
          return;
        }
        const chronological = [...rawList].reverse();
        const mapped = chronological
          .map((row) => mapUnknownMessagePayload(row, user?.id, messageMapContext))
          .filter((m): m is MappedChatTextMessage => Boolean(m));
        setRows(mapped);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Could not load', messagesErrorMessage(e));
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, user?.id, messageMapContext]);

  const mediaItems = useMemo(
    () => rows.filter(isGalleryMediaRow).sort(sortNewestFirst),
    [rows],
  );
  const linkItems = useMemo(() => rows.filter(isLinkShareRow).sort(sortNewestFirst), [rows]);
  const docItems = useMemo(() => rows.filter(isGalleryDocRow).sort(sortNewestFirst), [rows]);

  const { photos, videos } = useMemo(() => countMediaGalleryRows(mediaItems), [mediaItems]);

  const gap = 2;
  const cellSize = Math.floor((windowWidth - gap * (COLS - 1)) / COLS);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onToggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const openLink = useCallback(async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', url);
      }
    } catch {
      Alert.alert('Cannot open link', url);
    }
  }, []);

  const openDoc = useCallback((uri: string | undefined, name: string) => {
    if (uri) {
      void openLink(uri);
      return;
    }
    Alert.alert(name, 'File link is not available for this message.');
  }, [openLink]);

  const renderMediaTile = useCallback(
    ({ item }: { item: MappedChatTextMessage }) => {
      const uri = item.imageUri!;
      const vid = Boolean(item.isVideo);
      const dur = item.videoDurationSec ?? 0;
      const sel = selectedIds.has(item.id);

      return (
        <Pressable
          style={[
            styles.tile,
            {
              width: cellSize,
              height: cellSize,
              marginRight: gap,
              marginBottom: gap,
            },
          ]}
          onPress={() => {
            if (selectMode) {
              toggleSelect(item.id);
            } else {
              setViewer({ uri, isVideo: vid, caption: item.body?.trim() || undefined });
            }
          }}
        >
          <Image source={{ uri }} style={styles.tileImage} resizeMode="cover" />
          {vid ? (
            <View style={styles.videoBadge} pointerEvents="none">
              <Ionicons name="videocam" size={14} color="#fff" />
            </View>
          ) : null}
          {vid && dur > 0 ? (
            <Text style={styles.durationBadge} pointerEvents="none">
              {formatClockDuration(dur)}
            </Text>
          ) : null}
          {selectMode ? (
            <View style={[styles.selectDot, sel && styles.selectDotOn]} pointerEvents="none">
              {sel ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </View>
          ) : null}
        </Pressable>
      );
    },
    [cellSize, selectMode, selectedIds, toggleSelect],
  );

  const footerLabel = useMemo(() => {
    if (segment === 'media') {
      return mediaFooterSummary(photos, videos);
    }
    if (segment === 'links') {
      const n = linkItems.length;
      return `${n} link${n === 1 ? '' : 's'}`;
    }
    const n = docItems.length;
    return `${n} document${n === 1 ? '' : 's'}`;
  }, [segment, photos, videos, linkItems.length, docItems.length]);

  if (!conversationId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Media, links, and docs</Text>
          <View style={styles.topBtn} />
        </View>
        <View style={styles.centerEmpty}>
          <Text style={styles.emptyText}>No conversation selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.segmentOuter}>
          {(['media', 'links', 'docs'] as const).map((key) => {
            const labels = { media: 'Media', links: 'Links', docs: 'Docs' };
            const on = segment === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSegment(key)}
                style={[styles.segmentCell, on && styles.segmentCellOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
                  {labels[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TouchableOpacity onPress={onToggleSelectMode} style={styles.selectBtn} hitSlop={8}>
          <Text style={styles.selectBtnText}>{selectMode ? 'Cancel' : 'Select'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerEmpty}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {segment === 'media' ? (
            <FlatList
              data={mediaItems}
              keyExtractor={(item) => item.id}
              renderItem={renderMediaTile}
              numColumns={COLS}
              key="media-grid"
              contentContainerStyle={styles.gridContent}
              ListEmptyComponent={
                <Text style={styles.listEmpty}>No media shared in this chat yet.</Text>
              }
            />
          ) : null}
          {segment === 'links' ? (
            <FlatList
              data={linkItems}
              keyExtractor={(item) => item.id}
              key="links-list"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.listEmpty}>No links shared in this chat yet.</Text>
              }
              renderItem={({ item }) => {
                const url = firstHttpUrlInText(item.body) ?? '';
                const preview = item.body.trim().slice(0, 120);
                return (
                  <Pressable
                    style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
                    onPress={() => void openLink(url)}
                  >
                    <View style={styles.linkIcon}>
                      <Ionicons name="link-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.linkBody}>
                      <Text style={styles.linkUrl} numberOfLines={2}>
                        {url}
                      </Text>
                      {preview && preview !== url ? (
                        <Text style={styles.linkSnippet} numberOfLines={2}>
                          {preview}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="open-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              }}
            />
          ) : null}
          {segment === 'docs' ? (
            <FlatList
              data={docItems}
              keyExtractor={(item) => item.id}
              key="docs-list"
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.listEmpty}>No documents shared in this chat yet.</Text>
              }
              renderItem={({ item }) => {
                const sizeStr =
                  item.docSizeBytes != null ? formatFileSizeShort(item.docSizeBytes) : '';
                return (
                  <Pressable
                    style={({ pressed }) => [styles.docRow, pressed && styles.rowPressed]}
                    onPress={() => openDoc(item.docUri, item.docName ?? 'File')}
                  >
                    <View style={styles.docIcon}>
                      <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.docBody}>
                      <Text style={styles.docName} numberOfLines={2}>
                        {item.docName}
                      </Text>
                      {sizeStr ? <Text style={styles.docMeta}>{sizeStr}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              }}
            />
          ) : null}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{footerLabel}</Text>
      </View>

      <Modal visible={viewer != null} animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerRoot}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewer(null)} hitSlop={16}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewer?.isVideo ? (
            <Video
              source={{ uri: viewer.uri }}
              style={styles.viewerVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : viewer ? (
            <Image source={{ uri: viewer.uri }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          {viewer?.caption ? (
            <Text style={styles.viewerCaption} numberOfLines={4}>
              {viewer.caption}
            </Text>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  segmentOuter: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCellOn: {
    backgroundColor: colors.background,
  },
  segmentText: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightMedium,
    color: colors.textMuted,
  },
  segmentTextOn: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeightSemiBold,
  },
  selectBtn: {
    minWidth: 56,
    paddingHorizontal: spacing.xs,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  gridContent: {
    paddingTop: 2,
    paddingBottom: spacing.lg,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: colors.dotInactive,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    padding: 2,
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    color: '#fff',
    fontSize: 11,
    fontWeight: typography.fontWeightSemiBold,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDotOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizeMD,
    color: colors.textMuted,
  },
  listEmpty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSizeMD,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
    minWidth: 0,
  },
  linkUrl: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  linkSnippet: {
    marginTop: 4,
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBody: {
    flex: 1,
    minWidth: 0,
  },
  docName: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  docMeta: {
    marginTop: 2,
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 2,
    padding: 8,
  },
  viewerImage: {
    width: '100%',
    flex: 1,
  },
  viewerVideo: {
    width: '100%',
    flex: 1,
  },
  viewerCaption: {
    padding: spacing.md,
    color: '#fff',
    fontSize: typography.fontSizeMD,
    textAlign: 'center',
  },
});

export default ConversationMediaScreen;
