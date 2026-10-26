import React from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { STICKER_EMOJIS, timeStickerText } from "@/constants/storyDecor";

type Props = {
  visible: boolean;
  onClose: () => void;
  onEmoji: (emoji: string) => void;
  onTime: (text: string) => void;
};

export default function StoryStickerPicker({ visible, onClose, onEmoji, onTime }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Stickers</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        <Pressable style={styles.timeChip} onPress={() => onTime(timeStickerText())}>
          <Ionicons name="time-outline" size={18} color="#111" />
          <Text style={styles.timeText}>{timeStickerText()}</Text>
        </Pressable>
        <FlatList
          data={STICKER_EMOJIS}
          numColumns={5}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable style={styles.cell} onPress={() => onEmoji(item)}>
              <Text style={styles.emoji}>{item}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    height: "55%",
    backgroundColor: "#1c1c1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  timeChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 6,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  timeText: { color: "#111", fontWeight: "800", fontSize: 15 },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 34 },
});
