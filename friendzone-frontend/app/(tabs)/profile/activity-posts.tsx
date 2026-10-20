import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ActivityPostsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isLikes = kind !== "commented";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setPosts(
        isLikes
          ? await PostService.getLikedPosts(accessToken)
          : await PostService.getCommentedPosts(accessToken)
      );
    } catch {

    } finally {
      setLoading(false);
    }
  }, [accessToken, isLikes]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title={isLikes ? "Likes" : "Comments"} leftContent={<BackButton color={colors.text} />} />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            data={posts}
            numColumns={3}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GAP }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={isLikes ? "heart-outline" : "chatbubble-outline"} size={48} color={colors.textDim} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {isLikes ? "No likes yet" : "No comments yet"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textDim }]}>
                  {isLikes ? "Posts you like will show up here." : "Posts you comment on will show up here."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/posts/${item._id}`)}>
                <Image source={{ uri: item.images[0]?.url }} style={[styles.thumb, { backgroundColor: colors.border }]} />
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
  grid: { paddingHorizontal: GAP, paddingTop: 12, paddingBottom: 40, gap: GAP },
  thumb: { width: SIZE, height: SIZE, borderRadius: 10 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  emptyText: { textAlign: "center", lineHeight: 20 },
});
