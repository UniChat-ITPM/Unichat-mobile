import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
  Modal,
  Pressable,
  Alert,
  Image,
  Keyboard,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Swipeable } from 'react-native-gesture-handler';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import type { JoinConversationFailure, RealtimeEnvelope } from '../types/realtime';
import {
  deleteMessage,
  fetchConversationMessages,
  markConversationViewed,
  messagesErrorMessage,
  postTextMessage,
  uploadAndSendChatMedia,
} from '../services/messagesApi';
import {
  loadCachedMessagesRaw,
  prependMessageDtoToCache,
  saveCachedMessagesRaw,
} from '../services/chatCache';
import { mapUnknownMessagePayload, type MessageMapContext } from '../utils/messageMapping';
import { prepareChatImageForUpload } from '../utils/prepareChatImage';
import { ChatImageViewer, formatChatImageViewerDate } from '../components/chat/ChatImageViewer';
import { SCREENS } from '../constants';
import { getConversation } from '../services/conversationsApi';
import { resolveConversationAvatarUrl } from '../utils/conversationPreview';

export type ChatScreenParams = {
  name: string;
  /** Open Socket.IO room for this thread (UUID from API in production). */
  conversationId?: string;
  status?: string;
  unreadBackHrefCount?: number;
  isGroup?: boolean;
  imageUrl?: string | null;
};

type Quote = {
  author: string;
  snippet: string;
  accent: string;
};

type ChatMessage = {
  id: string;
  body: string;
  time: string;
  isMine: boolean;
  read?: boolean;
  quote?: Quote;
  imageUri?: string;
  voiceUri?: string;
  voiceDurationSec?: number;
  docName?: string;
  /** MIME type from document picker (e.g. application/pdf) */
  docMimeType?: string;
  docSizeBytes?: number;
  docPageCount?: number;
  contactName?: string;
  contactPhone?: string;
  /** When the message was created (for image viewer header date). */
  sentAtMs?: number;
};

type VoiceBubbleControl = {
  isPlaying: boolean;
  progress: number;
  onToggle: () => void;
};

function formatFileSize(bytes: number): string {
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

function fileLabelFromMessage(docName?: string, mime?: string): { ext: string; isPdf: boolean } {
  const fromName = docName?.includes('.') ? docName.split('.').pop()?.toLowerCase() : undefined;
  const fromMime =
    mime && mime.includes('/') ? mime.split('/').pop()?.toLowerCase().replace('jpeg', 'jpg') : undefined;
  const ext = fromName || fromMime || 'file';
  const isPdf = ext === 'pdf' || (mime?.toLowerCase().includes('pdf') ?? false);
  return { ext, isPdf };
}

function waveformHeights(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(4 + (h % 18));
  }
  return out;
}

function formatVoiceDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    body: 'Hey — are we still meeting at the library later?',
    time: '08:52',
    isMine: false,
  },
  {
    id: 'm1b',
    body: 'If you can, bring the printed handout too.',
    time: '08:53',
    isMine: false,
  },
  {
    id: 'm2',
    body: "Yes! I'll be there around 2. Grab a table near the windows if you can.",
    time: '08:54',
    isMine: true,
    read: true,
  },
  {
    id: 'm2b',
    body: 'See you then!',
    time: '08:55',
    isMine: true,
    read: true,
  },
  {
    id: 'm3',
    body: 'Perfect. I uploaded the latest slides to the drive.',
    time: '09:01',
    isMine: false,
    quote: {
      author: 'You',
      snippet: "Yes! I'll be there around 2…",
      accent: colors.secondary,
    },
  },
  {
    id: 'm4',
    body: 'Thanks — just downloaded them.',
    time: '09:03',
    isMine: true,
    read: true,
  },
];

/** WhatsApp-style corners: tail toward screen edge on first message in a run; stacked messages tuck the inner corner. */
const BUBBLE_R = 18;
const BUBBLE_TAIL = 5;

function bubbleRadiusTheirs(firstInGroup: boolean): ViewStyle {
  if (firstInGroup) {
    return {
      borderTopLeftRadius: BUBBLE_R,
      borderTopRightRadius: BUBBLE_R,
      borderBottomRightRadius: BUBBLE_R,
      borderBottomLeftRadius: BUBBLE_TAIL,
    };
  }
  return {
    borderTopLeftRadius: BUBBLE_TAIL,
    borderTopRightRadius: BUBBLE_R,
    borderBottomRightRadius: BUBBLE_R,
    borderBottomLeftRadius: BUBBLE_R,
  };
}

function bubbleRadiusMine(firstInGroup: boolean): ViewStyle {
  if (firstInGroup) {
    return {
      borderTopLeftRadius: BUBBLE_R,
      borderTopRightRadius: BUBBLE_R,
      borderBottomLeftRadius: BUBBLE_R,
      borderBottomRightRadius: BUBBLE_TAIL,
    };
  }
  return {
    borderTopLeftRadius: BUBBLE_R,
    borderTopRightRadius: BUBBLE_TAIL,
    borderBottomLeftRadius: BUBBLE_R,
    borderBottomRightRadius: BUBBLE_R,
  };
}

const CHAT_SKELETON_ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Shimmer-style placeholders while history loads (avoids blank white screen). */
function ChatHistorySkeleton() {
  return (
    <View style={chatSkeletonStyles.wrap}>
      {CHAT_SKELETON_ROWS.map((i) => (
        <View
          key={i}
          style={[chatSkeletonStyles.row, i % 2 === 0 ? chatSkeletonStyles.rowLeft : chatSkeletonStyles.rowRight]}
        >
          <View style={chatSkeletonStyles.bar} />
        </View>
      ))}
      <ActivityIndicator style={chatSkeletonStyles.spinner} color={colors.primary} size="small" />
    </View>
  );
}

const chatSkeletonStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  row: { marginBottom: 10, flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bar: {
    width: '72%',
    maxWidth: 280,
    height: 38,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  spinner: { marginTop: spacing.md },
});

const ChatScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const params = route.params as ChatScreenParams | undefined;
  const paramTitle = params?.name ?? 'Chat';
  const paramImageUrl = params?.imageUrl ?? null;
  const conversationId = params?.conversationId;
  const statusLine = params?.status ?? 'last seen today at 12:56';
  const backUnread = params?.unreadBackHrefCount;
  const { user } = useAuth();

  const [threadTitle, setThreadTitle] = useState(paramTitle);
  const [threadImageUrl, setThreadImageUrl] = useState<string | null>(paramImageUrl);

  useEffect(() => {
    setThreadTitle(paramTitle);
    setThreadImageUrl(paramImageUrl);
  }, [paramTitle, paramImageUrl]);

  useFocusEffect(
    useCallback(() => {
      if (!conversationId) {
        return undefined;
      }
      let cancelled = false;
      (async () => {
        try {
          const c = await getConversation(conversationId);
          if (cancelled) return;
          const name = String(c.title ?? c.name ?? '').trim();
          if (name) {
            setThreadTitle(name);
          }
          setThreadImageUrl(resolveConversationAvatarUrl(c, user?.id));
        } catch {
          /* keep header from route / last good fetch */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [conversationId, user?.id]),
  );

  const title = threadTitle;
  const headerPeerImageUrl = threadImageUrl;

  const messageMapContext = useMemo<MessageMapContext>(
    () => ({ peerDisplayName: title }),
    [title],
  );

  const listRef = useRef<FlatList<ChatMessage>>(null);
  /** When true, keep the list pinned to the newest message (bottom). */
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [conversationId]);
  const lastReplySwipeRef = useRef<Swipeable | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    conversationId ? [] : [...DEMO_MESSAGES],
  );
  const [historyLoading, setHistoryLoading] = useState(() => Boolean(conversationId));
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [contactPickVisible, setContactPickVisible] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState<Contacts.ExistingContact[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationMs, setRecordDurationMs] = useState(0);
  const [voiceActiveId, setVoiceActiveId] = useState<string | null>(null);
  const [voiceIsPlaying, setVoiceIsPlaying] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [imageViewerMessage, setImageViewerMessage] = useState<ChatMessage | null>(null);

  const handleRealtime = useCallback(
    (envelope: RealtimeEnvelope) => {
      if (!conversationId || typeof envelope.payload?.conversationId !== 'string') {
        return;
      }
      if (envelope.payload.conversationId !== conversationId) {
        return;
      }
      const p = envelope.payload as Record<string, unknown>;
      const t = envelope.type;

      if (t === 'MESSAGE_CREATED') {
        const row = mapUnknownMessagePayload(p, user?.id, messageMapContext);
        if (row) {
          void prependMessageDtoToCache(conversationId, p as Record<string, unknown>);
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) {
              return prev;
            }
            if (row.isMine) {
              const pendingIdx = prev.findIndex((m) => m.id.startsWith('pending-') && m.isMine);
              if (pendingIdx !== -1) {
                const next = [...prev];
                next[pendingIdx] = {
                  ...(row as ChatMessage),
                  quote: row.quote ?? prev[pendingIdx].quote,
                };
                return next.sort((a, b) => (a.sentAtMs ?? 0) - (b.sentAtMs ?? 0));
              }
            }
            return [...prev, row as ChatMessage].sort(
              (a, b) => (a.sentAtMs ?? 0) - (b.sentAtMs ?? 0),
            );
          });
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        }
        // Thread is open: keep inbox unread at 0 for this chat (server still increments for active viewers).
        void markConversationViewed(conversationId).catch(() => { });
        return;
      }
      if (t === 'MESSAGE_EDITED') {
        const newText = typeof p.newText === 'string' ? p.newText : null;
        const mid = p.messageId ?? p.id;
        if (mid != null && newText != null) {
          setMessages((prev) =>
            prev.map((m) => (m.id === String(mid) ? { ...m, body: newText } : m)),
          );
          return;
        }
        const row = mapUnknownMessagePayload(p, user?.id, messageMapContext);
        if (!row) {
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === row.id ? ({ ...m, body: row.body, time: row.time, quote: row.quote } as ChatMessage) : m,
          ),
        );
        return;
      }
      if (t === 'MESSAGE_DELETED') {
        const id = p.messageId ?? p.id;
        if (id == null) {
          return;
        }
        setMessages((prev) => prev.filter((m) => m.id !== String(id)));
        return;
      }
      if (t === 'MESSAGE_STATUS_UPDATED') {
        const id = p.messageId ?? p.id;
        if (id == null) {
          return;
        }
        const st = String(p.status ?? '').toUpperCase();
        const read = Boolean(p.read) || st === 'READ';
        setMessages((prev) =>
          prev.map((m) => (m.id === String(id) ? { ...m, read } : m)),
        );
      }
    },
    [conversationId, user?.id, messageMapContext],
  );

  const handleJoinFailure = useCallback(
    (joinedId: string, failure: JoinConversationFailure) => {
      if (joinedId !== conversationId) {
        return;
      }
      if (failure.error === 'FORBIDDEN') {
        Alert.alert('Cannot open chat', 'You do not have access to this conversation.');
      }
    },
    [conversationId],
  );

  const scrollListToLatest = useCallback(() => {
    if (!stickToBottomRef.current) {
      return;
    }
    const run = () => listRef.current?.scrollToEnd({ animated: false });
    run();
    requestAnimationFrame(run);
    setTimeout(run, 32);
    setTimeout(run, 150);
    setTimeout(run, 400);
  }, []);

  const onMessageListContentSizeChange = useCallback(() => {
    if (!conversationId || messages.length === 0) {
      return;
    }
    scrollListToLatest();
  }, [conversationId, messages.length, scrollListToLatest]);

  const { joinConversation, leaveConversation } = useChatSocket({
    onRealtime: handleRealtime,
    onJoinFailure: handleJoinFailure,
    onDisconnect: (reason) => {
      if (__DEV__) {
        console.warn('[ChatScreen] socket disconnected:', reason);
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!conversationId) {
        return;
      }
      void markConversationViewed(conversationId).catch(() => {
        /* offline or stale session — list will reconcile on next load */
      });
    }, [conversationId]),
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    let cancelled = false;
    (async () => {
      const ack = await joinConversation(conversationId);
      if (cancelled) {
        return;
      }
      if (!ack.ok && 'error' in ack && ack.error === 'FORBIDDEN') {
        Alert.alert('Cannot open chat', 'You do not have access to this conversation.');
      }
    })();
    return () => {
      cancelled = true;
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    if (!conversationId) {
      setHistoryLoading(false);
      setMessages([...DEMO_MESSAGES]);
      return;
    }
    setHistoryLoading(true);
    setMessages([]);
    let cancelled = false;
    (async () => {
      const rawCache = await loadCachedMessagesRaw(conversationId);
      if (rawCache && !cancelled) {
        try {
          const parsed = JSON.parse(rawCache) as unknown[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const chronological = [...parsed].reverse();
            const mapped = chronological
              .map((row) => mapUnknownMessagePayload(row, user?.id, messageMapContext))
              .filter((m): m is NonNullable<typeof m> => Boolean(m))
              .map((m) => ({ ...m }) as ChatMessage);
            setMessages(mapped);
            setHistoryLoading(false);
            stickToBottomRef.current = true;
            InteractionManager.runAfterInteractions(() => scrollListToLatest());
            requestAnimationFrame(() => scrollListToLatest());
          }
        } catch {
          /* ignore corrupt cache */
        }
      }
      try {
        const { messages: rows } = await fetchConversationMessages(conversationId, { limit: 80 });
        if (cancelled) {
          return;
        }
        void saveCachedMessagesRaw(conversationId, JSON.stringify(rows));
        const chronological = [...rows].reverse();
        const mapped = chronological
          .map((row) => mapUnknownMessagePayload(row, user?.id, messageMapContext))
          .filter((m): m is NonNullable<typeof m> => Boolean(m))
          .map((m) => ({ ...m }) as ChatMessage);
        setMessages(mapped);
        stickToBottomRef.current = true;
        InteractionManager.runAfterInteractions(() => scrollListToLatest());
        requestAnimationFrame(() => scrollListToLatest());
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Could not load messages', messagesErrorMessage(e));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, user?.id, messageMapContext, scrollListToLatest]);

  const mediaLinksDocsCount = useMemo(
    () => messages.filter((m) => Boolean(m.imageUri || m.docName)).length,
    [messages],
  );

  const openParticipantProfile = useCallback(() => {
    navigation.navigate(SCREENS.PARTICIPANT_PROFILE, {
      participantName: title,
      subtitle: statusLine,
      mediaCount: mediaLinksDocsCount,
      conversationId: conversationId,
      isGroup: params?.isGroup,
      imageUrl: headerPeerImageUrl,
    });
  }, [
    navigation,
    title,
    statusLine,
    mediaLinksDocsCount,
    conversationId,
    params?.isGroup,
    headerPeerImageUrl,
  ]);

  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  /** Tracks live recording length; final status from stop often has durationMillis = 0 on Android. */
  const recordDurationMsRef = useRef(0);
  const voiceSoundRef = useRef<Audio.Sound | null>(null);

  const hasDraft = draft.trim().length > 0;

  const closeMessageMenu = useCallback(() => setMenuMessage(null), []);

  const handleMenuReply = useCallback(() => {
    if (menuMessage) {
      setReplyTarget(menuMessage);
    }
    closeMessageMenu();
  }, [menuMessage, closeMessageMenu]);

  const handleMenuCopy = useCallback(async () => {
    if (!menuMessage) {
      return;
    }
    const body = menuMessage.body?.trim() ?? '';
    const fallback =
      (menuMessage.voiceUri && `Voice message · ${formatVoiceDuration(menuMessage.voiceDurationSec ?? 0)}`) ||
      menuMessage.docName ||
      menuMessage.contactName ||
      (menuMessage.imageUri && 'Photo') ||
      '';
    await Clipboard.setStringAsync(body || fallback);
    closeMessageMenu();
  }, [menuMessage, closeMessageMenu]);

  const handleMenuDelete = useCallback(async () => {
    if (!menuMessage) {
      return;
    }
    if (!menuMessage.isMine) {
      Alert.alert("Can't delete", 'You can only delete your own messages.');
      closeMessageMenu();
      return;
    }
    const mid = menuMessage.id;
    if (conversationId && !mid.startsWith('local-')) {
      closeMessageMenu();
      try {
        await deleteMessage(mid);
        setMessages((prev) => prev.filter((m) => m.id !== mid));
      } catch (e) {
        Alert.alert('Could not delete', messagesErrorMessage(e));
      }
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== mid));
    closeMessageMenu();
  }, [menuMessage, closeMessageMenu, conversationId]);

  const handleMenuForward = useCallback(() => {
    closeMessageMenu();
    Alert.alert('Forward', 'Forwarding will be available soon.');
  }, [closeMessageMenu]);

  const handleMenuMore = useCallback(() => {
    closeMessageMenu();
    Alert.alert('More', 'Additional options coming soon.');
  }, [closeMessageMenu]);

  const scrollToEnd = useCallback(() => {
    stickToBottomRef.current = true;
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const closeImageViewer = useCallback(() => setImageViewerMessage(null), []);

  const handleImageViewerReply = useCallback(() => {
    if (!imageViewerMessage) {
      return;
    }
    const m = imageViewerMessage;
    setImageViewerMessage(null);
    setReplyTarget(m);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [imageViewerMessage]);

  const handleImageViewerDelete = useCallback(() => {
    if (!imageViewerMessage?.isMine) {
      return;
    }
    const id = imageViewerMessage.id;
    Alert.alert('Delete photo?', 'This will remove the message from the chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setMessages((prev) => prev.filter((m) => m.id !== id));
          setImageViewerMessage(null);
        },
      },
    ]);
  }, [imageViewerMessage]);

  const pushOutgoing = useCallback(
    (msg: Omit<ChatMessage, 'id' | 'time' | 'isMine'> & Partial<Pick<ChatMessage, 'id' | 'time'>>) => {
      const now = new Date();
      const time =
        msg.time ??
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const id = msg.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id,
          time,
          isMine: true,
          read: false,
          sentAtMs: msg.sentAtMs ?? Date.now(),
        },
      ]);
      requestAnimationFrame(scrollToEnd);
    },
    [scrollToEnd],
  );

  useEffect(() => {
    return () => {
      void recordingRef.current?.stopAndUnloadAsync();
    };
  }, []);

  const unloadVoiceSound = useCallback(async () => {
    const s = voiceSoundRef.current;
    voiceSoundRef.current = null;
    if (!s) {
      return;
    }
    try {
      await s.stopAsync();
      await s.unloadAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      void unloadVoiceSound();
    };
  }, [unloadVoiceSound]);

  const toggleVoicePlayback = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.voiceUri) {
        return;
      }
      try {
        if (voiceActiveId === msg.id) {
          const s = voiceSoundRef.current;
          if (!s) {
            return;
          }
          const st = await s.getStatusAsync();
          if (!st.isLoaded) {
            return;
          }
          if (st.isPlaying) {
            await s.pauseAsync();
            setVoiceIsPlaying(false);
          } else {
            await s.playAsync();
            setVoiceIsPlaying(true);
          }
          return;
        }

        await unloadVoiceSound();
        setVoiceProgress(0);
        setVoiceActiveId(msg.id);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: msg.voiceUri },
          { shouldPlay: true, progressUpdateIntervalMillis: 120 },
          (status) => {
            if (!status.isLoaded) {
              return;
            }
            if (status.didJustFinish) {
              setVoiceIsPlaying(false);
              setVoiceProgress(0);
              void sound.setPositionAsync(0);
              return;
            }
            if (status.durationMillis && status.durationMillis > 0) {
              setVoiceProgress((status.positionMillis ?? 0) / status.durationMillis);
            }
            if (typeof status.isPlaying === 'boolean') {
              setVoiceIsPlaying(status.isPlaying);
            }
          },
        );
        voiceSoundRef.current = sound;
        setVoiceIsPlaying(true);
      } catch {
        Alert.alert('Playback', 'Could not play this voice message.');
        setVoiceActiveId(null);
        setVoiceIsPlaying(false);
        voiceSoundRef.current = null;
      }
    },
    [voiceActiveId, unloadVoiceSound],
  );

  const voiceControlFor = useCallback(
    (item: ChatMessage): VoiceBubbleControl | undefined => {
      if (!item.voiceUri) {
        return undefined;
      }
      return {
        isPlaying: voiceActiveId === item.id && voiceIsPlaying,
        progress: voiceActiveId === item.id ? voiceProgress : 0,
        onToggle: () => {
          void toggleVoicePlayback(item);
        },
      };
    },
    [voiceActiveId, voiceIsPlaying, voiceProgress, toggleVoicePlayback],
  );

  const peerInitial = title.trim().charAt(0).toUpperCase() || 'C';
  const selfAvatarUri = user?.profilePhoto ?? user?.avatarUrl;
  const selfInitial =
    user?.displayName?.trim().charAt(0).toUpperCase() || user?.phoneNumber?.slice(-2) || '?';

  const sendUploadedMedia = useCallback(
    async (opts: {
      fileUri: string;
      fileName: string;
      mimeType: string;
      localImageUri?: string;
      localVoiceUri?: string;
      voiceDurationSec?: number;
      docMeta?: { docName: string; docMimeType?: string; docSizeBytes?: number };
    }) => {
      if (!conversationId || !user?.id) {
        Alert.alert('Chat', 'Open a conversation first.');
        return;
      }
      const reply = replyTarget;
      const quote: Quote | undefined = reply
        ? {
          author: reply.isMine ? 'You' : title,
          snippet:
            reply.body.length > 72 ? `${reply.body.slice(0, 69)}…` : reply.body || '…',
          accent: reply.isMine ? colors.secondary : colors.primary,
        }
        : undefined;
      const replyId =
        reply && !String(reply.id).startsWith('local-') && !String(reply.id).startsWith('pending-')
          ? reply.id
          : undefined;
      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const optimistic: ChatMessage = {
        id: pendingId,
        body: opts.localVoiceUri ? '' : opts.docMeta ? opts.docMeta.docName : ' ',
        time,
        isMine: true,
        read: false,
        sentAtMs: now.getTime(),
        ...(opts.localImageUri ? { imageUri: opts.localImageUri } : {}),
        ...(opts.localVoiceUri
          ? { voiceUri: opts.localVoiceUri, voiceDurationSec: opts.voiceDurationSec ?? 0 }
          : {}),
        ...(opts.docMeta
          ? {
            docName: opts.docMeta.docName,
            docMimeType: opts.docMeta.docMimeType,
            docSizeBytes: opts.docMeta.docSizeBytes,
          }
          : {}),
        ...(quote ? { quote } : {}),
      };
      setMessages((prev) => [...prev, optimistic]);
      setReplyTarget(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      try {
        const created = await uploadAndSendChatMedia({
          conversationId,
          fileUri: opts.fileUri,
          fileName: opts.fileName,
          mimeType: opts.mimeType,
          replyToMessageId: replyId ?? null,
        });
        void prependMessageDtoToCache(
          conversationId,
          created as unknown as Record<string, unknown>,
        );
        const row = mapUnknownMessagePayload(created, user.id, messageMapContext);
        if (row) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) {
              return prev.filter((m) => m.id !== pendingId);
            }
            return prev.map((m) =>
              m.id === pendingId ? ({ ...row, quote: row.quote ?? quote } as ChatMessage) : m,
            );
          });
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        }
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        Alert.alert('Could not send', messagesErrorMessage(e));
      }
    },
    [conversationId, user?.id, messageMapContext, replyTarget, title],
  );

  const stopRecordingAndSend = useCallback(async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) {
      return;
    }
    try {
      const uriBeforeStop = rec.getURI();
      const status = await rec.stopAndUnloadAsync();
      const uri = (status.uri ?? uriBeforeStop ?? rec.getURI()) || undefined;
      const durationMs = Math.max(status.durationMillis ?? 0, recordDurationMsRef.current);
      const sec = Math.max(0, durationMs / 1000);
      if (!uri) {
        Alert.alert('Recording', 'No audio file was created. Try again.');
        return;
      }
      if (sec < 0.25 && durationMs < 250) {
        Alert.alert('Recording', 'Recording was too short. Hold the mic for a moment longer.');
        return;
      }
      const lower = uri.toLowerCase();
      const ext = lower.includes('.') ? lower.split('.').pop() : 'm4a';
      const safeExt = ext === 'mp4' || ext === 'm4a' ? ext : 'm4a';
      await sendUploadedMedia({
        fileUri: uri,
        fileName: `voice-${Date.now()}.${safeExt}`,
        mimeType: ext === 'caf' ? 'audio/x-caf' : 'audio/mp4',
        localVoiceUri: uri,
        voiceDurationSec: sec,
      });
    } catch {
      Alert.alert('Recording', 'Could not save this voice message.');
    } finally {
      setIsRecording(false);
      setRecordDurationMs(0);
      recordDurationMsRef.current = 0;
    }
  }, [sendUploadedMedia]);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Microphone', 'Allow microphone access to send voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
      recordDurationMsRef.current = 0;
      recording.setOnRecordingStatusUpdate((s) => {
        if (s.durationMillis != null && s.durationMillis > 0) {
          recordDurationMsRef.current = s.durationMillis;
          setRecordDurationMs(s.durationMillis);
        }
      });
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordDurationMs(0);
      setShowAttachSheet(false);
      Keyboard.dismiss();
    } catch {
      Alert.alert('Recording', 'Could not start recording.');
    }
  }, [isRecording]);

  const onMicPress = useCallback(() => {
    if (isRecording) {
      void stopRecordingAndSend();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecordingAndSend]);

  const handlePickPhoto = useCallback(async () => {
    setShowAttachSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Photos', 'Allow photo library access to attach images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    });
    if (res.canceled || !res.assets?.[0]) {
      return;
    }
    const asset = res.assets[0];
    const prepared = await prepareChatImageForUpload(asset.uri, asset.fileName);
    await sendUploadedMedia({
      fileUri: prepared.uri,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      localImageUri: prepared.uri,
    });
  }, [sendUploadedMedia]);

  const handleTakeCamera = useCallback(async () => {
    setShowAttachSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera', 'Allow camera access to take photos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
    if (res.canceled || !res.assets?.[0]) {
      return;
    }
    const asset = res.assets[0];
    const prepared = await prepareChatImageForUpload(asset.uri, asset.fileName);
    await sendUploadedMedia({
      fileUri: prepared.uri,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
      localImageUri: prepared.uri,
    });
  }, [sendUploadedMedia]);

  const handlePickDocument = useCallback(async () => {
    setShowAttachSheet(false);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) {
      return;
    }
    const a = res.assets[0];
    await sendUploadedMedia({
      fileUri: a.uri,
      fileName: a.name,
      mimeType: a.mimeType ?? 'application/octet-stream',
      docMeta: {
        docName: a.name,
        docMimeType: a.mimeType ?? undefined,
        docSizeBytes: typeof a.size === 'number' ? a.size : undefined,
      },
    });
  }, [sendUploadedMedia]);

  const openContactPicker = useCallback(async () => {
    setShowAttachSheet(false);
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Contacts', 'Allow contacts access to share a contact.');
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      pageSize: 200,
      pageOffset: 0,
      sort: Contacts.SortTypes.FirstName,
    });
    if (!data.length) {
      Alert.alert('Contacts', 'No contacts found.');
      return;
    }
    setContactsLoaded(data);
    setContactPickVisible(true);
  }, []);

  const sendContactAsMessage = useCallback(
    (c: Contacts.ExistingContact) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact';
      const phone = c.phoneNumbers?.[0]?.number ?? '';
      const body = phone ? `${name}\n${phone}` : name;
      setContactPickVisible(false);
      pushOutgoing({ body, contactName: name, contactPhone: phone || undefined });
    },
    [pushOutgoing],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const reply = replyTarget;
    const quote: Quote | undefined = reply
      ? {
        author: reply.isMine ? 'You' : title,
        snippet: reply.body.length > 72 ? `${reply.body.slice(0, 69)}…` : reply.body,
        accent: reply.isMine ? colors.secondary : colors.primary,
      }
      : undefined;

    if (conversationId && user?.id) {
      const replyId =
        reply && !String(reply.id).startsWith('local-') && !String(reply.id).startsWith('pending-')
          ? reply.id
          : undefined;
      const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        body: text,
        time,
        isMine: true,
        read: false,
        sentAtMs: now.getTime(),
        ...(quote ? { quote } : {}),
      };
      setMessages((prev) => [...prev, optimistic]);
      setDraft('');
      setReplyTarget(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

      try {
        const created = await postTextMessage({
          conversationId,
          text,
          replyToMessageId: replyId ?? null,
        });
        void prependMessageDtoToCache(
          conversationId,
          created as unknown as Record<string, unknown>,
        );
        const row = mapUnknownMessagePayload(created, user.id, messageMapContext);
        if (row) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) {
              return prev
                .filter((m) => m.id !== optimisticId)
                .map((m) => (m.id === row.id ? ({ ...m, quote: row.quote ?? m.quote } as ChatMessage) : m));
            }
            return prev.map((m) =>
              m.id === optimisticId ? ({ ...row, quote: row.quote ?? quote } as ChatMessage) : m,
            );
          });
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        }
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        Alert.alert('Could not send', messagesErrorMessage(e));
      }
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        body: text,
        time,
        isMine: true,
        read: false,
        sentAtMs: now.getTime(),
        ...(quote ? { quote } : {}),
      },
    ]);
    setDraft('');
    setReplyTarget(null);
  }, [draft, replyTarget, title, conversationId, user?.id, messageMapContext]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number }; contentSize: { height: number } } }) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    stickToBottomRef.current = distanceFromBottom <= 160;
    setShowScrollDown(distanceFromBottom > 120);
  }, []);

  const renderReplySwipeActions = useCallback(() => {
    return (
      <View style={styles.replySwipeActions}>
        <View style={styles.replySwipeIconCircle}>
          <Ionicons name="return-down-back" size={22} color={colors.primary} />
        </View>
      </View>
    );
  }, []);

  const onReplySwipeOpen = useCallback(
    (item: ChatMessage) => (direction: 'left' | 'right', swipeable: Swipeable) => {
      // Either direction = user chose reply (WhatsApp: swipe right opens left panel → 'left')
      if (direction !== 'left' && direction !== 'right') {
        return;
      }
      lastReplySwipeRef.current?.close();
      lastReplySwipeRef.current = swipeable;
      setReplyTarget(item);
      swipeable.close();
    },
    [],
  );

  const renderMessage: ListRenderItem<ChatMessage> = useCallback(
    ({ item, index }) => {
      const prev = index > 0 ? messages[index - 1] : null;
      const isContinuation = Boolean(prev && prev.isMine === item.isMine);
      const rowSpacingStyle =
        index === 0 ? undefined : isContinuation ? styles.rowContinuation : styles.rowNewSpeaker;
      const firstInGroup = !isContinuation;

      const openMenu = () => setMenuMessage(item);
      const isRichBubble = Boolean(
        item.imageUri || item.voiceUri || item.docName || item.contactName,
      );
      const isImageMsg = Boolean(item.imageUri);
      const isContactMsg = Boolean(item.contactName) && !isImageMsg;

      const bubble = item.isMine ? (
        <Pressable
          onLongPress={openMenu}
          delayLongPress={380}
          android_disableSound
          style={styles.bubblePressable}
        >
          <View
            style={[
              styles.bubble,
              styles.bubbleMine,
              bubbleRadiusMine(firstInGroup),
              isImageMsg && styles.bubbleNoPad,
              isContactMsg && styles.bubbleNoPad,
            ]}
          >
            {item.quote && !isImageMsg ? (
              <View style={[styles.quoteBlock, styles.quoteBlockMine, (isContactMsg) && styles.quoteInCard]}>
                <View style={[styles.quoteBar, { backgroundColor: item.quote.accent }]} />
                <View style={styles.quoteTextWrap}>
                  <Text style={styles.quoteAuthorMine}>{item.quote.author}</Text>
                  <Text style={styles.quoteSnippetMine} numberOfLines={2}>
                    {item.quote.snippet}
                  </Text>
                </View>
              </View>
            ) : null}
            {isRichBubble ? (
              <ChatBubbleRichBody
                item={item}
                isMine
                peerInitial={peerInitial}
                selfAvatarUri={selfAvatarUri}
                selfInitial={selfInitial}
                voiceControl={voiceControlFor(item)}
                time={item.time}
                read={item.read}
                onImagePress={item.imageUri ? () => setImageViewerMessage(item) : undefined}
              />
            ) : (
              <View style={styles.messageAndMetaRow}>
                <Text style={[styles.bubbleTextMine, styles.bubbleTextShrink]}>{item.body}</Text>
                <View style={styles.metaClusterMine}>
                  <Text style={styles.timeMine}>{item.time}</Text>
                  <Ionicons
                    name="checkmark-done"
                    size={15}
                    color={item.read ? colors.primaryLight : 'rgba(255,255,255,0.5)'}
                    style={styles.readIcon}
                  />
                </View>
              </View>
            )}
          </View>
        </Pressable>
      ) : (
        <Pressable
          onLongPress={openMenu}
          delayLongPress={380}
          android_disableSound
          style={styles.bubblePressable}
        >
          <View
            style={[
              styles.bubble,
              styles.bubbleTheirs,
              bubbleRadiusTheirs(firstInGroup),
              isImageMsg && styles.bubbleNoPad,
              isContactMsg && styles.bubbleNoPad,
            ]}
          >
            {item.quote && !isImageMsg ? (
              <View style={[styles.quoteBlock, styles.quoteBlockTheirs, (isContactMsg) && styles.quoteInCard]}>
                <View style={[styles.quoteBar, { backgroundColor: item.quote.accent }]} />
                <View style={styles.quoteTextWrap}>
                  <Text style={styles.quoteAuthorTheirs}>{item.quote.author}</Text>
                  <Text style={styles.quoteSnippetTheirs} numberOfLines={2}>
                    {item.quote.snippet}
                  </Text>
                </View>
              </View>
            ) : null}
            {isRichBubble ? (
              <ChatBubbleRichBody
                item={item}
                isMine={false}
                peerInitial={peerInitial}
                selfAvatarUri={selfAvatarUri}
                selfInitial={selfInitial}
                voiceControl={voiceControlFor(item)}
                time={item.time}
                read={item.read}
                onImagePress={item.imageUri ? () => setImageViewerMessage(item) : undefined}
              />
            ) : (
              <View style={styles.messageAndMetaRow}>
                <Text style={[styles.bubbleTextTheirs, styles.bubbleTextShrink]}>{item.body}</Text>
                <Text style={styles.timeTheirs}>{item.time}</Text>
              </View>
            )}
          </View>
        </Pressable>
      );

      return (
        <View style={styles.messageSwipeShell}>
          <Swipeable
            friction={2}
            overshootLeft={false}
            overshootRight={false}
            leftThreshold={40}
            rightThreshold={40}
            renderLeftActions={renderReplySwipeActions}
            renderRightActions={renderReplySwipeActions}
            onSwipeableOpen={onReplySwipeOpen(item)}
            containerStyle={styles.swipeableContainer}
            childrenContainerStyle={styles.swipeableChildren}
            activeOffsetX={[-12, 12]}
            failOffsetY={[-12, 12]}
          >
            <View
              style={[
                styles.swipeInnerRow,
                item.isMine ? styles.swipeInnerRowMine : styles.swipeInnerRowTheirs,
              ]}
            >
              <View style={[styles.row, rowSpacingStyle]}>{bubble}</View>
            </View>
          </Swipeable>
        </View>
      );
    },
    [
      messages,
      onReplySwipeOpen,
      renderReplySwipeActions,
      peerInitial,
      selfAvatarUri,
      selfInitial,
      voiceControlFor,
    ],
  );

  const menuRich = menuMessage
    ? Boolean(
      menuMessage.imageUri ||
      menuMessage.voiceUri ||
      menuMessage.docName ||
      menuMessage.contactName,
    )
    : false;

  const menuIsImage = menuMessage ? Boolean(menuMessage.imageUri) : false;
  const menuIsContact = menuMessage ? Boolean(menuMessage.contactName) && !menuIsImage : false;

  const menuBubblePreview =
    menuMessage &&
    (menuMessage.isMine ? (
      <View
        style={[
          styles.bubble,
          styles.bubbleMine,
          bubbleRadiusMine(true),
          styles.menuBubblePreview,
          (menuIsImage || menuIsContact) && styles.bubbleNoPad,
        ]}
      >
        {menuMessage.quote && !menuIsImage ? (
          <View style={[styles.quoteBlock, styles.quoteBlockMine, menuIsContact && styles.quoteInCard]}>
            <View style={[styles.quoteBar, { backgroundColor: menuMessage.quote.accent }]} />
            <View style={styles.quoteTextWrap}>
              <Text style={styles.quoteAuthorMine}>{menuMessage.quote.author}</Text>
              <Text style={styles.quoteSnippetMine} numberOfLines={2}>
                {menuMessage.quote.snippet}
              </Text>
            </View>
          </View>
        ) : null}
        {menuRich ? (
          <ChatBubbleRichBody
            item={menuMessage}
            isMine
            peerInitial={peerInitial}
            selfAvatarUri={selfAvatarUri}
            selfInitial={selfInitial}
            voiceControl={voiceControlFor(menuMessage)}
            time={menuMessage.time}
            read={menuMessage.read}
          />
        ) : (
          <View style={styles.messageAndMetaRow}>
            <Text style={[styles.bubbleTextMine, styles.bubbleTextShrink]}>{menuMessage.body}</Text>
            <View style={styles.metaClusterMine}>
              <Text style={styles.timeMine}>{menuMessage.time}</Text>
              <Ionicons
                name="checkmark-done"
                size={15}
                color={menuMessage.read ? colors.primaryLight : 'rgba(255,255,255,0.5)'}
                style={styles.readIcon}
              />
            </View>
          </View>
        )}
      </View>
    ) : (
      <View
        style={[
          styles.bubble,
          styles.bubbleTheirs,
          bubbleRadiusTheirs(true),
          styles.menuBubblePreview,
          (menuIsImage || menuIsContact) && styles.bubbleNoPad,
        ]}
      >
        {menuMessage.quote && !menuIsImage ? (
          <View style={[styles.quoteBlock, styles.quoteBlockTheirs, menuIsContact && styles.quoteInCard]}>
            <View style={[styles.quoteBar, { backgroundColor: menuMessage.quote.accent }]} />
            <View style={styles.quoteTextWrap}>
              <Text style={styles.quoteAuthorTheirs}>{menuMessage.quote.author}</Text>
              <Text style={styles.quoteSnippetTheirs} numberOfLines={2}>
                {menuMessage.quote.snippet}
              </Text>
            </View>
          </View>
        ) : null}
        {menuRich ? (
          <ChatBubbleRichBody
            item={menuMessage}
            isMine={false}
            peerInitial={peerInitial}
            selfAvatarUri={selfAvatarUri}
            selfInitial={selfInitial}
            voiceControl={voiceControlFor(menuMessage)}
            time={menuMessage.time}
            read={menuMessage.read}
          />
        ) : (
          <View style={styles.messageAndMetaRow}>
            <Text style={[styles.bubbleTextTheirs, styles.bubbleTextShrink]}>{menuMessage.body}</Text>
            <Text style={styles.timeTheirs}>{menuMessage.time}</Text>
          </View>
        )}
      </View>
    ));

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
              {typeof backUnread === 'number' && backUnread > 0 ? (
                <Text style={styles.backUnread}>{backUnread > 99 ? '99+' : backUnread}</Text>
              ) : null}
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.headerAvatar}>
                {headerPeerImageUrl?.trim() ? (
                  <Image
                    source={{ uri: headerPeerImageUrl.trim() }}
                    style={styles.headerAvatarImage}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Text style={styles.headerAvatarLetter}>{title.trim().charAt(0).toUpperCase() || 'C'}</Text>
                )}
              </View>
              <Pressable
                onPress={openParticipantProfile}
                style={({ pressed }) => [styles.headerTitlesPressable, pressed && styles.headerTitlesPressed]}
                android_ripple={{ color: 'rgba(79, 70, 229, 0.12)' }}
                accessibilityRole="button"
                accessibilityLabel={`${title} contact info`}
              >
                <View style={styles.headerTitles}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.headerStatus} numberOfLines={1}>
                    {statusLine}
                  </Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate(SCREENS.CALL, {
                    mode: 'video',
                    peerName: title,
                    avatarColor: colors.dotInactive,
                  })
                }
                accessibilityLabel="Video call demo"
              >
                <Ionicons name="videocam-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate(SCREENS.CALL, {
                    mode: 'voice',
                    peerName: title,
                    avatarColor: colors.dotInactive,
                  })
                }
                accessibilityLabel="Voice call demo"
              >
                <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chatSurface}>
            {historyLoading && messages.length === 0 ? (
              <ChatHistorySkeleton />
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={[
                  styles.messageList,
                  messages.length > 0 ? styles.messageListStickToBottom : null,
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                onContentSizeChange={onMessageListContentSizeChange}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={Platform.OS === 'android'}
                initialNumToRender={24}
                maxToRenderPerBatch={12}
                windowSize={7}
              />
            )}

            {showScrollDown ? (
              <TouchableOpacity style={styles.scrollFab} onPress={scrollToEnd} activeOpacity={0.9}>
                <Ionicons name="chevron-down" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {replyTarget ? (
            <View style={styles.replyPreviewBar}>
              <View
                style={[
                  styles.replyPreviewAccent,
                  {
                    backgroundColor: replyTarget.isMine ? colors.secondary : colors.primary,
                  },
                ]}
              />
              <View style={styles.replyPreviewTextCol}>
                <Text style={styles.replyPreviewName} numberOfLines={1}>
                  {replyTarget.isMine ? 'You' : title}
                </Text>
                <Text style={styles.replyPreviewSnippet} numberOfLines={2}>
                  {replyTarget.body}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.replyPreviewClose}
                onPress={() => setReplyTarget(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Cancel reply"
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {isRecording ? (
            <View style={styles.recordingBanner}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Recording {formatVoiceDuration(recordDurationMs / 1000)} · tap mic to send
              </Text>
            </View>
          ) : null}

          {showAttachSheet ? (
            <View style={styles.attachSheet}>
              <View style={styles.attachHandle} />
              <View style={styles.attachGrid}>
                <TouchableOpacity style={styles.attachCell} onPress={handlePickPhoto} activeOpacity={0.85}>
                  <View style={[styles.attachIconCircle, styles.attachIconPhotos]}>
                    <Ionicons name="images" size={26} color={colors.textLight} />
                  </View>
                  <Text style={styles.attachLabel}>Photos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachCell} onPress={handleTakeCamera} activeOpacity={0.85}>
                  <View style={[styles.attachIconCircle, styles.attachIconCamera]}>
                    <Ionicons name="camera" size={26} color={colors.textLight} />
                  </View>
                  <Text style={styles.attachLabel}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachCell} onPress={openContactPicker} activeOpacity={0.85}>
                  <View style={[styles.attachIconCircle, styles.attachIconContact]}>
                    <Ionicons name="person" size={26} color={colors.textLight} />
                  </View>
                  <Text style={styles.attachLabel}>Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachCell} onPress={handlePickDocument} activeOpacity={0.85}>
                  <View style={[styles.attachIconCircle, styles.attachIconDocument]}>
                    <Ionicons name="document-text" size={26} color={colors.textLight} />
                  </View>
                  <Text style={styles.attachLabel}>Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.composerWrap}>
            {showAttachSheet ? (
              <TouchableOpacity
                style={styles.composerPlus}
                activeOpacity={0.85}
                onPress={() => {
                  setShowAttachSheet(false);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                accessibilityLabel="Show keyboard"
              >
                <Ionicons name="keypad-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.composerPlus}
                activeOpacity={0.85}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowAttachSheet(true);
                }}
                accessibilityLabel="Attachments"
              >
                <Ionicons name="add" size={28} color={colors.primary} />
              </TouchableOpacity>
            )}

            <View style={styles.composerField}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor={colors.textMuted}
                style={styles.composerInput}
                multiline
              />
            </View>

            <TouchableOpacity
              style={styles.composerCameraButton}
              onPress={handleTakeCamera}
              activeOpacity={0.85}
              accessibilityLabel="Open camera"
            >
              <Ionicons name="camera-outline" size={26} color={colors.primary} />
            </TouchableOpacity>

            {hasDraft ? (
              <TouchableOpacity
                style={styles.composerCircleButton}
                onPress={handleSend}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons name="send" size={22} color={colors.textLight} style={styles.sendIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.composerCircleButton, isRecording && styles.composerCircleRecord]}
                onPress={onMicPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop and send recording' : 'Record voice message'}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={isRecording ? 22 : 24}
                  color={colors.textLight}
                />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={menuMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMessageMenu}
        statusBarTranslucent
      >
        <View style={styles.msgMenuRoot}>
          <BlurView
            intensity={88}
            tint="light"
            {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={[StyleSheet.absoluteFill, styles.msgMenuDimOverlay]}
            onPress={closeMessageMenu}
            accessibilityLabel="Close menu"
          />
          <View pointerEvents="box-none" style={styles.msgMenuCenterWrap}>
            <View style={styles.msgMenuColumn}>
              {menuBubblePreview}

              <View style={styles.contextMenuCard}>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMenuReply} activeOpacity={0.75}>
                  <Text style={styles.contextMenuLabel}>Reply</Text>
                  <Ionicons name="return-down-back-outline" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMenuForward} activeOpacity={0.75}>
                  <Text style={styles.contextMenuLabel}>Forward</Text>
                  <Ionicons name="arrow-redo-outline" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMenuCopy} activeOpacity={0.75}>
                  <Text style={styles.contextMenuLabel}>Copy</Text>
                  <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMenuDelete} activeOpacity={0.75}>
                  <Text style={styles.contextMenuDeleteLabel}>Delete</Text>
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuRowMore} onPress={handleMenuMore} activeOpacity={0.75}>
                  <Text style={styles.contextMenuLabel}>More...</Text>
                  <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={contactPickVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setContactPickVisible(false)}
      >
        <SafeAreaView style={styles.contactModalSafe}>
          <View style={styles.contactModalHeader}>
            <Text style={styles.contactModalTitle}>Choose contact</Text>
            <TouchableOpacity onPress={() => setContactPickVisible(false)} hitSlop={12}>
              <Text style={styles.contactModalDone}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={contactsLoaded}
            keyExtractor={(c) => c.id}
            renderItem={({ item: c }) => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'No name';
              const phone = c.phoneNumbers?.[0]?.number ?? '';
              return (
                <TouchableOpacity
                  style={styles.contactRowPick}
                  onPress={() => sendContactAsMessage(c)}
                  activeOpacity={0.75}
                >
                  <View style={styles.contactRowAvatar}>
                    <Text style={styles.contactRowAvatarText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.contactRowBody}>
                    <Text style={styles.contactRowName} numberOfLines={1}>
                      {name}
                    </Text>
                    {phone ? (
                      <Text style={styles.contactRowPhone} numberOfLines={1}>
                        {phone}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>

      {imageViewerMessage?.imageUri ? (
        <ChatImageViewer
          visible
          onClose={closeImageViewer}
          imageUri={imageViewerMessage.imageUri}
          caption={imageViewerMessage.body.trim() || undefined}
          senderLabel={imageViewerMessage.isMine ? 'You' : title}
          dateTimeLabel={formatChatImageViewerDate(imageViewerMessage.sentAtMs, imageViewerMessage.time)}
          canDelete={imageViewerMessage.isMine}
          onReply={handleImageViewerReply}
          onForward={() => Alert.alert('Forward', 'Forwarding will be available soon.')}
          onStar={() => Alert.alert('Star', 'Favorites coming soon.')}
          onDelete={imageViewerMessage.isMine ? handleImageViewerDelete : undefined}
          onEdit={() => Alert.alert('Edit', 'Annotating photos will be available soon.')}
          onMore={() => Alert.alert('More', 'Additional options coming soon.')}
          onCaptionSticker={() =>
            Alert.alert('Caption', 'You can add a caption in the message field before sending a photo.')
          }
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
    minWidth: 56,
  },
  backUnread: {
    marginLeft: -6,
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarLetter: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  headerTitlesPressable: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
  },
  headerTitlesPressed: {
    opacity: 0.88,
  },
  headerTitles: {
    minWidth: 0,
  },
  headerName: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  headerStatus: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconBtn: {
    padding: spacing.sm,
  },
  chatSurface: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageListStickToBottom: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  row: {
    maxWidth: '88%',
  },
  rowNewSpeaker: {
    marginTop: spacing.sm,
  },
  rowContinuation: {
    marginTop: 3,
  },
  messageSwipeShell: {
    width: '100%',
  },
  swipeableContainer: {
    backgroundColor: 'transparent',
  },
  swipeableChildren: {
    width: '100%',
  },
  swipeInnerRow: {
    width: '100%',
    flexDirection: 'row',
  },
  swipeInnerRowTheirs: {
    justifyContent: 'flex-start',
  },
  swipeInnerRowMine: {
    justifyContent: 'flex-end',
  },
  replySwipeActions: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replySwipeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  replyPreviewAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  replyPreviewTextCol: {
    flex: 1,
    minWidth: 0,
  },
  replyPreviewName: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primaryDark,
    marginBottom: 2,
  },
  replyPreviewSnippet: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  replyPreviewClose: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  bubblePressable: {
    alignSelf: 'flex-start',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
  },
  messageAndMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    columnGap: 6,
    rowGap: 2,
  },
  bubbleTextShrink: {
    flexShrink: 1,
    minWidth: 48,
  },
  bubbleTextTheirs: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeMD,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: colors.textLight,
    fontSize: typography.fontSizeMD,
    lineHeight: 22,
  },
  timeTheirs: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    marginBottom: 1,
    marginLeft: 2,
  },
  timeMine: {
    fontSize: typography.fontSizeXS,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 1,
    marginRight: 2,
  },
  metaClusterMine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  readIcon: {
    marginLeft: 3,
  },
  quoteBlock: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  quoteBlockTheirs: {
    backgroundColor: colors.surface,
  },
  quoteBlockMine: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quoteBar: {
    width: 4,
  },
  quoteTextWrap: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  quoteAuthorTheirs: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
    marginBottom: 2,
  },
  quoteSnippetTheirs: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  quoteAuthorMine: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primaryLight,
    marginBottom: 2,
  },
  quoteSnippetMine: {
    fontSize: typography.fontSizeSM,
    color: 'rgba(255,255,255,0.9)',
  },
  scrollFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  composerPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  composerField: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  composerInput: {
    flex: 1,
    fontSize: typography.fontSizeMD,
    color: colors.textPrimary,
    maxHeight: 108,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  composerCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  composerCameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  msgMenuRoot: {
    flex: 1,
  },
  msgMenuDimOverlay: {
    backgroundColor: 'rgba(245, 245, 255, 0.28)',
  },
  msgMenuCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  msgMenuColumn: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'stretch',
  },
  menuBubblePreview: {
    maxWidth: 300,
    width: '100%',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  contextMenuCard: {
    width: '100%',
    maxWidth: 288,
    alignSelf: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  contextMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contextMenuLabel: {
    fontSize: typography.fontSizeMD,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightMedium,
  },
  contextMenuDeleteLabel: {
    fontSize: typography.fontSizeMD,
    color: colors.error,
    fontWeight: typography.fontWeightSemiBold,
  },
  contextMenuRowMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderTopWidth: 8,
    borderTopColor: colors.backgroundSecondary,
    backgroundColor: colors.background,
  },
  /* ── Shared inline meta (time + ticks) ── */
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 3,
  },

  /* ── Bubble no-padding override (images, contacts) ── */
  bubbleNoPad: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  quoteInCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },

  /* ── IMAGE ── */
  imageContainer: {
    position: 'relative',
  },
  bubbleImageFull: {
    width: 250,
    height: 200,
    backgroundColor: colors.surface,
  },
  imageTimeOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  imageTimeText: {
    fontSize: typography.fontSizeXS,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  imageCaptionWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },

  /* ── DOCUMENT card ── */
  docCard: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 236,
  },
  docPreviewPanel: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  docPreviewPanelMine: {
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  docPreviewPanelTheirs: {
    backgroundColor: colors.background,
  },
  docInfoBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  docInfoTextCol: {
    flex: 1,
    minWidth: 0,
  },
  docBadge: {
    minWidth: 30,
    height: 32,
    paddingHorizontal: 5,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  docBadgePdf: {
    backgroundColor: colors.error,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
    letterSpacing: 0.2,
  },
  docNameDoc: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    lineHeight: 20,
  },
  docNameMine: {
    color: colors.textLight,
  },
  docNameTheirs: {
    color: colors.textPrimary,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: 6,
  },
  docMetaLine: {
    fontSize: typography.fontSizeXS,
    lineHeight: 16,
    flexShrink: 1,
  },
  docMetaMine: {
    color: 'rgba(255,255,255,0.78)',
  },
  docMetaTheirs: {
    color: colors.textMuted,
  },

  /* ── VOICE card ── */
  voiceCard: {
    minWidth: 248,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceAvatarWrap: {
    width: 44,
    height: 44,
    marginRight: spacing.sm,
    position: 'relative',
  },
  voiceAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  voiceAvatarInitial: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarInitialTheirs: {
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarInitialLetter: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
  },
  voiceAvatarInitialLetterTheirs: {
    color: colors.primaryDark,
  },
  voiceMicBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  voiceMicBadgeMine: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  voiceMicBadgeTheirs: {
    backgroundColor: colors.primary,
    borderColor: colors.background,
  },
  voicePlayHit: {
    paddingVertical: 4,
    paddingRight: spacing.sm,
  },
  voiceWaveCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  voiceWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    height: 22,
  },
  voiceWaveBar: {
    width: 2.5,
    borderRadius: 1.5,
    alignSelf: 'center',
  },
  voiceBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  voiceDuration: {
    fontSize: typography.fontSizeSM,
    fontVariant: ['tabular-nums'],
  },
  voiceDurationMine: {
    color: 'rgba(255,255,255,0.85)',
  },
  voiceDurationTheirs: {
    color: colors.textSecondary,
  },

  /* ── CONTACT card ── */
  contactCard: {
    minWidth: 220,
  },
  contactCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  contactCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCardAvatarMine: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  contactCardAvatarTheirs: {
    backgroundColor: colors.dotInactive,
  },
  contactCardAvatarLetter: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.textLight,
  },
  contactCardAvatarLetterTheirs: {
    color: colors.primaryDark,
  },
  contactCardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  contactCardName: {
    fontWeight: typography.fontWeightSemiBold,
    fontSize: typography.fontSizeMD,
  },
  contactCardTimeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  contactCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  contactCardDividerMine: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  contactCardMsgBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  contactCardMsgText: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  contactCardMsgTextMine: {
    color: colors.primaryLight,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  recordingText: {
    flex: 1,
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  attachSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  attachHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    gap: spacing.lg,
  },
  attachCell: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  attachIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  attachIconPhotos: {
    backgroundColor: colors.primary,
  },
  attachIconCamera: {
    backgroundColor: colors.textSecondary,
  },
  attachIconContact: {
    backgroundColor: colors.secondary,
  },
  attachIconDocument: {
    backgroundColor: colors.primaryDark,
  },
  attachLabel: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
    textAlign: 'center',
  },
  composerCircleRecord: {
    backgroundColor: colors.error,
  },
  contactModalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contactModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contactModalTitle: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  contactModalDone: {
    fontSize: typography.fontSizeMD,
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
  },
  contactRowPick: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contactRowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactRowAvatarText: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  contactRowBody: {
    flex: 1,
    minWidth: 0,
  },
  contactRowName: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  contactRowPhone: {
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
    marginTop: 2,
  },
  sendIcon: {
    marginLeft: 2,
    marginTop: -1,
  },
});

function InlineTimeTicks({
  time,
  read,
  isMine,
}: {
  time: string;
  read?: boolean;
  isMine: boolean;
}) {
  return (
    <View style={styles.inlineMeta}>
      <Text style={isMine ? styles.timeMine : styles.timeTheirs}>{time}</Text>
      {isMine && (
        <Ionicons
          name="checkmark-done"
          size={14}
          color={read ? colors.primaryLight : 'rgba(255,255,255,0.5)'}
          style={styles.readIcon}
        />
      )}
    </View>
  );
}

function ChatBubbleRichBody({
  item,
  isMine,
  peerInitial = 'C',
  selfAvatarUri,
  selfInitial = '?',
  voiceControl,
  time,
  read,
  onImagePress,
}: {
  item: ChatMessage;
  isMine: boolean;
  peerInitial?: string;
  selfAvatarUri?: string | null;
  selfInitial?: string;
  voiceControl?: VoiceBubbleControl;
  time: string;
  read?: boolean;
  onImagePress?: () => void;
}) {
  const textPrimary = isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs;

  /* ────────────── IMAGE ────────────── */
  if (item.imageUri) {
    const hasCaption = item.body.trim().length > 0;
    return (
      <View>
        <View style={styles.imageContainer}>
          <Pressable
            onPress={onImagePress}
            disabled={!onImagePress}
            accessibilityRole={onImagePress ? 'button' : undefined}
            accessibilityLabel={onImagePress ? 'Open full screen photo' : undefined}
            style={({ pressed }) => (onImagePress && pressed ? { opacity: 0.92 } : undefined)}
          >
            <Image source={{ uri: item.imageUri }} style={styles.bubbleImageFull} resizeMode="cover" />
          </Pressable>
          {!hasCaption && (
            <View style={styles.imageTimeOverlay} pointerEvents="none">
              <Text style={styles.imageTimeText}>{time}</Text>
              {isMine && (
                <Ionicons
                  name="checkmark-done"
                  size={13}
                  color={read ? colors.primaryLight : 'rgba(255,255,255,0.7)'}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          )}
        </View>
        {hasCaption && (
          <View style={styles.imageCaptionWrap}>
            <View style={styles.messageAndMetaRow}>
              <Text style={[textPrimary, styles.bubbleTextShrink]}>{item.body}</Text>
              <InlineTimeTicks time={time} read={read} isMine={isMine} />
            </View>
          </View>
        )}
      </View>
    );
  }

  /* ────────────── VOICE ────────────── */
  if (item.voiceUri) {
    const dur = formatVoiceDuration(item.voiceDurationSec ?? 0);
    const bars = waveformHeights(item.id, 28);
    const prog = voiceControl?.progress ?? 0;
    const playing = voiceControl?.isPlaying ?? false;
    return (
      <View style={styles.voiceCard}>
        <View style={styles.voiceTopRow}>
          <View style={styles.voiceAvatarWrap}>
            {isMine ? (
              selfAvatarUri ? (
                <Image source={{ uri: selfAvatarUri }} style={styles.voiceAvatarImg} />
              ) : (
                <View style={[styles.voiceAvatarImg, styles.voiceAvatarInitial]}>
                  <Text style={styles.voiceAvatarInitialLetter}>{selfInitial}</Text>
                </View>
              )
            ) : (
              <View style={[styles.voiceAvatarImg, styles.voiceAvatarInitialTheirs]}>
                <Text style={styles.voiceAvatarInitialLetterTheirs}>{peerInitial}</Text>
              </View>
            )}
            <View style={[styles.voiceMicBadge, isMine ? styles.voiceMicBadgeMine : styles.voiceMicBadgeTheirs]}>
              <Ionicons name="mic" size={10} color={colors.textLight} />
            </View>
          </View>
          <TouchableOpacity
            onPress={voiceControl?.onToggle}
            activeOpacity={0.75}
            style={styles.voicePlayHit}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={26}
              color={isMine ? colors.textLight : colors.primary}
            />
          </TouchableOpacity>
          <View style={styles.voiceWaveCol}>
            <View style={styles.voiceWaveRow}>
              {bars.map((h, i) => {
                const ratio = bars.length > 1 ? i / (bars.length - 1) : 0;
                const passed = ratio <= prog;
                const color = isMine
                  ? passed
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.35)'
                  : passed
                    ? colors.primary
                    : colors.dotInactive;
                return (
                  <View
                    key={`${item.id}-w-${i}`}
                    style={[styles.voiceWaveBar, { height: h, backgroundColor: color }]}
                  />
                );
              })}
            </View>
          </View>
        </View>
        <View style={styles.voiceBottomRow}>
          <Text style={[styles.voiceDuration, isMine ? styles.voiceDurationMine : styles.voiceDurationTheirs]}>
            {dur}
          </Text>
          <InlineTimeTicks time={time} read={read} isMine={isMine} />
        </View>
      </View>
    );
  }

  /* ────────────── DOCUMENT ────────────── */
  if (item.docName) {
    const { ext, isPdf } = fileLabelFromMessage(item.docName, item.docMimeType);
    const sizeStr = item.docSizeBytes != null ? formatFileSize(item.docSizeBytes) : '';
    const parts: string[] = [];
    if (item.docPageCount != null && item.docPageCount > 0) {
      parts.push(`${item.docPageCount} page${item.docPageCount !== 1 ? 's' : ''}`);
    }
    if (sizeStr) {
      parts.push(sizeStr);
    }
    parts.push(ext);
    const metaLine = parts.join(' · ');
    const badgeLabel = isPdf ? 'PDF' : ext.slice(0, 4).toUpperCase();
    return (
      <View style={styles.docCard}>
        <View style={[styles.docPreviewPanel, isMine ? styles.docPreviewPanelMine : styles.docPreviewPanelTheirs]}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={isMine ? colors.textSecondary : colors.primary}
          />
        </View>
        <View style={styles.docInfoBlock}>
          <View style={[styles.docBadge, isPdf && styles.docBadgePdf]}>
            <Text style={styles.docBadgeText}>{badgeLabel}</Text>
          </View>
          <View style={styles.docInfoTextCol}>
            <Text
              style={[styles.docNameDoc, isMine ? styles.docNameMine : styles.docNameTheirs]}
              numberOfLines={2}
            >
              {item.docName}
            </Text>
            <View style={styles.docMetaRow}>
              <Text
                style={[styles.docMetaLine, isMine ? styles.docMetaMine : styles.docMetaTheirs]}
                numberOfLines={1}
              >
                {metaLine}
              </Text>
              <InlineTimeTicks time={time} read={read} isMine={isMine} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ────────────── CONTACT ────────────── */
  if (item.contactName) {
    return (
      <View style={styles.contactCard}>
        <View style={styles.contactCardTop}>
          <View style={[styles.contactCardAvatar, isMine ? styles.contactCardAvatarMine : styles.contactCardAvatarTheirs]}>
            <Text
              style={[
                styles.contactCardAvatarLetter,
                !isMine && styles.contactCardAvatarLetterTheirs,
              ]}
            >
              {item.contactName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactCardTextCol}>
            <Text style={[textPrimary, styles.contactCardName]} numberOfLines={1}>
              {item.contactName}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isMine ? 'rgba(255,255,255,0.55)' : colors.textMuted}
          />
        </View>
        <View style={styles.contactCardTimeRow}>
          <InlineTimeTicks time={time} read={read} isMine={isMine} />
        </View>
        <View style={[styles.contactCardDivider, isMine ? styles.contactCardDividerMine : null]} />
        <TouchableOpacity style={styles.contactCardMsgBtn} activeOpacity={0.7}>
          <Text style={[styles.contactCardMsgText, isMine ? styles.contactCardMsgTextMine : null]}>
            Message
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

export default ChatScreen;
