import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
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
import GameService from "@/services/GameService";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatNotificationDateGroup,
  formatNotificationTimestamp,
} from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";

type GameInviteMetadata = {
  gameId: string;
  gameName: string;
  initiatorUsername: string;
  initiatorAvatar: string | null;
  status: "pending" | "accepted" | "decline" | "in-progress";
};

type EnrichedNotificationItem = NotificationResponse & {
  knockStatus?: "pending" | "lockedIn" | "onesidedlock" | "declined" | null;
  gameInviteMeta?: GameInviteMetadata;
  hasMutualKnockRequest?: boolean;
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
  const { accessToken, user, fetchProfile } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<
    EnrichedNotificationItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pendingKnockRequestsData, setPendingKnockRequestsData] = useState<
    KnockRequest[]
  >([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [mutualKnockRequests, setMutualKnockRequests] = useState<Set<string>>(
    new Set()
  );

  const [isProfilePrivate, setIsProfilePrivate] = useState(user?.isPrivate);

  const privateKnockRequestsCount = pendingKnockRequestsData.length;

  const knockRequestDisplay = useMemo(
    () => buildKnockRequestDisplay(pendingKnockRequestsData),
    [pendingKnockRequestsData]
  );

  const fetchNotifications = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      console.log(
        `[NotificationsScreen] Fetching notifications: page ${pageNum}, isRefreshing: ${isRefreshing}`
      );
      if (!accessToken) {
        console.warn(
          "[NotificationsScreen] No accessToken, cannot fetch notifications."
        );
        return;
      }

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
        console.log(
          `[NotificationsScreen] Received ${res.notifications.length} notifications for page ${pageNum}.`
        );

        // Check for mutual knock requests for each notification
        const enrichedNotifications = await Promise.all(
          res.notifications.map(async (n) => {
            let hasMutualKnockRequest = false;

            // If this is a knock notification, check if user has sent a mutual request
            if (
              n.type === "activity" &&
              n.relatedEntityType === "Knock" &&
              n.content?.includes("knocked on you.") &&
              n.user
            ) {
              try {
                const knocked = await KnockService.getKnocked(accessToken);
                hasMutualKnockRequest = knocked.some(
                  (k) => k.knockedId === n.user.id && k.status === "pending"
                );
              } catch (error) {
                console.warn("Error checking mutual knock requests:", error);
              }
            }

            return {
              ...n,
              knockStatus: n.knockStatus || null,
              hasMutualKnockRequest,
              gameInviteMeta:
                n.type === "game_invite"
                  ? (n.metadata as GameInviteMetadata)
                  : undefined,
            } as EnrichedNotificationItem;
          })
        );

        setNotifications((prev) =>
          pageNum === 1
            ? enrichedNotifications
            : [
                ...prev,
                ...enrichedNotifications.filter(
                  (n) => !prev.some((p) => p.id === n.id)
                ),
              ]
        );

        setTotalPages(res.totalPages);
        setHasMore(pageNum < res.totalPages);
        console.log(
          `[NotificationsScreen] Total pages: ${res.totalPages}, Has more: ${
            pageNum < res.totalPages
          }`
        );
      } catch (error) {
        console.log("error", "Failed to load notifications.");
        console.error(
          "[NotificationsScreen] Error fetching notifications:",
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        console.log("[NotificationsScreen] Notification fetching finished.");
      }
    },
    [accessToken]
  );

  const fetchPendingKnockRequests = useCallback(async () => {
    if (!accessToken || !user?._id) return;

    try {
      const updatedUser = await fetchProfile();
      setIsProfilePrivate(updatedUser.isPrivate);

      if (updatedUser.isPrivate) {
        const knockers = await KnockService.getKnockers(accessToken);
        const filteredPendingKnocks = knockers.filter(
          (k) => k.status === "pending" && k.knockerId !== user._id
        );
        setPendingKnockRequestsData(filteredPendingKnocks);

        // Also fetch knocked users to track mutual requests
        const knocked = await KnockService.getKnocked(accessToken);
        const mutualRequests = new Set(
          knocked.filter((k) => k.status === "pending").map((k) => k.knockedId)
        );
        setMutualKnockRequests(mutualRequests);

        console.log(
          `[NotificationsScreen] Fetched ${knockers.length} knocks. Displaying ${filteredPendingKnocks.length} pending requests. Mutual requests: ${mutualRequests.size}`
        );
      } else {
        setPendingKnockRequestsData([]);
        setMutualKnockRequests(new Set());
        console.log(
          "[NotificationsScreen] User profile is public, clearing knock requests."
        );
      }
    } catch (error) {
      console.error("Error fetching pending knock requests:", error);
    }
  }, [accessToken, fetchProfile, user?._id]);

  const markAllNotificationsAsRead = useCallback(async () => {
    console.log("[NotificationsScreen] Marking all notifications as read.");
    if (!accessToken) return;
    try {
      await NotificationService.markAllNotificationsAsRead(accessToken);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      if (socket) {
        socket.emit("unreadNotificationCountUpdate", { count: 0 });
      }
    } catch (error) {
      console.error(
        "[NotificationsScreen] Error marking all notifications as read:",
        error
      );
    }
  }, [accessToken, socket]);

  useFocusEffect(
    useCallback(() => {
      console.log(
        "[NotificationsScreen] useFocusEffect triggered. Fetching and marking all as read."
      );
      fetchNotifications(1);
      fetchPendingKnockRequests();
      markAllNotificationsAsRead();
      return () => {
        console.log("[NotificationsScreen] useFocusEffect cleanup.");
      };
    }, [
      fetchNotifications,
      markAllNotificationsAsRead,
      fetchPendingKnockRequests,
    ])
  );

  useEffect(() => {
    console.log(`[NotificationsScreen] Page changed to ${page}.`);
    if (page > 1) {
      fetchNotifications(page);
    }
  }, [page, fetchNotifications]);

  useEffect(() => {
    console.log(
      "[NotificationsScreen] useEffect for socket listeners started."
    );
    if (!socket) {
      console.warn("[NotificationsScreen] Socket not available for listeners.");
      return;
    }

    const handleNewNotification = (n: NotificationResponse) => {
      console.log(
        "[NotificationsScreen] Received newNotification socket event:",
        n
      );
      const enrichedN: EnrichedNotificationItem = {
        ...n,
        knockStatus: n.knockStatus || null,
        hasMutualKnockRequest: false, // Will be updated if needed
        gameInviteMeta:
          n.type === "game_invite"
            ? (n.metadata as GameInviteMetadata)
            : undefined,
      };
      setNotifications((prev) =>
        prev.some((p) => p.id === n.id) ? prev : [enrichedN, ...prev]
      );
    };

    const handleNewKnockRequest = (knock: KnockRequest) => {
      console.log(
        "[NotificationsScreen] Received newKnockRequest socket event:",
        knock
      );
      setPendingKnockRequestsData((prev) =>
        knock.status === "pending" && !prev.some((r) => r.id === knock.id)
          ? [knock, ...prev]
          : prev
      );
    };

    const handleKnockRequestRemoved = (id: string) => {
      console.log(
        "[NotificationsScreen] Received knockRequestRemoved socket event:",
        id
      );
      setPendingKnockRequestsData((prev) => prev.filter((r) => r.id !== id));
      setNotifications((prev) => prev.filter((n) => n.relatedEntityId !== id));
    };

    const handleKnockStatusUpdated = ({
      knockId,
      newStatus,
    }: {
      knockId: string;
      newStatus: string;
    }) => {
      console.log(
        `[NotificationsScreen] Received knockStatusUpdated for knockId: ${knockId}, newStatus: ${newStatus}`
      );

      // Update notification status
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => {
          if (notification.relatedEntityId === knockId) {
            return {
              ...notification,
              knockStatus: newStatus as EnrichedNotificationItem["knockStatus"],
            } as EnrichedNotificationItem;
          }
          return notification;
        })
      );

      // Refresh mutual knock requests to update button states
      fetchPendingKnockRequests();
    };

    const handleUserProfileUpdated = () => {
      console.log(
        "[NotificationsScreen] Received userProfileUpdated. Re-fetching profile and knock requests."
      );
      fetchPendingKnockRequests();
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("newKnockRequest", handleNewKnockRequest);
    socket.on("knockRequestRemoved", handleKnockRequestRemoved);
    socket.on("knockStatusUpdated", handleKnockStatusUpdated);
    socket.on("userProfileUpdated", handleUserProfileUpdated);

    console.log("[NotificationsScreen] All socket listeners set up.");

    return () => {
      console.log("[NotificationsScreen] Cleaning up socket listeners.");
      socket.off("newNotification", handleNewNotification);
      socket.off("newKnockRequest", handleNewKnockRequest);
      socket.off("knockRequestRemoved", handleKnockRequestRemoved);
      socket.off("knockStatusUpdated", handleKnockStatusUpdated);
      socket.off("userProfileUpdated", handleUserProfileUpdated);
    };
  }, [socket, accessToken, fetchPendingKnockRequests]);

  const groupedNotifications = useMemo(() => {
    console.log("[NotificationsScreen] Recalculating grouped notifications.");
    return notifications.reduce((acc, notif) => {
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
    if (groupedNotifications["Invalid Date"]?.length)
      available.push("Invalid Date");
    return available;
  }, [groupedNotifications]);

  const onRefresh = () => {
    console.log("[NotificationsScreen] Initiating manual refresh.");
    fetchNotifications(1, true);
    fetchPendingKnockRequests();
  };

  const handleLoadMore = () => {
    console.log(
      `[NotificationsScreen] Attempting to load more. HasMore: ${hasMore}, Loading: ${loading}, Refreshing: ${refreshing}`
    );
    hasMore && !loading && !refreshing && setPage((p) => p + 1);
  };

  const markNotificationAsRead = async (id: string) => {
    console.log(`[NotificationsScreen] Marking notification ${id} as read.`);
    if (!accessToken) return;
    try {
      await NotificationService.markNotificationAsRead(id, accessToken);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      console.log(
        `[NotificationsScreen] Notification ${id} marked as read in UI.`
      );
    } catch (err) {
      console.error(
        `[NotificationsScreen] Mark as read failed for ${id}:`,
        err
      );
    }
  };

  const handleKnockBack = async (
    notificationId: string,
    knockId: string,
    knockerUserId: string
  ) => {
    console.log(
      `[NotificationsScreen] handleKnockBack called for notification: ${notificationId}, knock: ${knockId}`
    );
    if (!accessToken) {
      console.log("Error", "Authentication required.");
      return;
    }

    setActionLoadingId(notificationId);

    try {
      await KnockService.knockBack(knockId, accessToken);
      console.log("success", "You knocked them back!");

      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === notificationId) {
            return {
              ...n,
              hasMutualKnockRequest: true,
              knockStatus: "pending",
            };
          }
          return n;
        })
      );

      setMutualKnockRequests((prev) => new Set([...prev, knockerUserId]));

      console.log(
        `[NotificationsScreen] Knock back successful for notification: ${notificationId}`
      );
    } catch (error: any) {
      console.log(
        "error",
        error.response?.data?.message || "Failed to knock back."
      );
      console.error("[NotificationsScreen] Error knocking back:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGameInviteAction = async (
    notificationId: string,
    gameSessionId: string,
    action: "accept" | "decline",
    gameIdFromNotification: string
  ) => {
    console.log(
      `[NotificationsScreen] handleGameInviteAction called: notification ${notificationId}, session ${gameSessionId}, action: ${action}`
    );
    if (!accessToken) {
      console.warn(
        "[NotificationsScreen] handleGameInviteAction: No accessToken available."
      );
      console.log("Error", "Authentication required.");
      return;
    }
    if (!socket || !user) {
      console.warn(
        "[NotificationsScreen] handleGameInviteAction: Socket or user not available."
      );
      console.log("Error", "Socket connection not ready.");
      return;
    }

    setActionLoadingId(notificationId);

    try {
      if (action === "accept") {
        console.log(
          `[NotificationsScreen] Attempting to accept game invite for session: ${gameSessionId}`
        );
        await GameService.acceptGameInvite(accessToken, gameSessionId);
        console.log("success", "Game invite accepted!");

        console.log(
          `[NotificationsScreen] Emitting 'joinGameSession' for user ${user._id} to room ${gameSessionId} after accept.`
        );
        socket.emit("joinGameSession", gameSessionId);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  gameInviteMeta: { ...n.gameInviteMeta!, status: "accepted" },
                }
              : n
          )
        );
        console.log(
          `[NotificationsScreen] Game invite ${notificationId} accepted in UI.`
        );
      } else {
        console.log(
          `[NotificationsScreen] Attempting to decline game invite for session: ${gameSessionId}`
        );
        await GameService.declineGameInvite(accessToken, gameSessionId);
        console.log("info", "Game invite declined.");
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  gameInviteMeta: { ...n.gameInviteMeta!, status: "decline" },
                }
              : n
          )
        );
        console.log(
          `[NotificationsScreen] Game invite ${notificationId} declined in UI.`
        );
      }
    } catch (error: any) {
      console.log(
        "error",
        error.response?.data?.message || `Failed to ${action} invite.`
      );
      console.error(
        `[NotificationsScreen] Error ${action}ing invite for ${gameSessionId}:`,
        error
      );
    } finally {
      setActionLoadingId(null);
      console.log(
        `[NotificationsScreen] Action finished for notification: ${notificationId}.`
      );
    }
  };

  const renderKnockActionButton = (item: EnrichedNotificationItem) => {
    const knockId = item.relatedEntityId;
    const knockerUserId = item.user?.id;
    const isLoading = actionLoadingId === item.id;
    const isKnockbackAction = item.content?.includes("knocked on you.");

    if (!isKnockbackAction || !knockerUserId) {
      return null;
    }

    console.log(
      `[KnockActionButton] Rendering for notification ${item.id}. Current knockStatus: ${item.knockStatus}, hasMutualKnockRequest: ${item.hasMutualKnockRequest}`
    );

    const isLocked = item.knockStatus === "lockedIn";
    const isOneSided = item.knockStatus === "onesidedlock";
    const isPending = item.knockStatus === "pending";
    const hasMutualRequest =
      item.hasMutualKnockRequest || mutualKnockRequests.has(knockerUserId);

    // Show "Requested" if user has sent a mutual knock request to the knocker
    if ((isOneSided && hasMutualRequest) || isPending) {
      return (
        <TouchableOpacity
          style={[
            styles.knockBackButton,
            {
              backgroundColor: colors.buttonBackgroundSecondary,
              borderWidth: 1,
              borderColor: colors.primary,
            },
          ]}
          disabled={true}
        >
          <ThemedText
            style={[styles.knockButtonText, { color: colors.primary }]}
          >
            Requested
          </ThemedText>
        </TouchableOpacity>
      );
    }

    // Show "Knock Back" for one-sided knocks where no mutual request exists
    if (isOneSided && !hasMutualRequest) {
      return (
        <TouchableOpacity
          style={[
            styles.knockBackButton,
            {
              backgroundColor: isLoading
                ? colors.primary + "50"
                : colors.primary,
            },
          ]}
          onPress={() =>
            knockId && handleKnockBack(item.id, knockId, knockerUserId)
          }
          disabled={isLoading}
        >
          <ThemedText
            style={[styles.knockButtonText, { color: colors.buttonText }]}
          >
            {isLoading ? "Knocking..." : "Knock Back"}
          </ThemedText>
        </TouchableOpacity>
      );
    }

    // Show "Knocked" for locked connections
    if (isLocked) {
      return (
        <TouchableOpacity
          style={[
            styles.knockBackButton,
            { backgroundColor: colors.primary, opacity: 0.5 },
          ]}
          disabled={true}
        >
          <ThemedText
            style={[styles.knockButtonText, { color: colors.buttonText }]}
          >
            Knocked
          </ThemedText>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderNotificationItem = ({
    item,
  }: {
    item: EnrichedNotificationItem;
  }) => {
    const sender = item.user;
    if (!sender) {
      console.warn(
        `[NotificationsScreen] Notification item ${item.id} has no sender user data. Skipping render.`
      );
      return null;
    }

    const isNew = !item.isRead;
    const isCurrentUserAction = user && sender.id === user._id;
    const isSelfAction = item.content?.startsWith("You knocked back");

    const message = (
      <ThemedText
        style={styles.notificationText}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {!isCurrentUserAction && !isSelfAction ? (
          <ThemedText style={styles.notificationUsername}>
            {sender.username}{" "}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.notificationText}>
          {item.content?.startsWith(" ") ? item.content.trim() : item.content}
        </ThemedText>
      </ThemedText>
    );

    const onPressNotificationItem = () => {
      console.log(`[NotificationsScreen] Tapped notification item: ${item.id}`);
      markNotificationAsRead(item.id);
      if (item.type === "message" && item.relatedEntityId) {
        console.log(
          `[NotificationsScreen] Navigating to chat: ${item.relatedEntityId}`
        );
        router.push({
          pathname: `/(chat)/${item.relatedEntityId}`,
          params: {
            chatName: sender.username,
            chatAvatar: sender.avatar || "",
          },
        });
      }
    };

    const isLoadingAction = actionLoadingId === item.id;

    if (
      item.type === "game_invite" &&
      item.relatedEntityId &&
      item.gameInviteMeta
    ) {
      console.log(
        `[NotificationsScreen] Rendering game invite notification: ${item.id}`
      );
      const gameInviteMeta = item.gameInviteMeta;
      const inviteStatus = gameInviteMeta.status || "pending";
      const isProcessed = ["accepted", "decline", "in-progress"].includes(
        inviteStatus
      );

      return (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            isNew && {
              backgroundColor: colors.buttonBackgroundSecondary + "1A",
            },
          ]}
          onPress={onPressNotificationItem}
          disabled={isLoadingAction || isProcessed}
        >
          <UserAvatar
            imageUri={gameInviteMeta.initiatorAvatar || sender.avatar}
            size={45}
            style={styles.notificationAvatar}
          />
          <ThemedView style={styles.notificationContent}>
            <ThemedView style={styles.notificationMessageWrapper}>
              <ThemedText style={styles.notificationText}>
                <ThemedText style={styles.notificationUsername}>
                  {gameInviteMeta.initiatorUsername || sender.username}
                </ThemedText>{" "}
                invited you to play{" "}
                <ThemedText style={styles.notificationGameName}>
                  {gameInviteMeta.gameName || "a game"}
                </ThemedText>
                !
              </ThemedText>
              <ThemedText
                style={[
                  styles.notificationTimestamp,
                  { color: colors.textDim },
                ]}
              >
                {formatNotificationTimestamp(item.timestamp)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.notificationActions}>
              {isLoadingAction ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isProcessed ? (
                <ThemedText
                  style={[
                    styles.gameInviteStatusText,
                    {
                      color:
                        inviteStatus === "accepted" ||
                        inviteStatus === "in-progress"
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {inviteStatus === "accepted"
                    ? "Accepted"
                    : inviteStatus === "in-progress"
                    ? "Joined"
                    : "Declined"}
                </ThemedText>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.gameActionButton,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={() =>
                      handleGameInviteAction(
                        item.id,
                        item.relatedEntityId!,
                        "accept",
                        item.gameInviteMeta?.gameId!
                      )
                    }
                  >
                    <ThemedText
                      style={[
                        styles.gameActionButtonText,
                        { color: colors.buttonText },
                      ]}
                    >
                      Accept
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.gameActionButton,
                      { backgroundColor: colors.error, marginLeft: 8 },
                    ]}
                    onPress={() =>
                      handleGameInviteAction(
                        item.id,
                        item.relatedEntityId!,
                        "decline",
                        item.gameInviteMeta?.gameId!
                      )
                    }
                  >
                    <ThemedText
                      style={[
                        styles.gameActionButtonText,
                        { color: colors.buttonText },
                      ]}
                    >
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
          imageUri={sender.avatar}
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
                renderKnockActionButton(item)
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
          leftContent={<BackButton color={colors.text} />}
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
            {isProfilePrivate && (
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
                (!isProfilePrivate || privateKnockRequestsCount === 0) ? (
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
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  gameActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  gameActionButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  notificationGameName: {
    fontWeight: "bold",
    fontSize: 14,
  },
  gameInviteStatusText: {
    fontSize: 12,
    fontWeight: "bold",
    minWidth: 60,
    textAlign: "center",
  },
});
