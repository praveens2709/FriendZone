import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import PostService from "@/services/PostService";
import { Post } from "@/types/post.type";

const GAP = 6;
const SIZE = (Dimensions.get("window").width - GAP * 4) / 3;

type DeletedPost = Post & { daysLeft: number };

export default function RecentlyDeletedScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<DeletedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setPosts(await PostService.getDeletedPosts(accessToken));
    } catch {

    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const drop = (id: string) => setPosts((current) => current.filter((p) => p._id !== id));

  const restore = async (post: DeletedPost) => {
    try {
      await PostService.restorePost(post._id);
      drop(post._id);
    } catch {

    }
  };

  const forever = (post: DeletedPost) =>
    Alert.alert("Delete forever?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete forever",
        style: "destructive",
        onPress: async () => {
          try {
            await PostService.deletePostForever(post._id);
            drop(post._id);
          } catch {

          }
        },
      },
    ]);

  const openActions = (post: DeletedPost) =>
    Alert.alert("Deleted post", `${post.daysLeft} ${post.daysLeft === 1 ? "day" : "days"} left before it's gone for good.`, [
      { text: "Restore", onPress: () => restore(post) },
      { text: "Delete forever", style: "destructive", onPress: () => forever(post) },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title="Recently deleted" leftContent={<BackButton color={colors.text} />} />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            data={posts}
            numColumns={3}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GAP }}
            ListHeaderComponent={
              posts.length > 0 ? (
                <Text style={[styles.hint, { color: colors.textDim }]}>
                  Deleted posts stay here for 30 days. Only you can see them.
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="trash-outline" size={48} color={colors.textDim} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here</Text>
                <Text style={[styles.emptyText, { color: colors.textDim }]}>Posts you delete show up here for 30 days.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.85} onPress={() => openActions(item)}>
                <Image source={{ uri: item.images[0]?.url }} style={[styles.thumb, { backgroundColor: colors.border }]} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.daysLeft}d</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  grid: { paddingHorizontal: GAP, paddingTop: 6, paddingBottom: 40, gap: GAP },
  hint: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 10 },
  thumb: { width: SIZE, height: SIZE, borderRadius: 10 },
  badge: { position: "absolute", right: 6, bottom: 6, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  emptyText: { textAlign: "center", lineHeight: 20 },
});
