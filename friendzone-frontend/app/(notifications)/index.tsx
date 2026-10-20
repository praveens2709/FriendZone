import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
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
import MeetingService from "@/services/MeetingService";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatNotificationDateGroup,
  formatNotificationTimestamp,
} from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";

type EnrichedNotificationItem = NotificationResponse & {
  knockStatus?: "pending" | "lockedIn" | "onesidedlock" | "declined" | null;
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
    async (
      pageNum: number,
      isRefreshing = false,
      showLoading = true
    ) => {
      console.log(
        `[NotificationsScreen] Fetching notifications: page ${pageNum}, isRefreshing: ${isRefreshing}, showLoading: ${showLoading}`
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
      } else if (pageNum === 1 && showLoading) {
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

        const enrichedNotifications = await Promise.all(
          res.notifications.map(async (n) => {
            let hasMutualKnockRequest = false;

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
          `[NotificationsScreen] Total pages: ${res.totalPages}, Has more: ${pageNum < res.totalPages
          }`
        );
      } catch (error) {
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
      fetchNotifications(1, false, false);
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
        hasMutualKnockRequest: false,
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

      fetchPendingKnockRequests();
    };

    const handleUserProfileUpdated = () => {
      console.log(
        "[NotificationsScreen] Received userProfileUpdated. Re-fetching profile and knock requests."
      );
      fetchPendingKnockRequests();
    };

    const handleMeetingInviteStatusUpdated = (data: { meetingId: string; status: "pending" | "accepted" | "declined" }) => {
      setNotifications((prev) =>
        prev.map((n) => {
          const nMeetingId = n.metadata?.meetingId || n.relatedEntityId;
          if (nMeetingId === data.meetingId) {
            return {
              ...n,
              metadata: {
                ...n.metadata,
                status: data.status,
              },
            } as EnrichedNotificationItem;
          }
          return n;
        })
      );
    };

    const handleMeetingNotificationsRemoved = ({ meetingId }: { meetingId: string }) => {
      setNotifications((prev) =>
        prev.filter(
          (n) => (n.metadata?.meetingId || n.relatedEntityId) !== meetingId
        )
      );
    };

    const handlePostNotificationsRemoved = ({
      postId,
      senderId,
      type,
    }: {
      postId: string;
      senderId: string | null;
      type: string | null;
    }) => {
      setNotifications((prev) =>
        prev.filter(
          (n) =>
            !(
              n.relatedEntityType === "Post" &&
              n.relatedEntityId === postId &&
              (!senderId || n.user?.id === senderId) &&
              (!type || n.type === type)
            )
        )
      );
    };

    socket.on("postNotificationsRemoved", handlePostNotificationsRemoved);
    socket.on("meetingNotificationsRemoved", handleMeetingNotificationsRemoved);
    socket.on("newNotification", handleNewNotification);
    socket.on("newKnockRequest", handleNewKnockRequest);
    socket.on("knockRequestRemoved", handleKnockRequestRemoved);
    socket.on("knockStatusUpdated", handleKnockStatusUpdated);
    socket.on("userProfileUpdated", handleUserProfileUpdated);
    socket.on("meetingInviteStatusUpdated", handleMeetingInviteStatusUpdated);

    console.log("[NotificationsScreen] All socket listeners set up.");

    return () => {
      console.log("[NotificationsScreen] Cleaning up socket listeners.");
      socket.off("postNotificationsRemoved", handlePostNotificationsRemoved);
      socket.off("meetingNotificationsRemoved", handleMeetingNotificationsRemoved);
      socket.off("newNotification", handleNewNotification);
      socket.off("newKnockRequest", handleNewKnockRequest);
      socket.off("knockRequestRemoved", handleKnockRequestRemoved);
      socket.off("knockStatusUpdated", handleKnockStatusUpdated);
      socket.off("userProfileUpdated", handleUserProfileUpdated);
      socket.off("meetingInviteStatusUpdated", handleMeetingInviteStatusUpdated);
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
      console.error("[NotificationsScreen] Error knocking back:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMeetingResponse = async (
    notificationId: string,
    meetingId: string,
    response: "accepted" | "declined"
  ) => {
    if (!accessToken) {
      console.log("Error", "Authentication required.");
      return;
    }

    setActionLoadingId(notificationId);

    try {
      await MeetingService.respondToInvitation(meetingId, response, accessToken);

      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === notificationId) {
            return {
              ...n,
              metadata: {
                ...n.metadata,
                status: response,
              },
            };
          }
          return n;
        })
      );

      console.log(`Meeting invite ${response}`);
    } catch (error: any) {
      console.error("Error responding to meeting invite:", error);
    } finally {
      setActionLoadingId(null);
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

  const renderMeetingActionButtons = (item: EnrichedNotificationItem) => {
    const meetingId = item.metadata?.meetingId || item.relatedEntityId;
    const inviteStatus = item.metadata?.status;
    const isLoading = actionLoadingId === item.id;

    if (!meetingId) return null;

    if (inviteStatus === 'accepted') {
      return (
        <TouchableOpacity
          style={[
            styles.knockBackButton,
            { backgroundColor: colors.primary + "30", borderWidth: 1, borderColor: colors.primary },
          ]}
          disabled={true}
        >
          <ThemedText style={[styles.knockButtonText, { color: colors.primary }]}>
            Accepted
          </ThemedText>
        </TouchableOpacity>
      );
    }

    if (inviteStatus === 'declined') {
      return (
        <TouchableOpacity
          style={[
            styles.knockBackButton,
            { backgroundColor: colors.buttonBackgroundSecondary, borderWidth: 1, borderColor: colors.border },
          ]}
          disabled={true}
        >
          <ThemedText style={[styles.knockButtonText, { color: colors.textDim }]}>
            Declined
          </ThemedText>
        </TouchableOpacity>
      );
    }

    return (
      <ThemedView style={styles.meetingActionButtons}>
        <TouchableOpacity
          style={[
            styles.meetingDeclineButton,
            { borderColor: colors.border },
          ]}
          onPress={() => handleMeetingResponse(item.id, meetingId, 'declined')}
          disabled={isLoading}
        >
          <ThemedText style={[styles.knockButtonText, { color: colors.textDim }]}>
            Decline
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.meetingAcceptButton,
            { backgroundColor: isLoading ? colors.primary + "50" : colors.primary },
          ]}
          onPress={() => handleMeetingResponse(item.id, meetingId, 'accepted')}
          disabled={isLoading}
        >
          <ThemedText style={[styles.knockButtonText, { color: colors.buttonText }]}>
            {isLoading ? "..." : "Accept"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
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
      markNotificationAsRead(item.id);

      if (item.type === "message" && item.relatedEntityId) {
        router.push({
          pathname: "/(chat)/[id]",
          params: {
            id: item.relatedEntityId,
            chatName: sender.username,
            chatAvatar: sender.avatar || "",
          },
        });
        return;
      }

      if (item.type === "meeting_invite" || item.relatedEntityType === "Meeting") {
        const meetingId = item.metadata?.meetingId || item.relatedEntityId;
        if (meetingId) router.push(`/plan/${meetingId}`);
        return;
      }

      if (item.relatedEntityType === "Post" && item.relatedEntityId) {
        router.push({ pathname: "/posts/[postId]", params: { postId: item.relatedEntityId } });
        return;
      }

      if (sender.id && sender.id !== user?._id) {
        router.push({ pathname: "/profile/UserProfile", params: { userId: sender.id } });
      }
    };

    const isLoadingAction = actionLoadingId === item.id;

    const isKnockNotif =
      item.type === "activity" &&
      item.relatedEntityType === "Knock" &&
      (item.content?.includes("knocked on you.") ||
        item.content?.includes("accepted your knock request."));

    const isMeetingInvite = item.type === "meeting_invite";

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: isNew ? colors.primary : colors.border,
          },
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
          {isMeetingInvite && (
            <ThemedView style={styles.notificationActions}>
              {isLoadingAction ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                renderMeetingActionButtons(item)
              )}
            </ThemedView>
          )}
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenBackground style={styles.gradientContainer}>
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
    </ScreenBackground>
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
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
  meetingActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  meetingDeclineButton: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  meetingAcceptButton: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 20,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
});
