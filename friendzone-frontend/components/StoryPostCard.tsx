import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StoryPostSnapshot } from "@/types/story.type";

interface StoryPostCardProps {
  post: Pick<StoryPostSnapshot, "image" | "authorName" | "authorAvatar" | "caption">;
  width: number;
  scale?: number;
}

const Avatar = ({ uri, size }: { uri: string | null; size: number }) =>
  uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Ionicons name="person" size={size * 0.5} color="#8A8A8A" />
    </View>
  );

export default function StoryPostCard({ post, width, scale = 1 }: StoryPostCardProps) {
  const caption = post.caption?.trim();
  const k = scale;
  const w = width * k;
  return (
    <View style={[styles.card, { width: w, borderRadius: 18 * k }]}>
      <View style={[styles.header, { gap: 8 * k, paddingHorizontal: 12 * k, paddingVertical: 10 * k }]}>
        <Avatar uri={post.authorAvatar} size={28 * k} />
        <Text style={[styles.name, { fontSize: 14 * k, lineHeight: 18 * k }]} numberOfLines={1}>
          {post.authorName}
        </Text>
      </View>
      <Image source={{ uri: post.image }} style={{ width: w, height: w }} resizeMode="cover" />
      {!!caption && (
        <View style={{ paddingHorizontal: 12 * k, paddingVertical: 10 * k }}>
          <Text style={[styles.footerText, { fontSize: 13 * k, lineHeight: 18 * k }]} numberOfLines={2}>
            <Text style={styles.footerName}>{post.authorName} </Text>
            {caption}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatarFallback: { backgroundColor: "#E6E6E6", alignItems: "center", justifyContent: "center" },
  name: { flex: 1, color: "#111111", fontWeight: "800" },
  footerText: { color: "#111111" },
  footerName: { fontWeight: "800" },
});
