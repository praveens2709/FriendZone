import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import StoryViewer from "@/components/StoryViewer";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import ThemedModal from "@/components/ThemedModal";
import { useTheme } from "@/context/ThemeContext";
import { useSocket } from "@/context/SocketContext";
import StoryService from "@/services/StoryService";
import { StoryViewerEntry, UserStory } from "@/types/story.type";

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { socket } = useSocket();

  const [groups, setGroups] = useState<UserStory[] | null>(null);
  const [userIndex, setUserIndex] = useState(-1);
  const [viewers, setViewers] = useState<StoryViewerEntry[] | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    StoryService.getStories()
      .then((list) => {
        setGroups(list);
        const index = list.findIndex((g) => g.id === id);
        if (index === -1) router.back();
        else setUserIndex(index);
      })
      .catch(() => router.back());
  }, [id, router]);

  useEffect(() => {
    if (!socket) return;
    const onViewed = ({
      storyId,
      viewCount,
      viewer,
    }: {
      storyId: string;
      viewCount: number;
      viewer: StoryViewerEntry;
    }) => {
      setGroups((prev) =>
        prev
          ? prev.map((group) => ({
              ...group,
              stories: group.stories.map((story) =>
                story.id === storyId ? { ...story, viewCount } : story
              ),
            }))
          : prev
      );
      setViewers((prev) =>
        prev && !prev.some((entry) => entry.id === viewer.id) ? [viewer, ...prev] : prev
      );
    };
    const onBlockChanged = ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      if (blocked && groups && groups[userIndex]?.id === userId) router.back();
    };
    socket.on("storyViewed", onViewed);
    socket.on("blockChanged", onBlockChanged);
    return () => {
      socket.off("storyViewed", onViewed);
      socket.off("blockChanged", onBlockChanged);
    };
  }, [socket, groups, userIndex, router]);

  const handleView = useCallback((storyId: string) => {
    if (viewedRef.current.has(storyId)) return;
    viewedRef.current.add(storyId);
    StoryService.markViewed(storyId).catch(() => undefined);
  }, []);

  const handleShowViewers = async (storyId: string) => {
    try {
      setViewers(await StoryService.getViewers(storyId));
    } catch {

    }
  };

  const handleDelete = (storyId: string) =>
    Alert.alert("Delete this story?", "It will disappear for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await StoryService.deleteStory(storyId);
            router.back();
          } catch {

          }
        },
      },
    ]);

  if (!groups || userIndex < 0) {
    return (
      <ThemedSafeArea style={styles.black}>
        <ActivityIndicator style={{ marginTop: 80 }} color="#fff" />
      </ThemedSafeArea>
    );
  }

  const group = groups[userIndex];
  if (!group) return null;

  return (
    <ThemedSafeArea style={styles.black}>
      <StatusBar hidden />
      <StoryViewer
        key={group.id}
        user={group}
        stories={group.stories}
        holdProgress={viewers !== null}
        onClose={() => router.back()}
        onView={handleView}
        onDelete={handleDelete}
        onShowViewers={handleShowViewers}
        onOpenPost={(postId) => router.push({ pathname: "/posts/[postId]", params: { postId } })}
        onNextUser={() => {
          if (userIndex < groups.length - 1) setUserIndex(userIndex + 1);
          else router.back();
        }}
        onPrevUser={() => {
          if (userIndex > 0) setUserIndex(userIndex - 1);
          else router.back();
        }}
      />

      <ThemedModal visible={viewers !== null} onClose={() => setViewers(null)}>
        <Text style={[styles.title, { color: colors.text }]}>Seen by {viewers?.length ?? 0}</Text>
        {viewers && viewers.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textDim }]}>Nobody has seen this yet.</Text>
        ) : (
          <FlatList
            data={viewers ?? []}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 340 }}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="person" size={18} color={colors.textDim} />
                  </View>
                )}
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              </View>
            )}
          />
        )}
      </ThemedModal>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "black" },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  empty: { textAlign: "center", marginVertical: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 16, fontWeight: "600" },
});
