import { tapFeedback } from "@/utils/haptics";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Alert,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import StoryService from "@/services/StoryService";
import StoryAvatarRing from "@/components/StoryAvatarRing";
import ProfileHeaderArt from "@/components/ProfileHeaderArt";
import OnArtTheme, { onArtColors } from "@/components/OnArtTheme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import KnockService, { UserAvatar } from "@/services/knockService";
import ProfileServices from "@/services/ProfileService";
import ChatService from "@/services/ChatService";
import { getUserStatusLabel } from "@/constants/Functions";
import { Feather, Ionicons } from "@expo/vector-icons";
import { User } from "@/types/user.type";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import UserAvatarComponent from "@/components/UserAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import { PostItem } from "@/components/PostGrid";
import PostService from "@/services/PostService";
import SafetyService, { ReportReason } from "@/services/SafetyService";

interface ExploreDisplayUser {
  id: string;
  username: string;
  avatar: string | null;
  status?: "pending" | "lockedIn" | "onesidedlock" | "declined";
  relationToMe?: "knocker" | "knocked" | "lockedIn" | "stranger";
  isActionLoading?: boolean;
  knockId?: string;
}

const screenWidth = Dimensions.get("window").width;
const POST_ITEM_SIZE = (screenWidth - 4) / 3;

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "nudity", label: "Inappropriate content" },
  { value: "underage", label: "Under 18" },
  { value: "other", label: "Something else" },
];

function OptionRowItem({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const color = danger ? colors.error : colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <ThemedText style={{ color, fontSize: 16, fontWeight: "600" }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function UserProfileContent() {
  const { colors } = useTheme();
  const themeColors = colors;
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();
  const [storyGroup, setStoryGroup] = useState<{ seen: boolean } | null>(null);
  const { userId } = useLocalSearchParams();

  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relationToMe, setRelationToMe] = useState<
    "knocker" | "knocked" | "lockedIn" | "stranger" | undefined
  >(undefined);
  const [knockId, setKnockId] = useState<string | undefined>(undefined);
  const [knockStatus, setKnockStatus] = useState<
    "pending" | "lockedIn" | "onesidedlock" | "declined" | undefined
  >(undefined);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [optionsStep, setOptionsStep] = useState<null | "menu" | "report" | "block">(null);
  const [postsCount, setPostsCount] = useState(0);
  const [knockersCount, setKnockersCount] = useState(0);
  const [knockingCount, setKnockingCount] = useState(0);
  const [lockedInCount, setLockedInCount] = useState(0);
  const [mutualConnections, setMutualConnections] = useState<UserAvatar[]>([]);
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);

  const [showUnknockConfirmModal, setShowUnknockConfirmModal] = useState(false);

  const submitReport = (reason: ReportReason) => {
    if (!accessToken || !userId) return;
    SafetyService.report("user", userId as string, reason, accessToken)
      .then(() => undefined)
      .catch(() => undefined);
  };

  const handleReport = (reason: ReportReason) => {
    setOptionsStep(null);
    submitReport(reason);
  };

  const handleBlock = async () => {
    setOptionsStep(null);
    if (!accessToken || !userId) return;
    try {
      await SafetyService.blockUser(userId as string, accessToken);
      router.back();
    } catch {
      return;
    }
  };

  const handleMoreOptions = () => setOptionsStep("menu");

  const fetchUserProfile = useCallback(async () => {
    if (!userId || !accessToken || !user?._id) {
      setIsLoading(false);
      return;
    }

    try {
      const [
        profile,
        knockersResponse,
        knockedResponse,
        knockersForUserResponse,
        profileCounts,
      ] = await Promise.all([
        ProfileServices.getProfileById(accessToken, userId as string),
        KnockService.getKnockers(accessToken),
        KnockService.getKnocked(accessToken),
        KnockService.getKnockersForUser(accessToken, userId as string),
        KnockService.getCountsForUser(accessToken, userId as string),
      ]);

      const targetProfile = profile;

      setKnockersCount(profileCounts.knockersCount);
      setKnockingCount(profileCounts.knockingCount);
      setLockedInCount(profileCounts.lockedInCount);

      setMutualConnections(knockersForUserResponse);

      const isKnocker = knockersResponse.find(
        (k) => k.user.id === targetProfile._id
      );
      const isKnocked = knockedResponse.find(
        (k) => k.user.id === targetProfile._id
      );

      let currentRelation: ExploreDisplayUser["relationToMe"] = "stranger";
      let currentStatus:
        | "pending"
        | "lockedIn"
        | "onesidedlock"
        | "declined"
        | undefined = undefined;
      let currentKnockId = undefined;

      if (
        isKnocker &&
        isKnocked &&
        isKnocker.status === "lockedIn" &&
        isKnocked.status === "lockedIn"
      ) {
        currentRelation = "lockedIn";
        currentStatus = "lockedIn";
        currentKnockId = isKnocker.id;
      } else if (isKnocker) {
        currentRelation = "knocker";
        currentStatus = isKnocker.status;
        currentKnockId = isKnocker.id;
      } else if (isKnocked) {
        currentRelation = "knocked";
        currentStatus = isKnocked.status;
        currentKnockId = isKnocked.id;
      }

      setRelationToMe(currentRelation);
      setKnockId(currentKnockId);
      setKnockStatus(currentStatus);
      setUserProfile(targetProfile);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);

      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, accessToken, user?._id]);

  const fetchUserPosts = useCallback(async () => {
    if (!accessToken || !userId) return;
    try {
      const postsForUser = await PostService.getPostsByUserId(
        accessToken,
        userId as string
      );
      setPostsCount(postsForUser.length);
      const formattedPosts: PostItem[] = postsForUser.map((post) => ({
        id: post._id,
        thumbnail: post.images[0]?.url,
        isMultiple: post.images.length > 1,
        type: "image",
      }));
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
  }, [fetchUserProfile, fetchUserPosts]);

  const openConnections = (type: "knockers" | "knocking" | "lockedIn") => {
    if (!userProfile) return;
    router.push({
      pathname: "/profile/user-connections",
      params: { userId: userProfile._id, name: userProfile.firstName, type },
    });
  };

  const loadStory = useCallback(async () => {
    if (!userId) return;
    try {
      const groups = await StoryService.getStories();
      const found = groups.find((group) => group.id === userId);
      setStoryGroup(found ? { seen: !!found.seen } : null);
    } catch {
      setStoryGroup(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadStory();
    }, [loadStory])
  );

  useEffect(() => {
    if (!socket) return;
    const onKnockChange = () => fetchUserProfile();
    const onProfileUpdated = (data: { userId: string }) => {
      if (data.userId === userId) fetchUserProfile();
    };
    const onPostChange = () => fetchUserPosts();
    const onBlockChanged = ({ userId: otherId, blocked }: { userId: string; blocked: boolean }) => {
      if (otherId !== userId) return;
      if (blocked) router.back();
      else fetchUserProfile();
    };
    socket.on("knockStatusChanged", onKnockChange);
    socket.on("storiesChanged", loadStory);
    socket.on("userProfileUpdated", onProfileUpdated);
    socket.on("postRemoved", onPostChange);
    socket.on("postRestored", onPostChange);
    socket.on("newPost", onPostChange);
    socket.on("blockChanged", onBlockChanged);
    return () => {
      socket.off("knockStatusChanged", onKnockChange);
      socket.off("storiesChanged", loadStory);
      socket.off("userProfileUpdated", onProfileUpdated);
      socket.off("postRemoved", onPostChange);
      socket.off("postRestored", onPostChange);
      socket.off("newPost", onPostChange);
      socket.off("blockChanged", onBlockChanged);
    };
  }, [socket, userId, router, fetchUserProfile, fetchUserPosts, loadStory]);

  const handlePressPost = useCallback(
    (item: PostItem) => {
      router.push({
        pathname: "/posts/[postId]",
        params: { postId: item.id },
      });
    },
    [router]
  );

  const confirmUnknockAction = async (targetUser: User) => {
    setShowUnknockConfirmModal(false);
    if (!accessToken || actionLoadingId || !targetUser._id) {
      return;
    }
    setActionLoadingId(targetUser._id);
    setLoadingAction("primary");

    try {
      if (relationToMe === "lockedIn") {
        await KnockService.breakLock(targetUser._id, accessToken);

      } else if (knockId) {
        await KnockService.unknockUser(knockId, accessToken);

      }
      fetchUserProfile();
    } catch (error: any) {
      console.error("Action failed:", error);

    } finally {
      setActionLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleUserAction = async (
    targetUser: User,
    actionType: "knock" | "unknock" | "knockBack" | "message" | "breakLock"
  ) => {
    if (!accessToken || actionLoadingId || !targetUser._id) {
      return;
    }

    if (actionType === "unknock" || actionType === "breakLock") {
      setShowUnknockConfirmModal(true);
      return;
    }

    setActionLoadingId(targetUser._id);
    setLoadingAction(actionType === "message" ? "message" : "primary");

    try {
      if (actionType === "message") {
        const chatResponse = await ChatService.createChat(
          accessToken,
          targetUser._id
        );
        router.push({
          pathname: "/(chat)/[id]",
          params: {
            id: chatResponse.chatId,
            chatName: `${targetUser.firstName} ${targetUser.lastName}`,
            chatAvatar: targetUser.profileImage || "",
            isRestricted: String(chatResponse.isRestricted),
            firstMessageByKnockerId: chatResponse.firstMessageByKnockerId || "",
          },
        });
      } else if (actionType === "knock") {
        tapFeedback();
        await KnockService.knockUser(targetUser._id, accessToken);

      } else if (actionType === "knockBack") {
        if (knockId) {
          await KnockService.knockBack(knockId, accessToken);

        }
      }
      fetchUserProfile();
    } catch (error: any) {
      console.error("Action failed:", error);

    } finally {
      setActionLoadingId(null);
      setLoadingAction(null);
    }
  };

  const renderActionButtons = () => {
    if (!userProfile) return null;
    const colors = onArtColors(themeColors);

    let primaryButtonText = "";
    let primaryButtonAction:
      | "knock"
      | "unknock"
      | "knockBack"
      | "message"
      | "breakLock";
    let primaryButtonDisabled = actionLoadingId === userProfile._id;
    let secondaryButtonDisabled = actionLoadingId === userProfile._id;

    if (relationToMe === "knocked" && knockStatus === "pending") {
      primaryButtonText = "Unknock";
      primaryButtonAction = "unknock";
    } else {
      switch (relationToMe) {
        case "stranger":
          primaryButtonText = "Knock";
          primaryButtonAction = "knock";
          break;
        case "knocked":
          primaryButtonText = "Unknock";
          primaryButtonAction = "unknock";
          break;
        case "knocker":
          primaryButtonText = "Knock Back";
          primaryButtonAction = "knockBack";
          break;
        case "lockedIn":
          primaryButtonText = "Unknock";
          primaryButtonAction = "breakLock";
          break;
        default:
          return null;
      }
    }

    return (
      <ThemedView style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            {
              backgroundColor: "#FFFFFF",
              borderColor: "#FFFFFF",
              opacity: primaryButtonDisabled ? 0.6 : 1,
            },
          ]}
          onPress={() => handleUserAction(userProfile, primaryButtonAction)}
          disabled={primaryButtonDisabled}
        >
          {loadingAction === "primary" ? (
            <ActivityIndicator size="small" color="#111111" />
          ) : (
            <ThemedText
              style={[styles.actionButtonText, { color: "#111111" }]}
            >
              {primaryButtonText}
            </ThemedText>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.secondaryButton,
            {
              backgroundColor: "rgba(255,255,255,0.18)",
              borderColor: "rgba(255,255,255,0.6)",
              opacity: secondaryButtonDisabled ? 0.6 : 1,
            },
          ]}
          onPress={() => handleUserAction(userProfile, "message")}
          disabled={secondaryButtonDisabled}
        >
          {loadingAction === "message" ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>
              Message
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const getUserStatusLabelCustom = (
    status: "pending" | "lockedIn" | "onesidedlock" | "declined" | undefined,
    relation: "knocker" | "knocked" | "lockedIn" | "stranger" | undefined
  ) => {
    if (relation === "knocked" && status === "pending") {
      return "Requested";
    }
    return getUserStatusLabel(status, relation);
  };

  const renderHeaderContent = () => {
    if (!userProfile) return null;
    const colors = onArtColors(themeColors);

    const filteredConnections = mutualConnections.filter(
      (conn) => conn.id !== user?._id
    );

    const mutualAvatarCount = Math.min(filteredConnections.length, 3);
    const overlappingAvatarsWidth =
      mutualAvatarCount > 0 ? 24 + (mutualAvatarCount - 1) * 15 : 0;
    const knockedByTextMarginLeft =
      overlappingAvatarsWidth > 0 ? overlappingAvatarsWidth + 10 : 0;

    return (
      <ThemedView>
        <View style={styles.headerArtBox}>
        <ProfileHeaderArt vibe={userProfile.relationship?.vibe} />
        <OnArtTheme>
        <ThemedView style={styles.profileInfoContainer}>
          <StoryAvatarRing
            size={80}
            hasStory={!!storyGroup}
            seen={!!storyGroup?.seen}
            onPress={() => router.push(`/(stories)/${userProfile._id}`)}
          >
            <UserAvatarComponent imageUri={userProfile.profileImage} size={80} />
          </StoryAvatarRing>
          <ThemedView style={styles.userInfoAndStats}>
            <ThemedView style={styles.usernameAndStatus}>
              <ThemedText style={styles.fullName}>
                {`${userProfile.firstName} ${userProfile.lastName || ""
                  }`.trim()}
              </ThemedText>
              <ThemedText
                style={[styles.statusLabel, { color: colors.textDim }]}
              >
                {getUserStatusLabelCustom(knockStatus, relationToMe)}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.statsContainer}>
              <ThemedView style={styles.statItem}>
                <ThemedText style={styles.statNumber}>{postsCount}</ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Posts
                </ThemedText>
              </ThemedView>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.7}
                onPress={() => openConnections("knockers")}
              >
                <ThemedText style={styles.statNumber}>
                  {knockersCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Knockers
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.7}
                onPress={() => openConnections("knocking")}
              >
                <ThemedText style={styles.statNumber}>
                  {knockingCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Knocking
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.7}
                onPress={() => openConnections("lockedIn")}
              >
                <ThemedText style={styles.statNumber}>
                  {lockedInCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  LockedIn
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {userProfile.bio && (
          <ThemedText
            type="default"
            style={[styles.bio, { color: colors.textDim }]}
          >
            {userProfile.bio}
          </ThemedText>
        )}

        {filteredConnections.length > 0 && (
          <ThemedView style={[styles.knockedByContainer]}>
            <ThemedView style={styles.overlappingAvatars}>
              {filteredConnections.slice(0, 3).map((conn, index) => (
                <UserAvatarComponent
                  key={conn.id}
                  imageUri={conn.avatar}
                  size={24}
                  style={[
                    styles.overlappingAvatar,
                    {
                      left: index * 15,
                      zIndex: filteredConnections.length - index,
                      borderColor: colors.background,
                    },
                  ]}
                />
              ))}
            </ThemedView>
            <ThemedText
              style={[
                styles.knockedByText,
                { color: colors.textDim, marginLeft: knockedByTextMarginLeft },
              ]}
            >
              Knocked by{" "}
              <ThemedText style={styles.knockedByUser}>
                {filteredConnections[0]?.username.split(" ")[0]}
              </ThemedText>
              {filteredConnections.length > 1 && (
                <>
                  ,{" "}
                  <ThemedText style={styles.knockedByUser}>
                    {filteredConnections[1]?.username.split(" ")[0]}
                  </ThemedText>
                </>
              )}
              {filteredConnections.length > 2 && (
                <>
                  {" "}
                  and{" "}
                  <ThemedText style={styles.knockedByUser}>
                    {filteredConnections.length - 2} others
                  </ThemedText>
                </>
              )}
            </ThemedText>
          </ThemedView>
        )}

        {renderActionButtons()}

        </OnArtTheme>
        </View>

        <ThemedView
          style={[styles.postsTabContainer, { borderTopColor: themeColors.border }]}
        >
          <TouchableOpacity style={styles.postsTabButton}>
            <Ionicons name="grid" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  };

  const renderPrivateProfileContent = () => (
    <ThemedView style={styles.privateProfileContainer}>
      <Feather name="lock" size={60} color={colors.textDim} />
      <ThemedText style={styles.privateProfileText}>
        This account is private.
      </ThemedText>
      <ThemedText style={styles.privateProfileSubText}>
        Knock this user to see their profile and posts.
      </ThemedText>
    </ThemedView>
  );

  const renderNoPostsContent = () => (
    <ThemedView style={styles.noPostsContainer}>
      <Ionicons name="images" size={60} color={colors.textDim} />
      <ThemedText style={styles.noPostsText}>No posts yet</ThemedText>
      <ThemedText
        style={[styles.privateProfileSubText, { color: colors.textDim }]}
      >
        This user hasn't posted anything yet.
      </ThemedText>
    </ThemedView>
  );

  const isPrivateAndNotConnected =
    userProfile?.isPrivate &&
    relationToMe !== "lockedIn" &&
    !(relationToMe === "knocked" && knockStatus === "onesidedlock");

  if (isLoading) {
    return (
      <ThemedView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="small" color={colors.text} />
        <ThemedText style={{ color: colors.textDim }}>
          Loading profile...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!userProfile && !isLoading) {
    return (
      <ThemedView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ThemedText style={{ color: colors.textDim }}>
          User not found.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScreenBackground style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.container}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title={
            userProfile
              ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
              : ""
          }
          rightContent1={
            <TouchableOpacity
              onPress={handleMoreOptions}
            >
              <Feather name="info" size={24} color={colors.text} />
            </TouchableOpacity>
          }
          showBottomBorder={false}
        />
        <FlatList
          ListHeaderComponent={renderHeaderContent}
          data={isPrivateAndNotConnected ? [] : userPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.postItemContainer}
              onPress={() => handlePressPost(item)}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.postImage}
              />
              {item.isMultiple && (
                <ThemedView style={styles.multipleIconContainer}>
                  <Ionicons name="copy-outline" size={16} color="white" />
                </ThemedView>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            isPrivateAndNotConnected
              ? renderPrivateProfileContent
              : renderNoPostsContent
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
        <ConfirmModal
          visible={showUnknockConfirmModal}
          title={`Unknock ${userProfile?.firstName ?? ""}?`}
          confirmLabel="Unknock"
          onCancel={() => setShowUnknockConfirmModal(false)}
          onConfirm={() => userProfile && confirmUnknockAction(userProfile)}
        />
        <ThemedModal visible={optionsStep === "menu" || optionsStep === "report"} onClose={() => setOptionsStep(null)}>
          {optionsStep === "menu" && (
            <>
              <OptionRowItem icon="flag-outline" label="Report" onPress={() => setOptionsStep("report")} />
              <OptionRowItem icon="ban-outline" label="Block" danger onPress={() => setOptionsStep("block")} last />
            </>
          )}
          {optionsStep === "report" && (
            <>
              <ThemedText type="subtitle" style={styles.optionsTitle}>
                Why are you reporting this account?
              </ThemedText>
              {REPORT_REASONS.map((reason, index) => (
                <OptionRowItem
                  key={reason.value}
                  icon="alert-circle-outline"
                  label={reason.label}
                  onPress={() => handleReport(reason.value)}
                  last={index === REPORT_REASONS.length - 1}
                />
              ))}
            </>
          )}
        </ThemedModal>
        <ConfirmModal
          visible={optionsStep === "block"}
          title={`Block ${userProfile?.firstName ?? ""}?`}
          message="They won't be able to find you, message you or see your posts, and any knocks between you will be removed."
          confirmLabel="Block"
          onCancel={() => setOptionsStep(null)}
          onConfirm={handleBlock}
        />
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

export default function UserProfileScreen() {
  return <UserProfileContent />;
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  headerArtBox: {
    marginBottom: 6,
    overflow: "hidden",
    paddingTop: 8,
    paddingBottom: 8,
  },
  profileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 20,
  },
  userInfoAndStats: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 12,
  },
  usernameAndStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullName: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusLabel: {
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
  },
  bio: {
    fontSize: 16,
    textAlign: "left",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "transparent",
  },
  secondaryButton: {
    backgroundColor: "transparent",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  optionsTitle: { textAlign: "center", marginBottom: 16 },
  optionsCopy: { textAlign: "center", marginBottom: 20, lineHeight: 20 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    gap: 10,
  },
  privateProfileContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  privateProfileText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  privateProfileSubText: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  knockedByContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  overlappingAvatars: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    position: "relative",
  },
  overlappingAvatar: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 12,
  },
  knockedByText: {
    fontSize: 14,
  },
  knockedByUser: {
    fontSize: 14,
    fontWeight: "600",
  },
  postsTabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  postsTabButton: {
    padding: 10,
  },
  postGridContainer: {
    flex: 1,
    paddingHorizontal: 1,
  },
  postItemContainer: {
    width: POST_ITEM_SIZE,
    height: POST_ITEM_SIZE,
    margin: 1,
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  multipleIconContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 3,
    borderRadius: 5,
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  noPostsText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  button: {
    flex: 1,
  },
});
