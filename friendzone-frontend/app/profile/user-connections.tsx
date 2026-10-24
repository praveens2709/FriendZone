import AppRefreshControl from "@/components/AppRefreshControl";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import UserProfileCard from "@/components/UserProfileCard";
import EmptyState from "@/components/EmptyState";
import { ChatListSkeleton } from "@/components/Skeleton";
import KnockService, { UserAvatar } from "@/services/knockService";

type ConnectionType = "knockers" | "knocking" | "lockedIn";

const TITLES: Record<ConnectionType, string> = {
  knockers: "Knockers",
  knocking: "Knocking",
  lockedIn: "LockedIn",
};

export default function UserConnectionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();
  const { userId, name, type } = useLocalSearchParams<{ userId: string; name?: string; type: ConnectionType }>();

  const [people, setPeople] = useState<UserAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !userId || !type) return;
    try {
      setPeople(await KnockService.getConnections(accessToken, userId, type));
      setLocked(false);
    } catch (error: any) {
      setPeople([]);
      setLocked(error?.response?.status === 403);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, userId, type]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const events = ["knockStatusChanged", "blockChanged"];
    events.forEach((event) => socket.on(event, load));
    return () => {
      events.forEach((event) => socket.off(event, load));
    };
  }, [socket, load]);

  const openProfile = (id: string) => {
    if (id === user?._id) router.push("/(tabs)/profile");
    else router.push({ pathname: "/profile/UserProfile", params: { userId: id } });
  };

  return (
    <ScreenBackground style={styles.flex}>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader
          title={name ? `${name} · ${TITLES[type] ?? ""}` : TITLES[type] ?? ""}
          leftContent={<BackButton color={colors.text} />}
        />
        {loading ? (
          <ChatListSkeleton rows={6} />
        ) : (
          <FlatList
            data={people}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <UserProfileCard
                userId={item.id}
                username={item.username}
                avatar={item.avatar}
                onPress={() => openProfile(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            contentContainerStyle={styles.list}
            refreshControl={
              <AppRefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              locked ? (
                <EmptyState
                  icon="lock-closed-outline"
                  art="past"
                  title="This list is private"
                  message="Knock this account to see who is connected to it."
                />
              ) : (
                <EmptyState icon="people-outline" art="party" title="Nobody here yet" />
              )
            }
          />
        )}
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  separator: { height: StyleSheet.hairlineWidth },
});
