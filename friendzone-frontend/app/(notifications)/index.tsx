import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import NotificationService, {
  NotificationResponse,
} from "@/services/NotificationService";
import KnockService, { KnockRequest } from "@/services/knockService";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatNotificationDateGroup,
  formatNotificationTimestamp,
  getUserAvatar,
  showToast,
} from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";

type KnockNotification = NotificationResponse & {
  type: "knock" | "activity";
  user: { id: string; username: string; avatar: string };
  knockStatus?: "pending" | "lockedIn" | "onesidedlock" | "declined";
  content: string;
};

const buildKnockRequestDisplay = (requests: KnockRequest[]) => {
  const count = requests.length;
  const avatar1Uri = requests[0]?.user?.avatar || null;
  const avatar2Uri = requests[1]?.user?.avatar || null;
  const message =
    count === 0
      ? "No new knocks yet."
      : `${count} new knock${count > 1 ? "s" : ""}`;
  return { count, avatar1Uri, avatar2Uri, message };
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pendingKnockRequestsData, setPendingKnockRequestsData] = useState<
    KnockRequest[]
  >([]);

  const privateKnockRequestsCount = pendingKnockRequestsData.length;

  const knockRequestDisplay = useMemo(
    () => buildKnockRequestDisplay(pendingKnockRequestsData),
    [pendingKnockRequestsData]
  );

  const fetchNotifications = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      if (!accessToken) return;

      if (isRefreshing) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      try {
        const res = await NotificationService.getUserNotifications(
          accessToken,
          pageNum
        );
        setNotifications((prev) =>
          pageNum === 1
            ? res.notifications
            : [
                ...prev,
                ...res.notifications.filter(
                  (n) => !prev.some((p) => p.id === n.id)
                ),
              ]
        );

        setTotalPages(res.totalPages);
        setHasMore(pageNum < res.totalPages);

        if (user?.isPrivate) {
          const knockers = await KnockService.getKnockers(accessToken);
          setPendingKnockRequestsData(
            knockers.filter((k) => k.status === "pending")
          );
        }
      } catch (error) {
        showToast("error", "Failed to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, user?.isPrivate]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!accessToken) return;
    try {
      await NotificationService.markAllNotificationsAsRead(accessToken);
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(1);
      markAllNotificationsAsRead();
      return () => {};
    }, [fetchNotifications, markAllNotificationsAsRead])
  );

  useEffect(() => {
    if (page > 1) {
      fetchNotifications(page);
    }
  }, [page, fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (n: NotificationResponse) => {
      setNotifications((prev) =>
        prev.some((p) => p.id === n.id) ? prev : [n, ...prev]
      );
      if (
        n.type === "activity" &&
        n.relatedEntityType === "Knock" &&
        n.knockStatus === "pending" &&
        user?.isPrivate
      ) {
        KnockService.getKnockers(accessToken!)
          .then((reqs) =>
            setPendingKnockRequestsData(
              reqs.filter((r) => r.status === "pending")
            )
          )
          .catch(console.error);
      }
    };

    const handleNewKnockRequest = (knock: KnockRequest) => {
      setPendingKnockRequestsData((prev) =>
        knock.status === "pending" && !prev.some((r) => r.id === knock.id)
          ? [knock, ...prev]
          : prev
      );
    };

    const handleKnockRequestRemoved = (id: string) =>
      setPendingKnockRequestsData((prev) => prev.filter((r) => r.id !== id));

    const handleKnockStatusUpdate = ({
      knockId,
      newStatus,
    }: {
      knockId: string;
      newStatus: string;
    }) => {
      if (newStatus !== "pending") {
        setPendingKnockRequestsData((prev) =>
          prev.filter((r) => r.id !== knockId)
        );
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.relatedEntityId === knockId && n.relatedEntityType === "Knock"
            ? ({ ...n, knockStatus: newStatus } as NotificationResponse)
            : n
        )
      );
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("newKnockRequest", handleNewKnockRequest);
    socket.on("knockRequestRemoved", handleKnockRequestRemoved);
    socket.on("knockStatusUpdate", handleKnockStatusUpdate);

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("newKnockRequest", handleNewKnockRequest);
      socket.off("knockRequestRemoved", handleKnockRequestRemoved);
      socket.off("knockStatusUpdate", handleKnockStatusUpdate);
    };
  }, [socket, accessToken, user?.isPrivate]);

  const groupedNotifications = useMemo(() => {
    return notifications
      .filter(
        (n) =>
          !(
            n.type === "activity" &&
            n.relatedEntityType === "Knock" &&
            n.knockStatus === "pending"
          )
      )
      .reduce((acc, notif) => {
        const group = formatNotificationDateGroup(notif.timestamp);
        acc[group] = acc[group] || [];
        acc[group].push(notif);
        return acc;
      }, {} as Record<string, NotificationResponse[]>);
  }, [notifications]);

  const sortedGroups = useMemo(() => {
    const order = [
      "Today",
      "Yesterday",
      "Last 7 Days",
      "Last 30 Days",
      "Older",
    ];
    const available = order.filter(
      (group) => groupedNotifications[group]?.length
    );
    if (groupedNotifications["Invalid Date"]?.length)
      available.push("Invalid Date");
    return available;
  }, [groupedNotifications]);

  const onRefresh = () => fetchNotifications(1, true);
  const handleLoadMore = () =>
    hasMore && !loading && !refreshing && setPage((p) => p + 1);

  const markNotificationAsRead = async (id: string) => {
    if (!accessToken) return;
    try {
      await NotificationService.markNotificationAsRead(id, accessToken);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark as read failed", err);
    }
  };

  const handleKnockBack = async (notificationId: string, knockId: string) => {
    if (!accessToken) return Alert.alert("Error", "Authentication required.");

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, metadata: { ...n.metadata, knockBackState: "knocking" } }
          : n
      )
    );

    try {
      await KnockService.knockBack(knockId, accessToken);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                knockStatus: "lockedIn",
                metadata: { ...n.metadata, knockBackState: "initial" },
              }
            : n
        )
      );
      showToast("success", "You knocked them back!");
    } catch (error: any) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, knockBackState: "failed" } }
            : n
        )
      );
      showToast(
        "error",
        error.response?.data?.message || "Failed to knock back."
      );
    }
  };

  const renderKnockBackButton = (item: NotificationResponse) => {
    const knockId = item.relatedEntityId;
    const localState = item.metadata?.knockBackState || "initial";
    const isKnocking = localState === "knocking";
    const isLocked = item.knockStatus === "lockedIn";
    const disabled = isKnocking || isLocked;

    return (
      <TouchableOpacity
        style={[
          styles.knockBackButton,
          {
            backgroundColor: disabled ? colors.primary + "50" : colors.primary,
          },
        ]}
        onPress={() => knockId && handleKnockBack(item.id, knockId)}
        disabled={disabled}
      >
        <ThemedText
          style={[styles.knockButtonText, { color: colors.buttonText }]}
        >
          {isKnocking ? "Knocking..." : isLocked ? "Knocked" : "Knock Back"}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationResponse }) => {
    const sender = item.user;
    if (!sender) return null;

    const isNew = !item.isRead;
    const isCurrentUserAction = user && sender.id === user._id;
    const isKnockNotif =
      item.type === "activity" &&
      item.relatedEntityType === "Knock" &&
      (item.content?.includes("knocked on you.") ||
        item.content?.includes("accepted your knock request."));

    const message = (
      <ThemedText
        style={styles.notificationText}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {!isCurrentUserAction && (
          <ThemedText style={styles.notificationUsername}>
            {sender.username}
          </ThemedText>
        )}{" "}
        <ThemedText style={styles.notificationText}>{item.content}</ThemedText>
      </ThemedText>
    );

    const onPress = () => {
      markNotificationAsRead(item.id);
      if (item.type === "message" && item.relatedEntityId) {
        router.push({
          pathname: `/(chat)/${item.relatedEntityId}`,
          params: {
            chatName: sender.username,
            chatAvatar: getUserAvatar(sender),
          },
        });
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isNew && { backgroundColor: colors.buttonBackgroundSecondary + "1A" },
        ]}
        onPress={onPress}
      >
        <UserAvatar
          imageUri={getUserAvatar(sender)}
          size={45}
          style={styles.notificationAvatar}
        />
        <ThemedView style={styles.notificationContent}>
          <ThemedView style={styles.notificationMessageWrapper}>
            {message}
            <ThemedText
              style={[styles.notificationTimestamp, { color: colors.textDim }]}
            >
              {formatNotificationTimestamp(item.timestamp)}
            </ThemedText>
          </ThemedView>
          {isKnockNotif && renderKnockBackButton(item)}
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          title="Notifications"
          leftContent={<BackButton />}
          showBottomBorder
        />

        {loading && page === 1 && !refreshing ? (
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
            <ThemedText type="subtitle" style={{ color: colors.textDim }}>
              Loading notifications...
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {user?.isPrivate && (
              <TouchableOpacity
                style={[
                  styles.friendRequestsContainer,
                  { backgroundColor: colors.buttonBackgroundSecondary },
                ]}
                onPress={() => router.push("/(notifications)/requests")}
              >
                <ThemedView
                  style={[
                    styles.friendRequestAvatars,
                    knockRequestDisplay.count === 0 &&
                      styles.noRequestsAvatarWrapper,
                  ]}
                >
                  {knockRequestDisplay.count === 1 ? (
                    <UserAvatar
                      imageUri={knockRequestDisplay.avatar1Uri}
                      size={40}
                      style={styles.singleRequestUserAvatar}
                    />
                  ) : knockRequestDisplay.count > 1 ? (
                    <>
                      <UserAvatar
                        imageUri={knockRequestDisplay.avatar1Uri}
                        size={40}
                        style={styles.friendRequestAvatar1}
                      />
                      <UserAvatar
                        imageUri={knockRequestDisplay.avatar2Uri}
                        size={40}
                        style={styles.friendRequestAvatar2}
                      />
                    </>
                  ) : (
                    <UserAvatar
                      imageUri={null}
                      size={40}
                      style={styles.noRequestsUserAvatar}
                    />
                  )}
                </ThemedView>
                <ThemedView style={styles.friendRequestTextContent}>
                  <ThemedText style={styles.friendRequestTitle}>
                    Knock Requests
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.friendRequestCount,
                      { color: colors.textDim },
                    ]}
                  >
                    {knockRequestDisplay.message}
                  </ThemedText>
                </ThemedView>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={colors.textDim}
                />
              </TouchableOpacity>
            )}

            <FlatList
              data={sortedGroups}
              keyExtractor={(item) => item}
              renderItem={({ item: group }) => (
                <ThemedView>
                  <ThemedText
                    style={[styles.sectionHeader, { color: colors.text }]}
                  >
                    {group}
                  </ThemedText>
                  {groupedNotifications[group]?.map((n) => (
                    <ThemedView key={n.id}>
                      {renderNotificationItem({ item: n })}
                    </ThemedView>
                  ))}
                </ThemedView>
              )}
              contentContainerStyle={styles.notificationListContent}
              ListEmptyComponent={() =>
                Object.keys(groupedNotifications).length === 0 &&
                (!user?.isPrivate || privateKnockRequestsCount === 0) ? (
                  <ThemedView style={styles.emptyListContainer}>
                    <ThemedText
                      style={{
                        fontSize: 16,
                        color: colors.textDim,
                        textAlign: "center",
                      }}
                    >
                      No notifications yet.
                    </ThemedText>
                  </ThemedView>
                ) : null
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              ListFooterComponent={
                hasMore && !loading && !refreshing ? (
                  <ThemedView style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <ThemedText style={{ color: colors.textDim, marginTop: 5 }}>
                      Loading more...
                    </ThemedText>
                  </ThemedView>
                ) : null
              }
            />
          </>
        )}
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingMoreContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  friendRequestsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  friendRequestAvatars: {
    flexDirection: "row",
    position: "relative",
    width: 60,
    height: 40,
  },
  multiAvatarMargin: {
    marginRight: 15,
  },
  singleAvatarWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    marginRight: 15,
  },
  friendRequestAvatar1: {
    position: "absolute",
    left: 0,
    zIndex: 2,
    borderWidth: 1,
  },
  friendRequestAvatar2: {
    position: "absolute",
    left: 20,
    zIndex: 1,
    borderWidth: 1,
  },
  noRequestsAvatarWrapper: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  noRequestsUserAvatar: {
    position: "relative",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderWidth: 1,
  },
  singleRequestUserAvatar: {
    position: "relative",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    marginRight: 15,
    borderWidth: 1,
  },
  notificationListContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  notificationAvatar: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationMessageWrapper: {
    flex: 1,
    marginRight: 10,
  },
  notificationMessageAndButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 15,
  },
  notificationUsername: {
    fontWeight: "bold",
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTimestamp: {
    fontSize: 12,
    lineHeight: 20,
    marginTop: 2,
  },
  friendRequestTextContent: {
    flex: 1,
    justifyContent: "center",
  },
  friendRequestTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  friendRequestCount: {
    fontSize: 14,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "transparent",
  },
  knockBackButton: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
  knockButtonText: {
    fontWeight: "bold",
    fontSize: 12,
  },
});