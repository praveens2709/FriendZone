import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import NotificationService, {
  NotificationResponse,
} from "@/services/NotificationService";
import { useSocket } from "@/context/SocketContext";
import {
  formatNotificationDateGroup,
  formatNotificationTimestamp,
} from "@/constants/Functions";
import UserAvatar from "@/components/UserAvatar";
import KnockService, { KnockRequest } from "@/services/knockService";
import { useAuth } from "@/context/AuthContext";

type KnockNotification = NotificationResponse & {
  type: "knock";
  user: { id: string; username: string; avatar: string };
  knockStatus?: "pending" | "lockedIn";
  content: string;
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
  const [unreadCount, setUnreadCount] = useState(0);

  const [pendingKnockRequestsData, setPendingKnockRequestsData] = useState<
    KnockRequest[]
  >([]);
  const privateKnockRequestsCount = pendingKnockRequestsData.length;

  const fetchNotifications = useCallback(
    async (pageNum: number, isRefreshing: boolean = false) => {
      if (!accessToken) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefreshing) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      try {
        const notificationResponse =
          await NotificationService.getUserNotifications(accessToken, pageNum);

        setNotifications((prev) => {
          if (pageNum === 1) {
            return notificationResponse.notifications;
          }
          const newNotifications = notificationResponse.notifications.filter(
            (newNotif) =>
              !prev.some((existingNotif) => existingNotif.id === newNotif.id)
          );
          return [...prev, ...newNotifications];
        });
        setTotalPages(notificationResponse.totalPages);
        setHasMore(pageNum < notificationResponse.totalPages);

        if (pageNum === 1) {
          const initialUnread = notificationResponse.notifications.filter(
            (n) => !n.isRead
          ).length;
          setUnreadCount(initialUnread);
        }

        if (user?.isPrivate) {
          const requests = await KnockService.getKnockers(accessToken);
          setPendingKnockRequestsData(requests);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load notifications.");
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, user?.isPrivate]
  );

  useEffect(() => {
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      setPage((prevPage) => prevPage + 1);
      fetchNotifications(page + 1);
    }
  };

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!accessToken) {
        return;
      }
      try {
        await NotificationService.markNotificationAsRead(
          notificationId,
          accessToken
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error(
          `Failed to mark notification ${notificationId} as read:`,
          error
        );
      }
    },
    [accessToken]
  );

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.isRead).length);
  }, [notifications]);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification: NotificationResponse) => {
        setNotifications((prev) => {
          if (!prev.some((n) => n.id === newNotification.id)) {
            return [newNotification, ...prev];
          }
          return prev;
        });

        if (
          newNotification.type === "knock" &&
          user?.isPrivate &&
          (newNotification as KnockNotification).knockStatus === "pending"
        ) {
          if (accessToken) {
            KnockService.getKnockers(accessToken)
              .then(setPendingKnockRequestsData)
              .catch(console.error);
          }
        }
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket, user?.isPrivate, accessToken]);

  const knockRequestDisplay = useMemo(() => {
    const count = privateKnockRequestsCount;
    let avatar1Uri: string | null = null;
    let avatar2Uri: string | null = null;
    let message = "No new knocks yet.";

    const pendingKnocksForAvatars = pendingKnockRequestsData;

    if (count === 1) {
      avatar1Uri = pendingKnocksForAvatars[0]?.user?.avatar || null;
      message = "1 new knock";
    } else if (count > 1) {
      avatar1Uri = pendingKnocksForAvatars[0]?.user?.avatar || null;
      avatar2Uri = pendingKnocksForAvatars[1]?.user?.avatar || null;
      message = `${count} new knocks`;
    }
    return { count, avatar1Uri, avatar2Uri, message };
  }, [privateKnockRequestsCount, pendingKnockRequestsData]);

  const groupedNotifications = useMemo(() => {
    const filteredNotifications = notifications.filter(
      (notif) =>
        !(
          notif.type === "knock" &&
          (notif as KnockNotification).knockStatus === "pending"
        )
    );

    const groups = filteredNotifications.reduce((acc, notif) => {
      const group = formatNotificationDateGroup(notif.timestamp);
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(notif);
      return acc;
    }, {} as Record<string, NotificationResponse[]>);
    return groups;
  }, [notifications]);

  const sortedGroups = useMemo(() => {
    const defaultOrder = [
      "Today",
      "Yesterday",
      "Last 7 Days",
      "Last 30 Days",
      "Older",
    ];
    let sorted = defaultOrder.filter(
      (group) =>
        groupedNotifications[group] && groupedNotifications[group].length > 0
    );
    if (
      groupedNotifications["Invalid Date"] &&
      groupedNotifications["Invalid Date"].length > 0
    ) {
      sorted.push("Invalid Date");
    }
    return sorted;
  }, [groupedNotifications]);

  const handleKnockBack = async (notificationId: string, knockId: string) => {
    if (!accessToken) {
      Alert.alert("Error", "Authentication token not found.");
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, metadata: { ...n.metadata, knockBackState: 'knocking' } }
          : n
      )
    );

    try {
      await KnockService.knockBack(knockId, accessToken);
      Alert.alert("Success", "You knocked them back! You are now LockedIn!");
      onRefresh();
    } catch (error: any) {
      console.error("Error knocking back:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to knock back."
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, knockBackState: 'failed' } }
            : n
        )
      )
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationResponse }) => {
    let message: React.ReactNode = null;
    let avatarUrl = "";
    let isNew = !item.isRead;

    const sender = item.user;

    if (!sender) {
      return null;
    }

    avatarUrl = sender.avatar;

    const isCurrentUserAction = user && sender.id === user._id;

    const isKnockNotificationRelevantForButton =
      item.type === "activity" && item.relatedEntityType === "Knock" &&
      (item.content?.includes("knocked on you.") || item.content?.includes("accepted your knock request."));

    const showKnockBackButton = isKnockNotificationRelevantForButton;

    const localKnockBackState = item.metadata?.knockBackState || 'initial';
    const isKnocking = localKnockBackState === 'knocking';
    const isKnockedByBackend = item.knockStatus === 'lockedIn';
    
    const buttonText = isKnocking ? "Knocking..." : isKnockedByBackend ? "Knocked" : "Knock Back";
    const isDisabled = isKnocking || isKnockedByBackend;
    const buttonBackgroundColor = isDisabled ? colors.primary + '50' : colors.primary;


    if (
      item.type === "knock_accepted" ||
      item.type === "activity" ||
      item.type === "message"
    ) {
      message = (
        <ThemedText style={styles.notificationText} numberOfLines={2} ellipsizeMode="tail">
          {!isCurrentUserAction && (
            <>
              <ThemedText style={styles.notificationUsername}>
                {sender.username}
              </ThemedText>{" "}
            </>
          )}
          <ThemedText style={styles.notificationText}>
            {item.content}
          </ThemedText>
        </ThemedText>
      );
    } else {
      return null;
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isNew && { backgroundColor: colors.buttonBackgroundSecondary + "1A" },
        ]}
        onPress={() => {
          if (!showKnockBackButton || isDisabled) {
            markNotificationAsRead(item.id);
            if (item.type === "message" && item.relatedEntityId) {
              router.push({
                pathname: `/(chat)/${item.relatedEntityId}`,
                params: {
                  chatName: item.user?.username || "Chat",
                  chatAvatar: item.user?.avatar || undefined,
                },
              });
            }
          }
        }}
      >
        <UserAvatar
          imageUri={avatarUrl}
          size={45}
          style={[styles.notificationAvatar, { borderColor: colors.border }]}
        />
        <View style={styles.notificationContent}>
          <View style={styles.notificationMessageWrapper}>
            {message}
            <ThemedText
              style={[styles.notificationTimestamp, { color: colors.textDim }]}
            >
              {formatNotificationTimestamp(item.timestamp)}
            </ThemedText>
          </View>
          {showKnockBackButton && (
            <TouchableOpacity
              style={[
                styles.knockBackButton,
                { backgroundColor: buttonBackgroundColor },
              ]}
              onPress={() => item.relatedEntityId && handleKnockBack(item.id, item.relatedEntityId)}
              disabled={isDisabled}
            >
              <ThemedText style={[styles.knockButtonText, {color: colors.buttonText}]}>
                {buttonText}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton />}
          title="Notifications"
          showBottomBorder={true}
        />

        {loading && page === 1 && !refreshing ? (
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={{ color: colors.textDim, marginTop: 10 }}>
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
                onPress={() => {
                  router.push("/(notifications)/requests");
                }}
              >
                <View
                  style={[
                    styles.friendRequestAvatars,
                    knockRequestDisplay.count === 0 &&
                      styles.noRequestsAvatarWrapper,
                    knockRequestDisplay.count === 1 &&
                      styles.singleAvatarWrapper,
                    knockRequestDisplay.count >= 2 && styles.multiAvatarMargin,
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
                      {knockRequestDisplay.avatar2Uri ? (
                        <UserAvatar
                          imageUri={knockRequestDisplay.avatar2Uri}
                          size={40}
                          style={styles.friendRequestAvatar2}
                        />
                      ) : null}
                    </>
                  ) : (
                    <UserAvatar
                      imageUri={null}
                      size={40}
                      style={styles.noRequestsUserAvatar}
                    />
                  )}
                </View>
                <View style={styles.friendRequestTextContent}>
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
                </View>
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
              renderItem={({ item: groupName }) => (
                <View>
                  <ThemedText
                    style={[styles.sectionHeader, { color: colors.text }]}
                  >
                    {groupName}
                  </ThemedText>
                  {groupedNotifications[groupName]?.map((notificationItem) => (
                    <View key={notificationItem.id}>
                      {renderNotificationItem({ item: notificationItem })}
                    </View>
                  ))}
                </View>
              )}
              contentContainerStyle={styles.notificationListContent}
              ListEmptyComponent={() => {
                const hasNoGeneralNotifications =
                  Object.keys(groupedNotifications).length === 0;
                if (
                  hasNoGeneralNotifications &&
                  (!user?.isPrivate || privateKnockRequestsCount === 0)
                ) {
                  return (
                    <ThemedView style={styles.emptyListContainer}>
                      <ThemedText
                        style={{
                          fontSize: 16,
                          textAlign: "center",
                          color: colors.textDim,
                        }}
                      >
                        No notifications yet.
                      </ThemedText>
                    </ThemedView>
                  );
                }
                return null;
              }}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              ListFooterComponent={() =>
                hasMore && !loading && !refreshing ? (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <ThemedText style={{ color: colors.textDim, marginTop: 5 }}>
                      Loading more...
                    </ThemedText>
                  </View>
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
    backgroundColor: "transparent",
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationMessageWrapper: {
    flex: 1,
    marginRight: 10,
  },
  notificationMessageAndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
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
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  knockButtonText: {
    fontWeight: "bold",
    fontSize: 12,
  },
});