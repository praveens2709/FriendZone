import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StoryMusic } from "@/constants/storyText";

type Props = {
  music: StoryMusic;
  onPress?: () => void;
  onRemove?: () => void;
};

export default function StoryMusicChip({ music, onPress, onRemove }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.chip}>
      {music.artwork ? (
        <Image source={{ uri: music.artwork }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artFallback]}>
          <Ionicons name="musical-notes" size={14} color="#fff" />
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{music.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{music.artist}</Text>
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.85)" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 240,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  art: { width: 32, height: 32, borderRadius: 16 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  meta: { flexShrink: 1 },
  title: { color: "#fff", fontSize: 13, fontWeight: "700" },
  artist: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
});
