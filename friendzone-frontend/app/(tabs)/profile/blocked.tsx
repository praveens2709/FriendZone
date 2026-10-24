import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ConfirmModal";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import UserAvatarComponent from "@/components/UserAvatar";
import SafetyService, { BlockedUser } from "@/services/SafetyService";

export default function BlockedAccountsScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<BlockedUser | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setBlocked(await SafetyService.getBlockedUsers(accessToken));
    } catch {

    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (id: string) => {
    try {
      await SafetyService.unblockUser(id);
      setBlocked((current) => current.filter((u) => u.id !== id));
    } catch {

    }
  };

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.container}>
        <CommonHeader title="Blocked accounts" leftContent={<BackButton color={colors.text} />} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            contentContainerStyle={{ paddingTop: 8 }}
            data={blocked}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <ThemedText style={[styles.empty, { color: colors.textDim }]}>
                You haven't blocked anyone.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView style={styles.row}>
                <UserAvatarComponent imageUri={item.profileImage} size={44} />
                <ThemedText style={styles.name}>
                  {`${item.firstName} ${item.lastName || ""}`.trim()}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setPending(item)}
                  style={[styles.button, { borderColor: colors.border }]}
                >
                  <ThemedText>Unblock</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}
          />
        )}
        <ConfirmModal
          visible={!!pending}
          title={`Unblock ${pending?.firstName ?? ""}?`}
          message="They'll be able to find you and send you a knock again."
          confirmLabel="Unblock"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const id = pending?.id;
            setPending(null);
            if (id) unblock(id);
          }}
        />
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  empty: { textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  name: { flex: 1 },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
