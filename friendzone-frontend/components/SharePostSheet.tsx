import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter, type Href } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import UserAvatar from "@/components/UserAvatar";
import Button from "@/components/Button";
import InlineError from "@/components/InlineError";
import { renderSheetBackdrop } from "@/components/ui/SheetBackdrop";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import KnockService from "@/services/knockService";
import ChatService from "@/services/ChatService";
import PostService from "@/services/PostService";
import { Post } from "@/types/post.type";

interface Person {
  id: string;
  name: string;
  avatar: string | null;
}

interface SharePostSheetProps {
  post: Post;
}

const COLUMNS = 3;
const ITEM_WIDTH = (Dimensions.get("window").width - 16) / COLUMNS;

const SheetContent = ({ post, onClose }: { post: Post; onClose: () => void }) => {
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();
  const router = useRouter();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !user?._id) return;
      try {
        const [knockers, knocked] = await Promise.all([
          KnockService.getKnockers(accessToken),
          KnockService.getKnocked(accessToken),
        ]);
        const map = new Map<string, Person>();
        const add = (otherId: string, name: string, avatar: string | null) => {
          if (otherId !== user._id && !map.has(otherId)) map.set(otherId, { id: otherId, name, avatar });
        };
        knocked.forEach((k) => {
          if (k.status === "lockedIn" || k.status === "onesidedlock") {
            add(k.user.id, k.user.username, k.user.avatar);
          }
        });
        knockers.forEach((k) => {
          if (k.status === "lockedIn") add(k.user.id, k.user.username, k.user.avatar);
        });
        if (active) setPeople(Array.from(map.values()));
      } catch {
        if (active) setError("Couldn't load your people. Pull the sheet down and try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken, user?._id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((p) => p.name.toLowerCase().includes(needle));
  }, [people, query]);

  const toggle = useCallback((id: string) => {
    setError("");
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSend = async () => {
    if (!accessToken || selected.length === 0 || sending) return;
    setError("");
    setSending(true);
    const results = await Promise.allSettled(
      selected.map(async (recipientId) => {
        const chat = await ChatService.createChat(accessToken, recipientId);
        await PostService.sharePostToChat(post._id, chat.chatId, accessToken);
        return recipientId;
      })
    );
    const delivered = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);
    const failed = results.length - delivered.length;
    setSending(false);
    if (failed === 0) {
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeTimer.current = setTimeout(onClose, 900);
      return;
    }
    setSelected((prev) => prev.filter((id) => !delivered.includes(id)));
    setError(
      delivered.length > 0
        ? `Sent to ${delivered.length}, but ${failed} didn't go through. Try those again.`
        : "Couldn't send. Check your connection and try again."
    );
  };

  const handleAddToStory = () => {
    onClose();
    router.push(`/(stories)/post-story?postId=${post._id}` as Href);
  };

  const handleMore = async () => {
    const author = `${post.user.firstName || ""} ${post.user.lastName || ""}`.trim();
    const link = Linking.createURL(`posts/${post._id}`);
    const caption = post.caption ? `\n"${post.caption.slice(0, 120)}"` : "";
    try {
      await Share.share({ message: `${author}'s post on FriendZone${caption}\n${link}` });
    } catch {}
  };

  const renderPerson = ({ item }: { item: Person }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity style={styles.person} activeOpacity={0.7} onPress={() => toggle(item.id)}>
        <View>
          <View
            style={[
              styles.avatarRing,
              { borderColor: isSelected ? colors.primary : "transparent" },
            ]}
          >
            <UserAvatar imageUri={item.avatar} size={62} />
          </View>
          {isSelected && (
            <View style={[styles.check, { backgroundColor: colors.primary, borderColor: colors.backgroundSecondary }]}>
              <Ionicons name="checkmark" size={14} color={colors.buttonText} />
            </View>
          )}
        </View>
        <ThemedText style={styles.personName} numberOfLines={2}>
          {item.name}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const action = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    label: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.action} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.actionCircle, { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border }]}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.text} />
      </View>
      <ThemedText style={[styles.actionLabel, { color: colors.textDim }]}>{label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.flex}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={18} color={colors.textDim} style={styles.searchIcon} />
        <BottomSheetTextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search people"
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      <BottomSheetFlatList
        data={visible}
        keyExtractor={(item: Person) => item.id}
        renderItem={renderPerson}
        numColumns={COLUMNS}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.empty} color={colors.accent} />
          ) : (
            <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
              {query ? "No one found." : "Lock in with people to share posts with them."}
            </ThemedText>
          )
        }
      />

      {(selected.length > 0 || sent || !!error) && (
        <View style={styles.sendArea}>
          <InlineError message={error} style={styles.error} />
          {(selected.length > 0 || sent) && (
            <Button
              title={selected.length > 1 ? `Send to ${selected.length}` : "Send"}
              onPress={handleSend}
              disabled={sending || sent}
              style={styles.sendButton}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : sent ? (
                <View style={styles.sentRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.buttonText} />
                  <ThemedText style={[styles.sendText, { color: colors.buttonText }]}>Sent</ThemedText>
                </View>
              ) : undefined}
            </Button>
          )}
        </View>
      )}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.bottomRow}>
          {action("plus-circle-outline", "Add to story", handleAddToStory)}
          {action("export-variant", "More", handleMore)}
        </View>
      </View>
    </ThemedView>
  );
};

const SharePostSheet = forwardRef<BottomSheetModal, SharePostSheetProps>(({ post }, ref) => {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ["52%"], []);
  const close = useCallback(() => {
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }, [ref]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderSheetBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.textDim }}
      backgroundStyle={{ backgroundColor: colors.backgroundSecondary }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <SheetContent post={post} onClose={close} />
    </BottomSheetModal>
  );
});

SharePostSheet.displayName = "SharePostSheet";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  action: { alignItems: "center", gap: 6, minWidth: 64 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, height: "100%" },
  listContent: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 },
  person: { width: ITEM_WIDTH, alignItems: "center", paddingVertical: 8, paddingHorizontal: 4 },
  avatarRing: { borderWidth: 2.5, borderRadius: 40, padding: 2 },
  check: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  personName: { marginTop: 6, fontSize: 13, lineHeight: 17, textAlign: "center" },
  empty: { marginTop: 32 },
  emptyText: { textAlign: "center", marginTop: 32, paddingHorizontal: 24, fontSize: 14 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  error: { textAlign: "left" },
  sendArea: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 6 },
  sendButton: { marginVertical: 0 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  sentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sendText: { fontSize: 16, fontWeight: "700" },
});

export default SharePostSheet;
