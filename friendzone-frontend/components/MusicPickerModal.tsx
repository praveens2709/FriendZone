import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MusicService from "@/services/MusicService";
import { StoryMusic } from "@/constants/storyText";
import { useStoryMusic } from "@/hooks/useStoryMusic";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (music: StoryMusic) => void;
};

export default function MusicPickerModal({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoryMusic[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const requestId = useRef(0);
  const insets = useSafeAreaInsets();

  useStoryMusic(previewing ?? undefined, visible && !!previewing);

  useEffect(() => {
    if (!visible) {
      setPreviewing(null);
      return;
    }
    const id = ++requestId.current;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(
      () => {
        MusicService.search(query, controller.signal)
          .then((songs) => {
            if (id === requestId.current) setResults(songs);
          })
          .catch((error) => {
            if (error?.name !== "AbortError" && id === requestId.current) setFailed(true);
          })
          .finally(() => {
            if (id === requestId.current) setLoading(false);
          });
      },
      query ? 350 : 0
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>Add music</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search songs or artists"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.search}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          {loading && results.length === 0 ? (
            <ActivityIndicator color="#fff" style={styles.status} />
          ) : failed ? (
            <Text style={styles.statusText}>Couldn't load songs. Check your connection and try again.</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.previewUrl}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.statusText}>No songs found.</Text>}
              renderItem={({ item }) => {
                const active = previewing === item.previewUrl;
                return (
                  <Pressable style={styles.row} onPress={() => onSelect(item)}>
                    {item.artwork ? (
                      <Image source={{ uri: item.artwork }} style={styles.art} />
                    ) : (
                      <View style={[styles.art, styles.artFallback]}>
                        <Ionicons name="musical-notes" size={20} color="#fff" />
                      </View>
                    )}
                    <View style={styles.meta}>
                      <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                    <Pressable
                      onPress={() => setPreviewing(active ? null : item.previewUrl)}
                      hitSlop={8}
                      style={styles.play}
                    >
                      <Ionicons name={active ? "pause" : "play"} size={18} color="#111" />
                    </Pressable>
                  </Pressable>
                );
              }}
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#111" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  search: { flex: 1, color: "#fff", fontSize: 16 },
  status: { marginTop: 40 },
  statusText: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  art: { width: 48, height: 48, borderRadius: 8 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  meta: { flex: 1 },
  songTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  songArtist: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 2 },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
});
