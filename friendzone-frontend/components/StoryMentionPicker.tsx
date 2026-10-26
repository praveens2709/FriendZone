import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import KnockService, { UserAvatar } from "@/services/knockService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: UserAvatar) => void;
};

// Mentions are limited to your circle, the same people who can see your stories.
export default function StoryMentionPicker({ visible, onClose, onSelect }: Props) {
  const { accessToken, user } = useAuth();
  const [people, setPeople] = useState<UserAvatar[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible || !accessToken || !user?._id) return;
    setFailed(false);
    KnockService.getConnections(accessToken, user._id, "lockedIn")
      .then(setPeople)
      .catch(() => setFailed(true));
  }, [visible, accessToken, user?._id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (people ?? []).filter((person) => person.username.toLowerCase().includes(needle));
  }, [people, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Mention someone</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your circle"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.search}
            autoCorrect={false}
          />
        </View>
        {people === null && !failed ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : failed ? (
          <Text style={styles.empty}>Couldn't load your circle. Try again.</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>No one found.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onSelect(item)}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                )}
                <Text style={styles.name}>{item.username}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    height: "60%",
    backgroundColor: "#1c1c1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 6,
  },
  search: { flex: 1, color: "#fff", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  empty: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 30 },
});
