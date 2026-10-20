import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import StoryService from "@/services/StoryService";
import StoryItem from "./StoryItem";
import { ThemedView } from "./ThemedView";
import { StoryRingItem } from "@/types/story.type";

export default function StoryRingList() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [items, setItems] = useState<StoryRingItem[]>([]);

  const load = useCallback(async () => {
    try {
      const groups = await StoryService.getStories();
      const own = groups.find((g) => g.isOwnStory);
      const others = groups.filter((g) => !g.isOwnStory);

      setItems([
        {
          id: own?.id ?? user?._id ?? "me",
          name: "Your story",
          image: user?.profileImage ?? null,
          isOwnStory: true,
          seen: true,
          empty: !own,
        },
        ...others.map((g) => ({
          id: g.id,
          name: g.name.split(" ")[0],
          image: g.profilePic,
          seen: g.seen,
        })),
      ]);
    } catch {
      setItems([
        { id: user?._id ?? "me", name: "Your story", image: user?.profileImage ?? null, isOwnStory: true, seen: true, empty: true },
      ]);
    }
  }, [user?._id, user?.profileImage]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!socket) return;
    socket.on("storiesChanged", load);
    return () => {
      socket.off("storiesChanged", load);
    };
  }, [socket, load]);

  if (items.length === 0) return null;

  return (
    <ThemedView style={styles.listContainer}>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.id}-${item.isOwnStory ? "own" : "other"}`}
        renderItem={({ item }) => <StoryItem item={item} colors={colors} router={router} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 10,
    paddingLeft: 12,
  },
});
