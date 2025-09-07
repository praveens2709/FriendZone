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
  Image,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { AntDesign, Entypo, Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
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
import * as Haptics from 'expo-haptics';
import { Post, Comment } from "@/types/post.type";
import PostService from "@/services/PostService";
import { useAuth } from "@/context/AuthContext";
import { formatPostTimestamp, formatCommentTimestamp, showToast, getUserStatusLabel } from "@/constants/Functions";
import { User } from "@/types/user.type";
import KnockService, { KnockRequest } from "@/services/knockService";
import ChatService from "@/services/ChatService";
import { DisplayUser } from "@/types/chat.type";
import UserProfileCard from "@/components/UserProfileCard";

const { width, height } = Dimensions.get("window");
const POST_WIDTH = width;
const ONE_SECOND_IN_MS = 1000;

interface PostComponentProps {
  post: Post;
  currentlyPlayingId: string | null;
  setCurrentlyPlayingId: (id: string | null) => void;
  isActive: boolean;
  isGloballyMuted: boolean;
  setIsGloballyMuted: (isMuted: boolean) => void;
}

const CommentInput = React.memo(({
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
  <View
    style={[styles.commentInputContainer, { borderTopColor: colors.border }]}
  >
    <Image
      source={{ uri: user?.profileImage }}
      style={styles.currentUserImage}
    />
    <BottomSheetTextInput
      style={[
        styles.commentInput,
        { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
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
  </View>
));

const PostComponent = ({ post, currentlyPlayingId, setCurrentlyPlayingId, isActive, isGloballyMuted, setIsGloballyMuted }: PostComponentProps) => {
  const { colors } = useTheme();
  const { user, accessToken } = useAuth();
  
  const safeLikes = Array.isArray(post.likes) ? post.likes : [];
  const safeSaves = Array.isArray(post.saves) ? post.saves : [];
  const safeComments = Array.isArray(post.comments) ? post.comments : [];

  const [isLiked, setIsLiked] = useState(safeLikes.includes(user?._id || ""));
  const [isSaved, setIsSaved] = useState(safeSaves.includes(user?._id || ""));
  const [postLikesCount, setPostLikesCount] = useState(safeLikes.length);
  const [localComments, setLocalComments] = useState<Comment[]>(safeComments);
  const [commentCount, setCommentCount] = useState(safeComments.length);
  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullCaption, setShowFullCaption] = useState(false);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastTap = useRef<number | null>(null);
  const animationInterval = useRef<NodeJS.Timeout | number | null>(null);
  
  const isPlayingThisPost = currentlyPlayingId === post._id && !isGloballyMuted;
  const isMuted = isGloballyMuted;

  const slideAnimation = useSharedValue(0);

  const commentsModalRef = useRef<BottomSheetModal>(null);
  const optionsModalRef = useRef<BottomSheetModal>(null);
  const shareModalRef = useRef<BottomSheetModal>(null);

  const snapPointsComments = useMemo(() => [height * 0.55], []);
  const snapPointsOptions = useMemo(() => [height * 0.4], []);
  const snapPointsShare = useMemo(() => ['70%'], []);

  const hasMultipleInfo = !!post.song && !!post.location;

  // State for share modal search
  const [searchQuery, setSearchQuery] = useState("");
  const [usersToShareWith, setUsersToShareWith] = useState<DisplayUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sharingToChatId, setSharingToChatId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getRelationAndStatus = useCallback(
    (targetUserId: string, knockers: KnockRequest[], knocked: KnockRequest[], currentUserId: string) => {
      const knockedByMe = knocked.find(k => k.knockedId === targetUserId && k.knockerId === currentUserId);
      const knockedMe = knockers.find(k => k.knockerId === targetUserId && k.knockedId === currentUserId);
      
      let relation: DisplayUser['relationToMe'] = "stranger";
      let status: DisplayUser['status'] = undefined;

      if (knockedByMe && knockedMe) {
        relation = "lockedIn";
        status = "lockedIn";
      } else if (knockedByMe) {
        relation = "knocked";
        status = knockedByMe.status as DisplayUser['status'];
      } else if (knockedMe) {
        relation = "knocker";
        status = knockedMe.status as DisplayUser['status'];
      }
      
      return { relation, status };
    },
    []
  );

  const fetchInitialUsersForShare = useCallback(async () => {
    if (!accessToken || !user?._id) return;
    setIsSearching(true);
    try {
      const [knockersResponse, knockedResponse] = await Promise.all([
        KnockService.getKnockers(accessToken),
        KnockService.getKnocked(accessToken),
      ]);

      const uniqueUsersMap = new Map<string, DisplayUser>();

      const allRelevantKnocks = [...knockedResponse, ...knockersResponse];
      allRelevantKnocks.forEach((k) => {
        const targetUserId = k.user.id;
        if (targetUserId === user._id) return;
        const { relation, status } = getRelationAndStatus(targetUserId, knockersResponse, knockedResponse, user._id);
        
        if (status === 'lockedIn' || status === 'onesidedlock') {
          uniqueUsersMap.set(targetUserId, {
            id: targetUserId,
            username: k.user.username,
            avatar: k.user.avatar,
            status: status,
            relationToMe: relation,
            isCreatingChat: false,
          });
        }
      });

      const sortedUsers = Array.from(uniqueUsersMap.values()).filter(u => u.status === 'lockedIn' || u.status === 'onesidedlock');
      setUsersToShareWith(sortedUsers);
    } catch (error) {
      console.error("Failed to fetch users for share:", error);
    } finally {
      setIsSearching(false);
    }
  }, [accessToken, user?._id, getRelationAndStatus]);

  const handleSearchForShare = useCallback(
    async (text: string) => {
      if (!accessToken || !user?._id) return;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (text.length === 0) {
        setIsSearching(false);
        fetchInitialUsersForShare();
        return;
      }
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const [searchResults, knockersResponse, knockedResponse] = await Promise.all([
            KnockService.searchUsers(accessToken, text),
            KnockService.getKnockers(accessToken),
            KnockService.getKnocked(accessToken),
          ]);
          
          const processedSearchResults: DisplayUser[] = searchResults
            .filter(u => u._id !== user._id)
            .map(u => {
              const { relation, status } = getRelationAndStatus(u._id, knockersResponse, knockedResponse, user._id);
              return {
                id: u._id,
                username: `${u.firstName} ${u.lastName || ""}`.trim(),
                avatar: u.profileImage,
                relationToMe: relation,
                status: status,
                isCreatingChat: false,
              };
            })
            .filter(u => u.status === 'lockedIn' || u.status === 'onesidedlock');

          setUsersToShareWith(processedSearchResults);
        } catch (error) {
          console.error("Error searching users:", error);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    },
    [accessToken, user?._id, fetchInitialUsersForShare, getRelationAndStatus]
  );
  
  const handlePresentShareModal = useCallback(() => {
    if (!accessToken) return showToast("error", "You must be logged in to share a post.");
    setSearchQuery("");
    fetchInitialUsersForShare();
    shareModalRef.current?.present();
  }, [accessToken, fetchInitialUsersForShare]);

  const handleShareToUser = useCallback(async (recipientId: string) => {
    if (!accessToken) return;
    setSharingToChatId(recipientId);
    try {
      const chatResponse = await ChatService.createChat(accessToken, recipientId);
      await PostService.sharePostToChat(post._id, chatResponse.chatId, accessToken); 
      showToast("success", "Post shared successfully!");
      shareModalRef.current?.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to share post:", error);
      showToast("error", "Failed to share post. Please try again.");
    } finally {
      setSharingToChatId(null);
    }
  }, [accessToken, post._id]);

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
    const playSound = async () => {
      if (!post.song) return;
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: post.song.previewUrl },
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      } catch (e) {
        console.error("Error creating sound:", e);
      }
    };

    const stopSound = async () => {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };

    if (isActive && isPlayingThisPost) {
      playSound();
    } else {
      stopSound();
    }

    return () => {
      stopSound();
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
          translateY: withTiming((1 - slideAnimation.value) * 20, { duration: 500 }),
        },
      ],
    };
  });

  const handleDoublePress = useCallback(() => {
    const now = Date.now();
    const isDoublePress = lastTap.current && now - lastTap.current < 300;

    if (isDoublePress) {
      if (!isLiked) {
        handleLikePress();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      lastTap.current = null;
    } else {
      lastTap.current = now;
    }
  }, [isLiked]);

  const onMomentumScrollEnd = useCallback((event: any) => {
    const newIndex = Math.floor(
      event.nativeEvent.contentOffset.x / POST_WIDTH + 0.5
    );
    setActiveImageIndex(newIndex);
  }, []);

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
      const response = await PostService.toggleSave(post._id, accessToken);
      setIsSaved(response.saved);
      optionsModalRef.current?.dismiss();
    } catch (error) {
      console.error("Failed to toggle save:", error);
    }
  }, [isSaved, accessToken, post._id]);

  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || !accessToken) return;
    setIsCommentSending(true);

    try {
      const newComment = await PostService.addComment(
        post._id,
        commentText.trim(),
        accessToken
      );
      setLocalComments((prev) => [newComment, ...prev]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsCommentSending(false);
    }
  }, [accessToken, post._id, commentText]);

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <Image
        source={{ uri: item.user.profileImage }}
        style={styles.commentUserImage}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <ThemedText style={styles.commentUserName}>
            {item.user.firstName} {item.user.lastName}
          </ThemedText>
          <ThemedText style={[styles.commentTime, {color: colors.textDim}]}>
            {formatCommentTimestamp(item.createdAt)}
          </ThemedText>
        </View>
        <ThemedText style={styles.commentText}>{item.text}</ThemedText>
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: DisplayUser }) => {
    const description =
      item.status && item.relationToMe
        ? getUserStatusLabel(item.status, item.relationToMe)
        : "Stranger";

    return (
      <UserProfileCard
        userId={item.id}
        username={item.username}
        avatar={item.avatar}
        description={description}
        onPress={() => handleShareToUser(item.id)}
        rightActionComponent={
          sharingToChatId === item.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="send" size={24} color={colors.primary} />
          )
        }
      />
    );
  };

  const captionContent = typeof post.caption === 'string' ? post.caption : '';

  return (
    <ThemedView style={styles.postContainer}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.userInfoContainer}>
          <View
            style={[
              styles.userImageBorder,
              post.user.hasStory && {
                borderColor: post.user.storySeen
                  ? colors.border
                  : "transparent",
              },
            ]}
          >
            {post.user.hasStory && (
              <LinearGradient
                colors={
                  post.user.storySeen
                    ? [colors.background, colors.background]
                    : [colors.storyGradient1, colors.storyGradient2]
                }
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    borderRadius: 50,
                    borderWidth: 2,
                    borderColor: colors.background,
                  },
                ]}
              />
            )}
            <Image source={{ uri: post.user.profileImage }} style={styles.userImage} />
          </View>
          <View style={styles.userInfoText}>
            <ThemedText style={[styles.userName, {color: colors.text}]}>
              {post.user.firstName} {post.user.lastName}
            </ThemedText>
            {hasMultipleInfo ? (
              <View style={styles.slidingContainer}>
                <Animated.View style={[styles.slidingItem, slideStyleLocation]}>
                  <ThemedText style={[styles.infoText, {color: colors.text}]} numberOfLines={1}>
                    {post.location}
                  </ThemedText>
                </Animated.View>
                <Animated.View style={[styles.slidingItem, slideStyleSong]}>
                  <ThemedText style={[styles.infoText, {color: colors.text}]} numberOfLines={1}>
                    {post.song?.artistName} - {post.song?.trackName}
                  </ThemedText>
                </Animated.View>
              </View>
            ) : post.location ? (
              <ThemedText style={styles.infoText} numberOfLines={1}>
                {post.location}
              </ThemedText>
            ) : post.song ? (
              <ThemedText style={styles.infoText} numberOfLines={1}>
                {post.song.artistName} - {post.song.trackName}
              </ThemedText>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.threeDotsIcon}
          onPress={handlePresentOptionsModal}
        >
          <Entypo
            name="dots-three-horizontal"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Post Body */}
      <TouchableWithoutFeedback onPress={handleDoublePress}>
        <View style={styles.postImageContainer}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={post.images}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.postImage} />
            )}
            keyExtractor={(item) => item.public_id}
            onMomentumScrollEnd={onMomentumScrollEnd}
          />
          {post.images.length > 1 && (
            <View
              style={[
                styles.slideCounter,
                { backgroundColor: colors.overlayLight },
              ]}
            >
              <ThemedText style={styles.slideCounterText}>
                {activeImageIndex + 1}/{post.images.length}
              </ThemedText>
            </View>
          )}
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
                  color={colors.text}
                />
              </TouchableOpacity>
            </MotiView>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Post Footer */}
      <View style={styles.postFooter}>
        <View style={styles.footerIconsLeft}>
          <TouchableOpacity onPress={handleLikePress} style={styles.iconAndCountContainer}>
            <AntDesign
              name={isLiked ? "heart" : "hearto"}
              size={28}
              color={isLiked ? colors.red : colors.text}
            />
            {postLikesCount > 0 && <ThemedText style={styles.iconCountText}>{postLikesCount}</ThemedText>}
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
            {commentCount > 0 && <ThemedText style={styles.iconCountText}>{commentCount}</ThemedText>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerIcon} onPress={handlePresentShareModal}>
            <Feather
              name="send"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.footerIconsRight}>
          <TouchableOpacity onPress={handleSavePress}>
            <MaterialCommunityIcons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={30}
              color={isSaved ? colors.text : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Details */}
      <View style={styles.postDetails}>
        <View style={styles.captionRow}>
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
        </View>
        <ThemedText style={[styles.timeAgoText, {color: colors.textDim}]}>
          {formatPostTimestamp(post.createdAt)}
        </ThemedText>
      </View>

      {/* Comments BottomSheet */}
      <BottomSheetModal
        ref={commentsModalRef}
        index={0}
        snapPoints={snapPointsComments}
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{ backgroundColor: colors.textDim }}
        backgroundStyle={{ backgroundColor: colors.backgroundSecondary }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <ThemedText style={styles.modalTitle}>Comments</ThemedText>
          </View>

          <BottomSheetFlatList
            data={localComments}
            renderItem={renderComment}
            keyExtractor={(item, index) => item._id || index.toString()}
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
        </View>
      </BottomSheetModal>

      {/* Options BottomSheet */}
      <BottomSheetModal
        ref={optionsModalRef}
        index={0}
        snapPoints={snapPointsOptions}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        handleIndicatorStyle={{ backgroundColor: colors.textDim }}
        backgroundStyle={{ backgroundColor: colors.backgroundSecondary }}
      >
        <View style={styles.optionsModal}>
          <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
            onPress={() => Alert.alert("Option", "About this account")}
          >
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={colors.text}
              style={styles.optionIcon}
            />
            <ThemedText style={[styles.optionText, {color: colors.text}]}>
              About this account
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSavePress}
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
          >
            <MaterialCommunityIcons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isSaved ? colors.text : colors.text}
              style={styles.optionIcon}
            />
            <ThemedText style={[styles.optionText, {color: colors.text}]}>
              {isSaved ? "Unsave" : "Save"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
            onPress={() => Alert.alert("Option", "Report")}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color={colors.red}
              style={styles.optionIcon}
            />
            <ThemedText style={[styles.optionText, { color: colors.red }]}>
              Report
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
            onPress={() => Alert.alert("Option", "Block user")}
          >
            <MaterialCommunityIcons
              name="block-helper"
              size={24}
              color={colors.text}
              style={styles.optionIcon}
            />
            <ThemedText style={[styles.optionText, {color: colors.text}]}>Block user</ThemedText>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* Share BottomSheetModal */}
      <BottomSheetModal
        ref={shareModalRef}
        index={0}
        snapPoints={snapPointsShare}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        handleIndicatorStyle={{ backgroundColor: colors.textDim }}
        backgroundStyle={{ backgroundColor: colors.backgroundSecondary }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>Share Post</ThemedText>
          </View>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather
              name="search"
              size={20}
              color={colors.textDim}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="Search by name"
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                handleSearchForShare(text);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.searchLoading}
              />
            )}
          </View>
          <BottomSheetFlatList
            data={usersToShareWith}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <ThemedView
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            )}
            ListEmptyComponent={() => (
              <ThemedView style={styles.emptyListContainer}>
                <ThemedText
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    color: colors.textDim,
                  }}
                >
                  No LockedIn or Knocking users to share with.
                </ThemedText>
              </ThemedView>
            )}
          />
        </View>
      </BottomSheetModal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  postContainer: {
    width: "100%",
    marginBottom: 20,
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
    width: '70%',
  },
  userName: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "600",
  },
  slidingContainer: {
    height: 20,
    overflow: "hidden",
    width: '100%',
  },
  slidingItem: {
    position: "absolute",
    width: '100%',
  },
  infoText: {
    fontSize: 12,
    width: '100%',
  },
  threeDotsIcon: {
    padding: 5,
  },
  postImageContainer: {
    width: POST_WIDTH,
    height: POST_WIDTH,
    position: "relative",
  },
  postImage: {
    width: POST_WIDTH,
    height: POST_WIDTH,
  },
  slideCounter: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  slideCounterText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
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
  postDetails: {
    paddingHorizontal: 15,
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
    marginBottom: Platform.OS === 'ios' ? 20 : 30
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
    paddingHorizontal: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
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