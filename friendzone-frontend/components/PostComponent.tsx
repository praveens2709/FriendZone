import { useConfirm } from "@/components/ConfirmProvider";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";
import { renderSheetBackdrop } from "@/components/ui/SheetBackdrop";
import SafetyService, { ReportReason } from "@/services/SafetyService";
import PostService from "@/services/PostService";
import VibeTag from "@/components/VibeTag";
import { useSavedPosts } from "@/context/SavedPostsContext";
import {
  Entypo,
  Feather,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { tapFeedback } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { MotiView } from "moti";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { Post, Comment } from "@/types/post.type";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  formatPostTimestamp,
  formatCommentTimestamp,
} from "@/constants/Functions";
import { User } from "@/types/user.type";
import SharePostSheet from "@/components/SharePostSheet";
import UserAvatar from "./UserAvatar";

const { width, height } = Dimensions.get("window");

interface PostComponentProps {
  post: Post;
  currentlyPlayingId: string | null;
  setCurrentlyPlayingId: (id: string | null) => void;
  isActive: boolean;
  isGloballyMuted: boolean;
  setIsGloballyMuted: (isMuted: boolean) => void;
  onRemoved?: (postId: string) => void;
}

const CommentInput = React.memo(
  ({
    user,
    colors,
    commentText,
    setCommentText,
    handleCommentSubmit,
    isCommentSending,
  }: {
    user: User | null;
    colors: any;
    commentText: string;
    setCommentText: (text: string) => void;
    handleCommentSubmit: () => void;
    isCommentSending: boolean;
  }) => (
    <ThemedView
      style={[styles.commentInputContainer, { borderTopColor: colors.border }]}
    >
      <UserAvatar
        imageUri={user?.profileImage}
        size={32}
        style={styles.currentUserImage}
      />
      <BottomSheetTextInput
        style={[
          styles.commentInput,
          {
            backgroundColor: colors.backgroundSecondary,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        placeholder="Add a comment..."
        placeholderTextColor={colors.textDim}
        value={commentText}
        onChangeText={setCommentText}
      />
      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleCommentSubmit}
        disabled={isCommentSending}
      >
        {isCommentSending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="send" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    </ThemedView>
  )
);

import { emitPostRemoved } from "@/utils/postEvents";
import PostImageCarousel from "@/components/PostImageCarousel";

const PostComponent = ({
  post,
  currentlyPlayingId,
  setCurrentlyPlayingId,
  isActive,
  isGloballyMuted,
  setIsGloballyMuted,
  onRemoved,
}: PostComponentProps) => {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { user, accessToken } = useAuth();
  const router = useRouter();

  const safeLikes = Array.isArray(post.likes) ? post.likes : [];
  const safeSaves = Array.isArray(post.saves) ? post.saves : [];
  const safeComments = Array.isArray(post.comments) ? post.comments : [];

  const { isPostSaved, toggleSave } = useSavedPosts();
  const isSaved = isPostSaved(post._id);
  const [isLiked, setIsLiked] = useState(safeLikes.includes(user?._id || ""));
  const [postLikesCount, setPostLikesCount] = useState(safeLikes.length);
  const [localComments, setLocalComments] = useState<Comment[]>(safeComments);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNewComment = ({ postId, comment }: { postId: string; comment: Comment }) => {
      if (postId !== post._id) return;
      setLocalComments((prev) =>
        prev.some((existing) => existing._id === comment._id) ? prev : [comment, ...prev]
      );
    };
    const handleLikeUpdated = ({
      postId,
      userId,
      liked,
      likesCount,
    }: {
      postId: string;
      userId: string;
      liked: boolean;
      likesCount: number;
    }) => {
      if (postId !== post._id) return;
      setPostLikesCount(likesCount);
      if (userId === user?._id) setIsLiked(liked);
    };
    const handlePostRemoved = ({ postId }: { postId: string }) => {
      if (postId === post._id) setRemoved(true);
    };
    socket.on("newComment", handleNewComment);
    socket.on("postLikeUpdated", handleLikeUpdated);
    socket.on("postRemoved", handlePostRemoved);
    return () => {
      socket.off("newComment", handleNewComment);
      socket.off("postLikeUpdated", handleLikeUpdated);
      socket.off("postRemoved", handlePostRemoved);
    };
  }, [socket, post._id, user?._id]);
  const [commentCount, setCommentCount] = useState(safeComments.length);
  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);

  const [showFullCaption, setShowFullCaption] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const lastTap = useRef<number | null>(null);
  const animationInterval = useRef<NodeJS.Timeout | number | null>(null);

  const isPlayingThisPost = currentlyPlayingId === post._id && !isGloballyMuted;
  const isMuted = isGloballyMuted;

  const slideAnimation = useSharedValue(0);

  const commentsModalRef = useRef<BottomSheetModal>(null);
  const optionsModalRef = useRef<BottomSheetModal>(null);
  const [removed, setRemoved] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const shareModalRef = useRef<BottomSheetModal>(null);

  const snapPointsComments = useMemo(() => [height * 0.55], []);
  const snapPointsOptions = useMemo(() => [height * 0.46], []);
  
  const hasMultipleInfo = !!post.song && !!post.location;

  const handlePresentShareModal = useCallback(() => {
    shareModalRef.current?.present();
  }, []);

  useEffect(() => {
    if (hasMultipleInfo) {
      animationInterval.current = setInterval(() => {
        slideAnimation.value = withTiming(slideAnimation.value === 0 ? 1 : 0, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        });
      }, 3000);
    } else {
      if (animationInterval.current) {
        clearInterval(animationInterval.current as number);
      }
    }
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current as number);
      }
    };
  }, [hasMultipleInfo]);

  useEffect(() => {
    let cancelled = false;

    const release = async () => {
      const current = soundRef.current;
      soundRef.current = null;
      if (!current) return;
      try {
        await current.unloadAsync();
      } catch {}
    };

    const playSound = async () => {
      if (!post.song) return;
      await release();
      if (cancelled) return;
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: post.song.previewUrl },
          { shouldPlay: true, isLooping: true }
        );
        if (cancelled) {
          try {
            await sound.unloadAsync();
          } catch {}
          return;
        }
        soundRef.current = sound;
      } catch {}
    };

    if (isActive && isPlayingThisPost) {
      playSound();
    } else {
      release();
    }

    return () => {
      cancelled = true;
      release();
    };
  }, [isActive, isPlayingThisPost, post.song]);

  const slideStyleLocation = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1 - slideAnimation.value, { duration: 500 }),
      transform: [
        {
          translateY: withTiming(slideAnimation.value * -20, { duration: 500 }),
        },
      ],
    };
  });

  const slideStyleSong = useAnimatedStyle(() => {
    return {
      opacity: withTiming(slideAnimation.value, { duration: 500 }),
      transform: [
        {
          translateY: withTiming((1 - slideAnimation.value) * 20, {
            duration: 500,
          }),
        },
      ],
    };
  });

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const handleDoublePress = useCallback(() => {
    const now = Date.now();
    const isDoublePress = lastTap.current && now - lastTap.current < 300;

    if (isDoublePress) {
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSpring(1, { damping: 10, stiffness: 220 });
      heartOpacity.value = withDelay(450, withTiming(0, { duration: 250 }));
      if (!isLiked) {
        handleLikePress();
      }
      lastTap.current = null;
    } else {
      lastTap.current = now;
    }
  }, [isLiked]);

  const toggleSound = useCallback(async () => {
    if (!post.song) return;
    if (isGloballyMuted) {
      setIsGloballyMuted(false);
      setCurrentlyPlayingId(post._id);
    } else {
      setIsGloballyMuted(true);
      setCurrentlyPlayingId(null);
    }
  }, [isGloballyMuted, post._id, setCurrentlyPlayingId, setIsGloballyMuted]);

  const handlePresentCommentsModal = useCallback(() => {
    commentsModalRef.current?.present();
  }, []);

  const handlePresentOptionsModal = useCallback(() => {
    optionsModalRef.current?.present();
  }, []);

  const handleLikePress = useCallback(async () => {
    if (!accessToken) return;
    tapFeedback();
    try {
      const response = await PostService.toggleLike(post._id, accessToken);
      setIsLiked(response.liked);
      setPostLikesCount(response.likesCount);
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  }, [isLiked, accessToken, post._id]);

  const handleSavePress = useCallback(async () => {
    if (!accessToken) return;
    try {
      await toggleSave(post._id);
      optionsModalRef.current?.dismiss();
    } catch (error) {
      console.error("Failed to toggle save:", error);
    }
  }, [isSaved, accessToken, post._id, toggleSave]);

  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || !accessToken) return;
    setIsCommentSending(true);

    try {
      const newComment = await PostService.addComment(
        post._id,
        commentText.trim(),
        accessToken
      );
      setLocalComments((prev) =>
        prev.some((existing) => existing._id === newComment._id) ? prev : [newComment, ...prev]
      );
      setCommentCount((prev) => prev + 1);
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsCommentSending(false);
    }
  }, [accessToken, post._id, commentText]);

  const renderComment = ({ item }: { item: Comment }) => (
    <ThemedView style={styles.commentRow}>
      <UserAvatar
        imageUri={item.user.profileImage}
        size={35}
        style={styles.commentUserImage}
      />
      <ThemedView style={styles.commentContent}>
        <ThemedView style={styles.commentHeader}>
          <ThemedText style={styles.commentUserName}>
            {item.user.firstName} {item.user.lastName}
          </ThemedText>
          <ThemedText style={[styles.commentTime, { color: colors.textDim }]}>
            {formatCommentTimestamp(item.createdAt)}
          </ThemedText>
        </ThemedView>
        <ThemedText style={styles.commentText}>{item.text}</ThemedText>
      </ThemedView>
    </ThemedView>
  );

  const handleArchivePost = async () => {
    optionsModalRef.current?.dismiss();
    setArchiving(true);
    try {
      await PostService.archivePost(post._id);
      emitPostRemoved(post._id);
      setRemoved(true);
      onRemoved?.(post._id);
    } catch {
      setArchiving(false);
    }
  };

  const handleDeletePost = () => {
    optionsModalRef.current?.dismiss();
    confirm({ title: "Delete this post?", message: "It moves to Recently deleted for 30 days, then it's gone for good.", confirmLabel: "Delete", onConfirm: async () => {
          try {
            await PostService.deletePost(post._id);
            emitPostRemoved(post._id);
            setRemoved(true);
            onRemoved?.(post._id);
          } catch {
          }
        } });
  };

  const handleAboutAccount = () => {
    optionsModalRef.current?.dismiss();
    if (post.user._id !== user?._id) {
      router.push({ pathname: "/profile/UserProfile", params: { userId: post.user._id } });
    } else {
      router.push("/(tabs)/profile");
    }
  };

  const submitPostReport = (reason: ReportReason) => {
    if (!accessToken) return;
    SafetyService.report("post", post._id, reason, accessToken)
      .then(() => undefined)
      .catch(() => undefined);
  };

  const handleReportPost = () => {
    optionsModalRef.current?.dismiss();
    Alert.alert("Report this post", "Why are you reporting it?", [
      { text: "Spam", onPress: () => submitPostReport("spam") },
      { text: "Harassment", onPress: () => submitPostReport("harassment") },
      { text: "Inappropriate content", onPress: () => submitPostReport("nudity") },
      { text: "Other", onPress: () => submitPostReport("other") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleBlockAuthor = () => {
    optionsModalRef.current?.dismiss();
    confirm({ title: `Block ${post.user.firstName}?`, message: "They won't be able to find you, message you or see your posts, and any knocks between you will be removed.", confirmLabel: "Block", onConfirm: async () => {
            if (!accessToken) return;
            try {
              await SafetyService.blockUser(post.user._id, accessToken);
              emitPostRemoved(post._id);
              setRemoved(true);
              onRemoved?.(post._id);
            } catch {
              return;
            }
          } });
  };

  if (!post.user || removed) return null;

  const friendNames = post.likedByNames ?? [];
  const likedNames = [...(isLiked ? ["you"] : []), ...friendNames].slice(0, 2);
  const otherLikes = Math.max(postLikesCount - likedNames.length, 0);
  const likedByText =
    likedNames.length === 0
      ? ""
      : `Liked by ${likedNames.join(", ")}${otherLikes > 0 ? ` and ${otherLikes} ${otherLikes === 1 ? "other" : "others"}` : ""}`;

  const captionContent = typeof post.caption === "string" ? post.caption : "";

  return (
    <ThemedView
      style={[
        styles.postContainer,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      {archiving && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.archivingOverlay,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <ThemedView style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfoContainer}
          onPress={() => {
            if (post.user._id !== user?._id) {
              router.push({
                pathname: "/profile/UserProfile",
                params: { userId: post.user._id }
              });
            } else {
              router.push("/(tabs)/profile");
            }
          }}
        >
          <UserAvatar
            imageUri={post.user.profileImage}
            size={36}
          />
          <ThemedView style={styles.userInfoText}>
            <ThemedView style={styles.nameRow}>
              <ThemedText style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {post.user.firstName} {post.user.lastName}
              </ThemedText>
              {post.user.vibe && <VibeTag kind={post.user.vibe.kind} compact />}
            </ThemedView>
            {hasMultipleInfo ? (
              <ThemedView style={styles.slidingContainer}>
                <Animated.View style={[styles.slidingItem, slideStyleLocation]}>
                  <ThemedText
                    style={[styles.infoText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {post.location}
                  </ThemedText>
                </Animated.View>
                <Animated.View style={[styles.slidingItem, slideStyleSong]}>
                  <ThemedText
                    style={[styles.infoText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {post.song?.artistName} - {post.song?.trackName}
                  </ThemedText>
                </Animated.View>
              </ThemedView>
            ) : post.location ? (
              <ThemedText style={styles.infoText} numberOfLines={1}>
                {post.location}
              </ThemedText>
            ) : post.song ? (
              <ThemedText style={styles.infoText} numberOfLines={1}>
                {post.song.artistName} - {post.song.trackName}
              </ThemedText>
            ) : null}
          </ThemedView>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.threeDotsIcon}
          onPress={handlePresentOptionsModal}
        >
          <Entypo name="dots-three-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </ThemedView>
      <TouchableWithoutFeedback onPress={handleDoublePress}>
        <ThemedView style={styles.postImageContainer}>
          <PostImageCarousel images={post.images} />
          <Animated.View pointerEvents="none" style={[styles.heartBurst, heartStyle]}>
            <Ionicons name="heart" size={96} color="#F03E3E" />
          </Animated.View>
          {post.song && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 500 }}
              style={[
                styles.soundIconContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <TouchableOpacity onPress={toggleSound}>
                <MaterialCommunityIcons
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={20}
                  color={readableTextOn(colors.primary, colors.buttonText)}
                />
              </TouchableOpacity>
            </MotiView>
          )}
        </ThemedView>
      </TouchableWithoutFeedback>
      <ThemedView style={styles.postFooter}>
        <ThemedView style={styles.footerIconsLeft}>
          <TouchableOpacity
            onPress={handleLikePress}
            style={styles.iconAndCountContainer}
          >
            <FontAwesome
              name={isLiked ? "heart" : "heart-o"}
              size={28}
              color={isLiked ? colors.red : colors.text}
            />
            {postLikesCount > 0 && (
              <ThemedText style={styles.iconCountText}>
                {postLikesCount}
              </ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePresentCommentsModal}
            style={styles.iconAndCountContainer}
          >
            <MaterialCommunityIcons
              name="comment-outline"
              size={28}
              color={colors.text}
            />
            {commentCount > 0 && (
              <ThemedText style={styles.iconCountText}>
                {commentCount}
              </ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerIcon}
            onPress={handlePresentShareModal}
          >
            <Feather name="send" size={28} color={colors.text} />
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={styles.footerIconsRight}>
          <TouchableOpacity onPress={handleSavePress}>
            <MaterialCommunityIcons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={30}
              color={isSaved ? colors.text : colors.text}
            />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.postDetails}>
        {likedByText ? (
          <ThemedText style={[styles.likedByText, { color: colors.textDim }]} numberOfLines={2}>
            {likedByText}
          </ThemedText>
        ) : null}
        <ThemedView style={styles.captionRow}>
          <ThemedText style={styles.captionText}>
            <ThemedText style={styles.captionUserName}>
              {post.user.firstName} {post.user.lastName}
            </ThemedText>{" "}
            <ThemedText numberOfLines={showFullCaption ? undefined : 2}>
              {captionContent}
            </ThemedText>
            {!showFullCaption && captionContent.length > 30 && (
              <ThemedText
                style={{ color: colors.textSecondary }}
                onPress={() => setShowFullCaption(true)}
              >
                {" "}
                ...more
              </ThemedText>
            )}
          </ThemedText>
        </ThemedView>
        <ThemedText style={[styles.timeAgoText, { color: colors.textDim }]}>
          {formatPostTimestamp(post.createdAt)}
        </ThemedText>
      </ThemedView>
      <BottomSheetModal
        ref={commentsModalRef}
        index={0}
        snapPoints={snapPointsComments}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderSheetBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{ backgroundColor: colors.textDim }}
        backgroundStyle={{ backgroundColor: colors.backgroundSecondary }}
      >
        <ThemedView style={{ flex: 1 }}>
          <ThemedView
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <ThemedText style={styles.modalTitle}>Comments</ThemedText>
          </ThemedView>

          <BottomSheetFlatList
            data={localComments}
            renderItem={renderComment}
            keyExtractor={(item: Comment, index: number) =>
              item._id || index.toString()
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.commentsList}
            style={{ flex: 1 }}
          />

          <CommentInput
            user={user}
            colors={colors}
            commentText={commentText}
            setCommentText={setCommentText}
            handleCommentSubmit={handleCommentSubmit}
            isCommentSending={isCommentSending}
          />
        </ThemedView>
      </BottomSheetModal>
      <BottomSheetModal
        ref={optionsModalRef}
        index={0}
        snapPoints={snapPointsOptions}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        backdropComponent={renderSheetBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 44 }}
        backgroundStyle={{
          backgroundColor: colors.backgroundSecondary,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      >
        <ThemedView style={styles.optionsModal}>
          <ThemedView style={styles.optionsHeader}>
            <UserAvatar
              imageUri={post.user.profileImage}
              size={38}
            />
            <ThemedView style={{ flex: 1 }}>
              <ThemedText style={styles.optionsName} numberOfLines={1}>
                {post.user.firstName} {post.user.lastName}
              </ThemedText>
              <ThemedText style={[styles.optionsSub, { color: colors.textDim }]}>
                Post options
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView
            style={[styles.optionGroup, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <OptionRow icon="account-outline" label="About this account" onPress={handleAboutAccount} />
            <OptionRow
              icon={isSaved ? "bookmark" : "bookmark-outline"}
              label={isSaved ? "Unsave" : "Save"}
              onPress={handleSavePress}
              last
            />
          </ThemedView>

          {post.user._id !== user?._id ? (
            <ThemedView
              style={[styles.optionGroup, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <OptionRow icon="alert-circle-outline" label="Report" onPress={handleReportPost} danger />
              <OptionRow icon="block-helper" label="Block user" onPress={handleBlockAuthor} danger last />
            </ThemedView>
          ) : (
            <ThemedView
              style={[styles.optionGroup, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <OptionRow icon="archive-outline" label="Archive" onPress={handleArchivePost} />
              <OptionRow icon="trash-can-outline" label="Delete post" onPress={handleDeletePost} danger last />
            </ThemedView>
          )}
        </ThemedView>
      </BottomSheetModal>
      <SharePostSheet ref={shareModalRef} post={post} />
    </ThemedView>
  );
};

const OptionRow = ({
  icon,
  label,
  onPress,
  danger = false,
  last = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  const tint = danger ? colors.red : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <ThemedView style={[styles.optionIconBox, { backgroundColor: tint + "1F" }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
      </ThemedView>
      <ThemedText style={[styles.optionLabel, { color: danger ? colors.red : colors.text }]}>
        {label}
      </ThemedText>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textDim} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  archivingOverlay: {
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
    borderRadius: 20,
  },
  postContainer: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImageBorder: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  userImage: {
    height: 34,
    width: 34,
    borderRadius: 17,
  },
  userInfoText: {
    marginLeft: 10,
    width: "70%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "600",
  },
  slidingContainer: {
    height: 20,
    overflow: "hidden",
    width: "100%",
  },
  slidingItem: {
    position: "absolute",
    width: "100%",
  },
  infoText: {
    fontSize: 12,
    width: "100%",
  },
  threeDotsIcon: {
    padding: 5,
  },
  postImageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
  },
  heartBurst: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  soundIconContainer: {
    position: "absolute",
    bottom: 15,
    right: 15,
    height: 30,
    width: 30,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  footerIconsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerIcon: {
    marginRight: 15,
  },
  footerIconsRight: {
    flexDirection: "row",
  },
  iconAndCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  iconCountText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  likedByText: {
    fontSize: 13,
    marginBottom: 6,
  },
  postDetails: {
    paddingHorizontal: 15,
    paddingBottom: 16,
  },
  captionRow: {
    flexDirection: "row",
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionUserName: {
    fontWeight: "bold",
    marginRight: 5,
  },
  timeAgoText: {
    fontSize: 12,
    lineHeight: 14,
    marginTop: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    marginBottom: Platform.OS === "ios" ? 20 : 30,
  },
  currentUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    lineHeight: 18,
    borderWidth: 1,
  },
  sendButton: {
    marginLeft: 10,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  commentUserImage: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  commentUserName: {
    fontWeight: "bold",
    marginRight: 5,
    fontSize: 14,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    lineHeight: 20,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionsModal: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  optionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  optionsName: {
    fontSize: 16,
    fontWeight: "800",
  },
  optionsSub: {
    fontSize: 12,
  },
  optionGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    lineHeight: 18.8,
  },
  searchLoading: {
    marginLeft: 10,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
});

export default PostComponent;
