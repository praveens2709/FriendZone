import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import VibePickerModal from "@/components/VibePickerModal";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import VibeService, { Vibe } from "@/services/VibeService";
import { timeLeftLabel, vibeOption } from "@/constants/vibes";
import { readableTextOn } from "@/utils/theme-utils";

type StripItem =
  | { type: "mine"; vibe: Vibe | null }
  | { type: "friend"; vibe: Vibe }
  | { type: "empty" };

export default function VibeStrip() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [mine, setMine] = useState<Vibe | null>(null);
  const [circle, setCircle] = useState<Vibe[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await VibeService.getVibes(accessToken);
      setMine(data.mine);
      setCircle(data.circle);
    } catch (error) {
      console.error("Error loading vibes:", error);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!socket) return;
    socket.on("vibeChanged", load);
    return () => {
      socket.off("vibeChanged", load);
    };
  }, [socket, load]);

  const handleSave = async (data: { kind: Vibe["kind"]; note: string; hours: number }) => {
    if (!accessToken) return;
    try {
      setSaving(true);
      const saved = await VibeService.setVibe(data, accessToken);
      setMine(saved);
      setPickerOpen(false);
    } catch (error) {
      console.error("Error saving vibe:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await VibeService.clearVibe();
      setMine(null);
      setPickerOpen(false);
    } catch (error) {
      console.error("Error clearing vibe:", error);
    }
  };

  const items: StripItem[] = [
    { type: "mine", vibe: mine },
    ...circle.map((vibe) => ({ type: "friend" as const, vibe })),
    ...(circle.length === 0 ? [{ type: "empty" as const }] : []),
  ];

  const renderMine = (vibe: Vibe | null) => {
    if (!vibe) {
      return (
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={[styles.card, styles.addCard, { borderColor: colors.primary }]}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          <Text style={[styles.label, { color: colors.text }]}>Set your vibe</Text>
          <Text style={[styles.meta, { color: colors.textDim }]}>Circle only</Text>
        </TouchableOpacity>
      );
    }

    const option = vibeOption(vibe.kind);
    const onPrimary = readableTextOn(colors.primary, colors.buttonText);
    return (
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.primary }]}
      >
        <Ionicons name={option.icon} size={26} color={onPrimary} />
        <Text style={[styles.label, { color: onPrimary }]}>{option.label}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: onPrimary }]}>
          {vibe.note || "You"} · {timeLeftLabel(vibe.expiresAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFriend = (vibe: Vibe) => {
    const theirs = colors;
    const option = vibeOption(vibe.kind);
    return (
      <TouchableOpacity
        onPress={() =>
          vibe.user &&
          router.push({ pathname: "/profile/UserProfile", params: { userId: vibe.user.id } })
        }
        style={[
          styles.card,
          { backgroundColor: theirs.backgroundSecondary, borderColor: theirs.primary },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: theirs.primary }]}>
          <Ionicons name={option.icon} size={18} color={readableTextOn(theirs.primary, theirs.buttonText)} />
        </View>
        <Text numberOfLines={1} style={[styles.name, { color: theirs.text }]}>
          {vibe.user?.firstName}
        </Text>
        <Text numberOfLines={1} style={[styles.label, { color: theirs.text }]}>
          {option.label}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theirs.textDim }]}>
          {vibe.note || timeLeftLabel(vibe.expiresAt)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) =>
          item.type === "friend" ? item.vibe.id : `${item.type}-${index}`
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.type === "mine") return renderMine(item.vibe);
          if (item.type === "friend") return renderFriend(item.vibe);
          return (
            <View style={[styles.card, styles.emptyCard, { borderColor: colors.border }]}>
              <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                Lock in with friends to see what their vibe is today.
              </ThemedText>
            </View>
          );
        }}
      />
      <VibePickerModal
        visible={pickerOpen}
        current={mine}
        saving={saving}
        onClose={() => setPickerOpen(false)}
        onSave={handleSave}
        onClear={handleClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  list: { paddingHorizontal: 12, gap: 10 },
  card: {
    width: 132,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    justifyContent: "flex-end",
    gap: 2,
  },
  addCard: { borderStyle: "dashed", justifyContent: "center", alignItems: "flex-start" },
  emptyCard: { width: 190, borderStyle: "dashed", justifyContent: "center" },
  emptyText: { fontSize: 13, lineHeight: 18 },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  name: { fontSize: 12, opacity: 0.8 },
  label: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 11 },
});
