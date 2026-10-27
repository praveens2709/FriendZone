import { useConfirm } from "@/components/ConfirmProvider";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
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

export default function ArchiveScreen() {
  const confirm = useConfirm();
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setPosts(await PostService.getArchivedPosts(accessToken));
    } catch {

    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (post: Post) => {
    try {
      await PostService.unarchivePost(post._id);
      setPosts((current) => current.filter((p) => p._id !== post._id));
    } catch {

    }
  };

  const remove = (post: Post) => {
    confirm({ title: "Delete this post?", message: "It moves to Recently deleted for 30 days, then it's gone for good.", confirmLabel: "Delete", onConfirm: async () => {
          try {
            await PostService.deletePost(post._id);
            setPosts((current) => current.filter((p) => p._id !== post._id));
          } catch {

          }
        } });
  };

  const openActions = (post: Post) =>
    Alert.alert("Archived post", undefined, [
      { text: "Restore to profile", onPress: () => restore(post) },
      { text: "Delete", style: "destructive", onPress: () => remove(post) },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title="Archive" leftContent={<BackButton color={colors.text} />} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} />
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
                  Only you can see these. Tap a post to restore or delete it.
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="archive-outline" size={48} color={colors.textDim} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing archived</Text>
                <Text style={[styles.emptyText, { color: colors.textDim }]}>
                  Archive a post from its menu to hide it without deleting it.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openActions(item)} activeOpacity={0.85}>
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
  loader: { marginTop: 40 },
  grid: { paddingHorizontal: GAP, paddingTop: 6, paddingBottom: 40, gap: GAP },
  hint: { fontSize: 13, paddingHorizontal: 8, paddingVertical: 10 },
  thumb: { width: SIZE, height: SIZE, borderRadius: 10 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  emptyText: { textAlign: "center", lineHeight: 20 },
});
