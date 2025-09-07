import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, FlatList, View, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import NotificationService, { NotificationResponse } from "@/services/NotificationService";
import KnockService, { KnockRequest } from "@/services/knockService";
import GameService from "@/services/GameService";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { formatNotificationDateGroup, formatNotificationTimestamp, getUserAvatar, showToast } from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";

type GameInviteMetadata = {
  gameId: string;
  gameName: string;
  initiatorUsername: string;
  initiatorAvatar: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'in-progress';
};

type EnrichedNotificationItem = NotificationResponse & {
  knockStatus?: "pending" | "lockedIn" | "onesidedlock" | "declined" | null;
  gameInviteMeta?: GameInviteMetadata;
};

const buildKnockRequestDisplay = (requests: KnockRequest[]) => {
  const count = requests.length;
  const avatar1Uri = requests[0]?.user?.avatar || null;
  const avatar2Uri = requests[1]?.user?.avatar || null;
  const message = count === 0 ? "No new knocks yet." : `${count} new knock${count > 1 ? "s" : ""}`;
  return { count, avatar1Uri, avatar2Uri, message };
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<EnrichedNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pendingKnockRequestsData, setPendingKnockRequestsData] = useState<KnockRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const privateKnockRequestsCount = pendingKnockRequestsData.length;

  const knockRequestDisplay = useMemo(() => buildKnockRequestDisplay(pendingKnockRequestsData), [pendingKnockRequestsData]);

  const fetchNotifications = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      console.log(`[NotificationsScreen] Fetching notifications: page ${pageNum}, isRefreshing: ${isRefreshing}`);
      if (!accessToken) {
        console.warn("[NotificationsScreen] No accessToken, cannot fetch notifications.");
        return;
      }

      if (isRefreshing) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      try {
        const res = await NotificationService.getUserNotifications(accessToken, pageNum);
        console.log(`[NotificationsScreen] Received ${res.notifications.length} notifications for page ${pageNum}.`);
        setNotifications((prev) =>
          pageNum === 1
            ? res.notifications.map(n => ({
                ...n,
                knockStatus: n.knockStatus || null,
                gameInviteMeta: n.type === 'game_invite' ? (n.metadata as GameInviteMetadata) : undefined,
              }))
            : [...prev, ...res.notifications.map(n => ({
                  ...n,
                  knockStatus: n.knockStatus || null,
                  gameInviteMeta: n.type === 'game_invite' ? (n.metadata as GameInviteMetadata) : undefined,
                })).filter(
                  (n) => !prev.some((p) => p.id === n.id)
                ),
              ]
        );

        setTotalPages(res.totalPages);
        setHasMore(pageNum < res.totalPages);
        console.log(`[NotificationsScreen] Total pages: ${res.totalPages}, Has more: ${pageNum < res.totalPages}`);

        if (user?.isPrivate) {
          const knockers = await KnockService.getKnockers(accessToken);
          setPendingKnockRequestsData(knockers.filter((k) => k.status === "pending"));
          console.log(`[NotificationsScreen] Fetched ${knockers.length} knockers, ${knockers.filter(k => k.status === 'pending').length} pending.`);
        }
      } catch (error) {
        showToast("error", "Failed to load notifications.");
        console.error("[NotificationsScreen] Error fetching notifications:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        console.log("[NotificationsScreen] Notification fetching finished.");
      }
    },
    [accessToken, user?.isPrivate]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    console.log("[NotificationsScreen] Marking all notifications as read.");
    if (!accessToken) return;
    try {
      await NotificationService.markAllNotificationsAsRead(accessToken);
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      console.log("[NotificationsScreen] All notifications marked as read in UI.");
    } catch (error) {
      console.error("[NotificationsScreen] Error marking all notifications as read:", error);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      console.log("[NotificationsScreen] useFocusEffect triggered. Fetching and marking all as read.");
      fetchNotifications(1);
      markAllNotificationsAsRead();
      return () => {
        console.log("[NotificationsScreen] useFocusEffect cleanup.");
      };
    }, [fetchNotifications, markAllNotificationsAsRead])
  );

  useEffect(() => {
    console.log(`[NotificationsScreen] Page changed to ${page}.`);
    if (page > 1) {
      fetchNotifications(page);
    }
  }, [page, fetchNotifications]);

  useEffect(() => {
    console.log("[NotificationsScreen] useEffect for socket listeners started.");
    if (!socket) {
      console.warn("[NotificationsScreen] Socket not available for listeners.");
      return;
    }

    const handleNewNotification = (n: NotificationResponse) => {
      console.log("[NotificationsScreen] Received newNotification socket event:", n);
      const enrichedN: EnrichedNotificationItem = {
          ...n,
          knockStatus: n.knockStatus || null,
          gameInviteMeta: n.type === 'game_invite' ? (n.metadata as GameInviteMetadata) : undefined,
      };
      setNotifications((prev) =>
        prev.some((p) => p.id === n.id) ? prev : [enrichedN, ...prev]
      );
      if (
        enrichedN.type === "activity" &&
        enrichedN.relatedEntityType === "Knock" &&
        enrichedN.knockStatus === "pending" &&
        user?.isPrivate
      ) {
        console.log("[NotificationsScreen] New pending knock request detected. Refetching knockers.");
        KnockService.getKnockers(accessToken!)
          .then((reqs) =>
            setPendingKnockRequestsData(
              reqs.filter((r) => r.status === "pending")
            )
          )
          .catch(console.error);
      }
      if (enrichedN.type === 'game_invite') {
        showToast('info', `New Game Invite: ${enrichedN.content}`);
      }
    };

    const handleNewKnockRequest = (knock: KnockRequest) => {
      console.log("[NotificationsScreen] Received newKnockRequest socket event:", knock);
      setPendingKnockRequestsData((prev) =>
        knock.status === "pending" && !prev.some((r) => r.id === knock.id)
          ? [knock, ...prev]
          : prev
      );
    };

    const handleKnockRequestRemoved = (id: string) => {
      console.log("[NotificationsScreen] Received knockRequestRemoved socket event:", id);
      setPendingKnockRequestsData((prev) => prev.filter((r) => r.id !== id));
    };

    const handleKnockStatusUpdate = ({
      knockId,
      newStatus,
    }: {
      knockId: string;
      newStatus: string;
    }) => {
      console.log(`[NotificationsScreen] Received knockStatusUpdate socket event for knockId ${knockId}, status: ${newStatus}`);
      if (newStatus !== "pending") {
        setPendingKnockRequestsData((prev) => prev.filter((r) => r.id !== knockId));
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.relatedEntityId === knockId && n.relatedEntityType === "Knock"
            ? ({ ...n, knockStatus: newStatus } as EnrichedNotificationItem)
            : n
        )
      );
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("newKnockRequest", handleNewKnockRequest);
    socket.on("knockRequestRemoved", handleKnockRequestRemoved);
    socket.on("knockStatusUpdate", handleKnockStatusUpdate);
    console.log("[NotificationsScreen] All socket listeners set up.");

    return () => {
      console.log("[NotificationsScreen] Cleaning up socket listeners.");
      socket.off("newNotification", handleNewNotification);
      socket.off("newKnockRequest", handleNewKnockRequest);
      socket.off("knockRequestRemoved", handleKnockRequestRemoved);
      socket.off("knockStatusUpdate", handleKnockStatusUpdate);
    };
  }, [socket, accessToken, user?.isPrivate]);

  const groupedNotifications = useMemo(() => {
    console.log("[NotificationsScreen] Recalculating grouped notifications.");
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
      }, {} as Record<string, EnrichedNotificationItem[]>);
  }, [notifications]);

  const sortedGroups = useMemo(() => {
    console.log("[NotificationsScreen] Recalculating sorted groups.");
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
    if (groupedNotifications["Invalid Date"]?.length) available.push("Invalid Date");
    return available;
  }, [groupedNotifications]);

  const onRefresh = () => {
    console.log("[NotificationsScreen] Initiating manual refresh.");
    fetchNotifications(1, true);
  };
  const handleLoadMore = () => {
    console.log(`[NotificationsScreen] Attempting to load more. HasMore: ${hasMore}, Loading: ${loading}, Refreshing: ${refreshing}`);
    hasMore && !loading && !refreshing && setPage((p) => p + 1);
  };

  const markNotificationAsRead = async (id: string) => {
    console.log(`[NotificationsScreen] Marking notification ${id} as read.`);
    if (!accessToken) return;
    try {
      await NotificationService.markNotificationAsRead(id, accessToken);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      console.log(`[NotificationsScreen] Notification ${id} marked as read in UI.`);
    } catch (err) {
      console.error(`[NotificationsScreen] Mark as read failed for ${id}:`, err);
    }
  };

  const handleKnockBack = async (notificationId: string, knockId: string) => {
    console.log(`[NotificationsScreen] handleKnockBack called for notification: ${notificationId}, knock: ${knockId}`);
    if (!accessToken) {
      Alert.alert("Error", "Authentication required.");
      return;
    }

    setActionLoadingId(notificationId);

    try {
      await KnockService.knockBack(knockId, accessToken);
      showToast("success", "You knocked them back!");
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, knockBackState: "knocking" } }
            : n
        )
      );
      console.log(`[NotificationsScreen] Knock back successful for notification: ${notificationId}`);
    } catch (error: any) {
      showToast("error", error.response?.data?.message || "Failed to knock back.");
      console.error("[NotificationsScreen] Error knocking back:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

const handleGameInviteAction = async (notificationId: string, gameSessionId: string, action: 'accept' | 'decline', gameIdFromNotification: string) => {
    console.log(`[NotificationsScreen] handleGameInviteAction called: notification ${notificationId}, session ${gameSessionId}, action: ${action}`);
    if (!accessToken) {
      console.warn("[NotificationsScreen] handleGameInviteAction: No accessToken available.");
      Alert.alert("Error", "Authentication required.");
      return;
    }
    if (!socket || !user) {
        console.warn("[NotificationsScreen] handleGameInviteAction: Socket or user not available.");
        Alert.alert("Error", "Socket connection not ready.");
        return;
    }

    setActionLoadingId(notificationId);

    try {
      if (action === 'accept') {
        console.log(`[NotificationsScreen] Attempting to accept game invite for session: ${gameSessionId}`);
        await GameService.acceptGameInvite(accessToken, gameSessionId);
        showToast('success', 'Game invite accepted!');

        console.log(`[NotificationsScreen] Emitting 'joinGameSession' for user ${user._id} to room ${gameSessionId} after accept.`);
        socket.emit('joinGameSession', gameSessionId);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, gameInviteMeta: { ...n.gameInviteMeta!, status: 'accepted' } }
              : n
          )
        );
        console.log(`[NotificationsScreen] Game invite ${notificationId} accepted in UI.`);

      } else {
        console.log(`[NotificationsScreen] Attempting to decline game invite for session: ${gameSessionId}`);
        await GameService.declineGameInvite(accessToken, gameSessionId);
        showToast('info', 'Game invite declined.');
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, gameInviteMeta: { ...n.gameInviteMeta!, status: 'declined' } }
              : n
          )
        );
        console.log(`[NotificationsScreen] Game invite ${notificationId} declined in UI.`);
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || `Failed to ${action} invite.`);
      console.error(`[NotificationsScreen] Error ${action}ing invite for ${gameSessionId}:`, error);
    } finally {
      setActionLoadingId(null);
      console.log(`[NotificationsScreen] Action finished for notification: ${notificationId}.`);
    }
};

  const renderKnockBackButton = (item: EnrichedNotificationItem) => {
    const knockId = item.relatedEntityId;
    const localState = item.metadata?.knockBackState || "initial";
    const isKnocking = localState === "knocking";
    const isLocked = item.knockStatus === "lockedIn";
    const disabled = isKnocking || isLocked;

    console.log(`[NotificationsScreen] Rendering Knock Back Button for ${item.id}. Status: ${item.knockStatus}, Local State: ${localState}`);
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

  const renderNotificationItem = ({ item }: { item: EnrichedNotificationItem }) => {
    const sender = item.user;
    if (!sender) {
      console.warn(`[NotificationsScreen] Notification item ${item.id} has no sender user data. Skipping render.`);
      return null;
    }

    const isNew = !item.isRead;
    const isCurrentUserAction = user && sender.id === user._id;

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

    const onPressNotificationItem = () => {
      console.log(`[NotificationsScreen] Tapped notification item: ${item.id}`);
      markNotificationAsRead(item.id);
      if (item.type === "message" && item.relatedEntityId) {
        console.log(`[NotificationsScreen] Navigating to chat: ${item.relatedEntityId}`);
        router.push({
          pathname: `/(chat)/${item.relatedEntityId}`,
          params: {
            chatName: sender.username,
            chatAvatar: getUserAvatar(sender),
          },
        });
      }
    };

    const isLoadingAction = actionLoadingId === item.id;

    if (item.type === 'game_invite' && item.relatedEntityId && item.gameInviteMeta) {
      console.log(`[NotificationsScreen] Rendering game invite notification: ${item.id}`);
      const gameInviteMeta = item.gameInviteMeta;
      const inviteStatus = gameInviteMeta.status || 'pending';
      const isProcessed = ['accepted', 'declined', 'in-progress'].includes(inviteStatus);

      return (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            isNew && { backgroundColor: colors.buttonBackgroundSecondary + "1A" },
          ]}
          onPress={onPressNotificationItem}
          disabled={isLoadingAction || isProcessed}
        >
          <UserAvatar
            imageUri={gameInviteMeta.initiatorAvatar || getUserAvatar(sender)}
            size={45}
            style={styles.notificationAvatar}
          />
          <ThemedView style={styles.notificationContent}>
            <ThemedView style={styles.notificationMessageWrapper}>
              <ThemedText style={styles.notificationText}>
                <ThemedText style={styles.notificationUsername}>
                  {gameInviteMeta.initiatorUsername || sender.username}
                </ThemedText>{' '}
                invited you to play{' '}
                <ThemedText style={styles.notificationGameName}>
                  {gameInviteMeta.gameName || 'a game'}
                </ThemedText>
                !
              </ThemedText>
              <ThemedText
                style={[styles.notificationTimestamp, { color: colors.textDim }]}
              >
                {formatNotificationTimestamp(item.timestamp)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.notificationActions}>
              {isLoadingAction ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isProcessed ? (
                <ThemedText style={[styles.gameInviteStatusText, { color: (inviteStatus === 'accepted' || inviteStatus === 'in-progress') ? colors.success : colors.error }]}>
                  {inviteStatus === 'accepted' ? 'Accepted' : inviteStatus === 'in-progress' ? 'Joined' : 'Declined'}
                </ThemedText>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.gameActionButton, { backgroundColor: colors.success }]}
                    onPress={() => handleGameInviteAction(item.id, item.relatedEntityId!, 'accept', item.gameInviteMeta?.gameId!)}
                  >
                    <ThemedText style={[styles.gameActionButtonText, { color: colors.buttonText }]}>
                      Accept
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gameActionButton, { backgroundColor: colors.error, marginLeft: 8 }]}
                    onPress={() => handleGameInviteAction(item.id, item.relatedEntityId!, 'decline', item.gameInviteMeta?.gameId!)}
                  >
                    <ThemedText style={[styles.gameActionButtonText, { color: colors.buttonText }]}>
                      Decline
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ThemedView>
          </ThemedView>
        </TouchableOpacity>
      );
    }

    const isKnockNotif =
      item.type === "activity" &&
      item.relatedEntityType === "Knock" &&
      (item.content?.includes("knocked on you.") ||
        item.content?.includes("accepted your knock request."));

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isNew && { backgroundColor: colors.buttonBackgroundSecondary + "1A" },
        ]}
        onPress={onPressNotificationItem}
        disabled={isLoadingAction}
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
          {isKnockNotif && (
            <ThemedView style={styles.notificationActions}>
              {isLoadingAction ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                renderKnockBackButton(item)
              )}
            </ThemedView>
          )}
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          title="Notifications"
          leftContent={<BackButton color={colors.text}/>}
          showBottomBorder
        />

        {loading && page === 1 && !refreshing ? (
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={{ color: colors.textDim }}>
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
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  gameActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameActionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationGameName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  gameInviteStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  }
});