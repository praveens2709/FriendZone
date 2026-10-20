import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import InlineError from "@/components/InlineError";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import ProfileServices, { CloseFriend } from "@/services/ProfileService";

export default function CloseFriendsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { space: tabSpace } = useTabBarSpace();
  const [saveError, setSaveError] = useState("");
  const [friends, setFriends] = useState<CloseFriend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await ProfileServices.getCloseFriends();
      setFriends(list);
      setSelected(new Set(list.filter((f) => f.isClose).map((f) => f.id)));
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    try {
      setSaving(true);
      setSaveError("");
      await ProfileServices.updateCloseFriends([...selected]);
      router.back();
    } catch {
      setSaveError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe} edges={["top", "left", "right"]}>
        <CommonHeader title="Close friends" leftContent={<BackButton color={colors.text} />} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <Text style={[styles.hint, { color: colors.textDim }]}>
                  Pick the people you're closest to. You can share moments with just them. They're never told
                  they're on your list.
                </Text>
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color={colors.textDim} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No LockedIn friends yet</Text>
                  <Text style={[styles.emptyText, { color: colors.textDim }]}>
                    Lock in with friends on the Circle tab, then pick your close friends here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const on = selected.has(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.85}
                    style={[styles.row, { backgroundColor: colors.backgroundSecondary, borderColor: on ? colors.primary : colors.border }]}
                  >
                    <UserAvatar imageUri={item.profileImage} size={44} />
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {`${item.firstName} ${item.lastName || ""}`.trim()}
                    </Text>
                    <Ionicons
                      name={on ? "checkmark-circle" : "ellipse-outline"}
                      size={26}
                      color={on ? colors.primary : colors.textDim}
                    />
                  </TouchableOpacity>
                );
              }}
            />
            {friends.length > 0 && (
              <View style={[styles.footer, { paddingBottom: tabSpace - 4, borderTopColor: colors.border }]}>
                <InlineError message={saveError} style={{ marginBottom: 8 }} />
                <Button
                  title={saving ? "Saving..." : `Save (${selected.size})`}
                  onPress={save}
                  disabled={saving}
                />
              </View>
            )}
          </>
        )}
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  hint: { fontSize: 13, lineHeight: 19, paddingHorizontal: 4, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 18, padding: 10, marginBottom: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  emptyText: { textAlign: "center", lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
