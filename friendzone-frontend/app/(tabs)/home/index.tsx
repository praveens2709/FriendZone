import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ViewToken,
  Platform,
  RefreshControl,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Redirect, useRouter } from "expo-router";
import { Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import VibeStrip from "@/components/VibeStrip";
import StoryRingList from "@/components/StoryRingList";
import { ThemedText } from "@/components/ThemedText";
import ChatService, { ChatPreviewResponse } from "@/services/ChatService";
import NotificationService from "@/services/NotificationService";
import { ThemedView } from "@/components/ThemedView";
import PostComponent from "@/components/PostComponent";
import PostService from "@/services/PostService";
import { Post } from "@/types/post.type";
import { useFocusEffect } from "@react-navigation/native";
import StreakEndedModal from "@/components/modals/StreakEndedModal";
import WordleGameModal from "@/components/modals/WordleGameModal";
import UploadProgressBar from "@/components/UploadProgressBar";
import EmptyState from "@/components/EmptyState";
import { PostSkeleton } from "@/components/Skeleton";
import { useUploadStore } from "@/store/uploadStore";

interface ViewableItem extends ViewToken {
  item: Post;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { space: tabSpace } = useTabBarSpace();
  const { isAuthenticated, authLoading, user, accessToken } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isGloballyMuted, setIsGloballyMuted] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );

  const [showWordleGame, setShowWordleGame] = useState(false);
  const uploadsDone = useUploadStore((state) => state.doneCount);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewableItem[] }) => {
      if (isGloballyMuted) {
        setCurrentlyPlayingId(null);
        return;
      }
      const firstVisibleItem = viewableItems[0]?.item;
      if (firstVisibleItem && firstVisibleItem.song) {
        setCurrentlyPlayingId(firstVisibleItem._id);
      } else {
        setCurrentlyPlayingId(null);
      }
    },
    [isGloballyMuted]
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsGloballyMuted(true);
        setCurrentlyPlayingId(null);
      };
    }, [])
  );

  const totalUnreadChats = unreadChatIds.size;

  const FEED_PAGE_SIZE = 12;
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      try {
        if (!silent) setPostsLoading(true);
        const fetchedPosts = await PostService.getFeedPosts(accessToken, 1, FEED_PAGE_SIZE);
        pageRef.current = 1;
        setPosts(fetchedPosts);
        setHasMorePosts(fetchedPosts.length >= FEED_PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setPostsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  const loadMorePosts = useCallback(async () => {
    if (!accessToken || !hasMorePosts || loadingMoreRef.current || postsLoading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const more = await PostService.getFeedPosts(accessToken, next, FEED_PAGE_SIZE);
      pageRef.current = next;
      setPosts((current) => {
        const seen = new Set(current.map((p) => p._id));
        return [...current, ...more.filter((p) => !seen.has(p._id))];
      });
      setHasMorePosts(more.length >= FEED_PAGE_SIZE);
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [accessToken, hasMorePosts, postsLoading]);

  useEffect(() => {
    if (uploadsDone > 0) fetchPosts(true);
  }, [uploadsDone, fetchPosts]);

  const firstFocusRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      fetchPosts(true);
    }, [fetchPosts])
  );

  const fetchInitialUnreadChats = useCallback(async () => {
    if (!accessToken) return;

    try {
      const chatIds = await ChatService.getUnreadChatIds();
      setUnreadChatIds(new Set(chatIds));
    } catch (err) {
      console.error("Error fetching initial unread chats:", err);
    }
  }, [accessToken]);

  const fetchInitialUnreadNotificationCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await NotificationService.getUnreadNotificationCount(
        accessToken
      );
      setHasUnreadNotifications(res.count > 0);
    } catch (err) {
      console.error("Error fetching initial unread notification count:", err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialUnreadChats();
      fetchInitialUnreadNotificationCount();
      fetchPosts();
    }
  }, [
    isAuthenticated,
    fetchInitialUnreadChats,
    fetchInitialUnreadNotificationCount,
    fetchPosts,
  ]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("setUserId", user._id);

    const handleChatPreviewUpdate = (chatPreview: ChatPreviewResponse) => {
      setUnreadChatIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (chatPreview.unreadCount > 0) {
          newIds.add(chatPreview.id);
        } else {
          newIds.delete(chatPreview.id);
        }
        return newIds;
      });
    };

    const handleUnreadNotificationCountUpdate = ({
      count,
    }: {
      count: number;
    }) => {
      setHasUnreadNotifications(count > 0);
    };

    const handleNewPost = (newPost: Post) => {
      setPosts((prevPosts) =>
        prevPosts.some((p) => p._id === newPost._id) ? prevPosts : [newPost, ...prevPosts]
      );
    };
    const handlePostRemoved = ({ postId }: { postId: string }) => {
      setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));
    };
    const handlePostRestored = () => fetchPosts(true);
    const handleBlockChanged = ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      if (blocked) setPosts((prevPosts) => prevPosts.filter((p) => p.user?._id !== userId));
      else fetchPosts(true);
    };
    const handleProfileUpdated = (data: {
      userId: string;
      firstName: string;
      lastName: string;
      profileImage: string | null;
    }) => {
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.user?._id === data.userId
            ? {
                ...p,
                user: {
                  ...p.user,
                  firstName: data.firstName,
                  lastName: data.lastName,
                  profileImage: data.profileImage || "",
                },
              }
            : p
        )
      );
    };

    socket.on("chatPreviewUpdate", handleChatPreviewUpdate);
    socket.on(
      "unreadNotificationCountUpdate",
      handleUnreadNotificationCountUpdate
    );
    socket.on("newPost", handleNewPost);
    socket.on("postRemoved", handlePostRemoved);
    socket.on("postRestored", handlePostRestored);
    socket.on("blockChanged", handleBlockChanged);
    socket.on("userProfileUpdated", handleProfileUpdated);
    const handleKnockChange = () => fetchPosts(true);
    socket.on("knockStatusChanged", handleKnockChange);

    return () => {
      socket.off("chatPreviewUpdate", handleChatPreviewUpdate);
      socket.off(
        "unreadNotificationCountUpdate",
        handleUnreadNotificationCountUpdate
      );
      socket.off("newPost", handleNewPost);
      socket.off("postRemoved", handlePostRemoved);
      socket.off("postRestored", handlePostRestored);
      socket.off("blockChanged", handleBlockChanged);
      socket.off("userProfileUpdated", handleProfileUpdated);
      socket.off("knockStatusChanged", handleKnockChange);
    };
  }, [socket, user, fetchPosts]);

  if (authLoading)
    return (
      <ActivityIndicator
        style={styles.activityIndicator}
        color={colors.primary}
        size="large"
      />
    );

  if (!isAuthenticated) return <Redirect href="/(auth)/AuthChoice" />;

  return (
    <ScreenBackground style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.container} edges={["top", "left", "right"]}>
        <CommonHeader
          leftContent={<ThemedText style={styles.title}>FriendZone</ThemedText>}
          rightContent1={
            <TouchableOpacity
              onPress={() => router.push("/(notifications)")}
              style={styles.notificationIconContainer}
            >
              <SimpleLineIcons name="heart" size={24} color={colors.text} />
              {hasUnreadNotifications && (
                <ThemedView
                  style={[styles.notificationDot, { backgroundColor: "red" }]}
                />
              )}
            </TouchableOpacity>
          }
          rightContent2={
            <TouchableOpacity
              onPress={() => router.push("/(chat)")}
              style={styles.chatIconContainer}
            >
              <Ionicons
                name="chatbubble-outline"
                size={25}
                color={colors.text}
              />
              {totalUnreadChats > 0 && (
                <ThemedView style={[styles.badge, { backgroundColor: "red" }]}>
                  <ThemedText style={[styles.badgeText, { color: "#fff" }]}>
                    {totalUnreadChats > 99 ? "99+" : totalUnreadChats}
                  </ThemedText>
                </ThemedView>
              )}
            </TouchableOpacity>
          }
        />
        <UploadProgressBar />
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostComponent
              post={item}
              currentlyPlayingId={currentlyPlayingId}
              setCurrentlyPlayingId={setCurrentlyPlayingId}
              isActive={currentlyPlayingId === item._id}
              isGloballyMuted={isGloballyMuted}
              setIsGloballyMuted={setIsGloballyMuted}
            />
          )}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPosts(true);
              }}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null
          }
          ListHeaderComponent={
            <ThemedView>
              <StoryRingList />
              <VibeStrip />
            </ThemedView>
          }
          ListEmptyComponent={
            postsLoading ? (
              <ThemedView>
                <PostSkeleton />
                <PostSkeleton />
              </ThemedView>
            ) : (
              <EmptyState
                icon="people-outline"
                art="party"
                title="Your feed is quiet"
                message="Posts from the people you've locked in with show up here."
                actionLabel="Find your people"
                onAction={() => router.push("/(tabs)/circle")}
              />
            )
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          contentContainerStyle={[styles.postListContainer, { paddingBottom: tabSpace - 10 }]}
        />
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  postListContainer: {
    paddingTop: 4,
  },
  emptyFeed: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 8,
  },
  emptyFeedTitle: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  emptyFeedText: { textAlign: "center", lineHeight: 20 },
  emptyFeedButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  activityIndicator: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  chatIconContainer: {
    position: "relative",
    width: 25,
    height: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 18,
  },
  notificationIconContainer: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
