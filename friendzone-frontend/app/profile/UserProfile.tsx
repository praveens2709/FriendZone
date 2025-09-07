import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Image,
  View,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import KnockService, { UserAvatar } from "@/services/knockService";
import ProfileServices from "@/services/ProfileService";
import ChatService from "@/services/ChatService";
import {
  showToast,
  getUserAvatar,
  getUserStatusLabel,
} from "@/constants/Functions";
import { Feather, Ionicons } from "@expo/vector-icons";
import { User } from "@/types/user.type";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import UserAvatarComponent from "@/components/UserAvatar";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import PostGrid, { PostItem } from "@/components/PostGrid";
import PostService from "@/services/PostService";
import { Post as PostType } from "@/types/post.type";
import { LinearGradient } from "expo-linear-gradient";

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

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
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
  const [postsCount, setPostsCount] = useState(0);
  const [knockersCount, setKnockersCount] = useState(0);
  const [knockingCount, setKnockingCount] = useState(0);
  const [lockedInCount, setLockedInCount] = useState(0);
  const [mutualConnections, setMutualConnections] = useState<UserAvatar[]>([]);
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);

  const [showUnknockConfirmModal, setShowUnknockConfirmModal] = useState(false);

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
            profileCounts
        ] = await Promise.all([
            ProfileServices.getProfileById(accessToken, userId as string),
            KnockService.getKnockers(accessToken),
            KnockService.getKnocked(accessToken),
            KnockService.getKnockersForUser(accessToken, userId as string),
            KnockService.getCountsForUser(accessToken, userId as string)
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

        if (isKnocker && isKnocked && isKnocker.status === "lockedIn" && isKnocked.status === "lockedIn") {
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
        showToast("error", "Failed to load user profile.");
        setUserProfile(null);
    } finally {
        setIsLoading(false);
    }
  }, [userId, accessToken, user?._id]);

  const fetchUserPosts = useCallback(async () => {
    if (!accessToken || !userId) return;
    try {
      const postsForUser = await PostService.getPostsByUserId(accessToken, userId as string);
      setPostsCount(postsForUser.length);
      const formattedPosts: PostItem[] = postsForUser.map(post => ({
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

  const handlePressPost = useCallback((item: PostItem) => {
    router.push({
      pathname: "/posts/[postId]",
      params: { postId: item.id }
    });
  }, [router]);

const confirmUnknockAction = async (targetUser: User) => {
    setShowUnknockConfirmModal(false);
    if (!accessToken || actionLoadingId || !targetUser._id) {
        return;
    }
    setActionLoadingId(targetUser._id);

    try {
        if (relationToMe === "lockedIn") {
            await KnockService.breakLock(targetUser._id, accessToken);
            showToast("success", `You have unknocked ${targetUser.firstName}.`);
        } else if (knockId) {
            await KnockService.unknockUser(knockId, accessToken);
            showToast("success", `You have unknocked ${targetUser.firstName}.`);
        } else {
            showToast("error", "Knock ID not found for unknock action.");
        }
        fetchUserProfile();
    } catch (error: any) {
        console.error("Action failed:", error);
        showToast("error", error.response?.data?.message || "Failed to perform action.");
    } finally {
        setActionLoadingId(null);
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
            chatAvatar: getUserAvatar({
              avatar: targetUser.profileImage ?? null,
              username: `${targetUser.firstName} ${targetUser.lastName || ""}`,
            }),
            isRestricted: String(chatResponse.isRestricted),
            firstMessageByKnockerId: chatResponse.firstMessageByKnockerId || "",
          },
        });
      } else if (actionType === "knock") {
        await KnockService.knockUser(targetUser._id, accessToken);
        showToast("success", `Knock sent to ${targetUser.firstName}!`);
      } else if (actionType === "knockBack") {
        if (knockId) {
          await KnockService.knockBack(knockId, accessToken);
          showToast(
            "success",
            `You knocked back ${targetUser.firstName}! You are now LockedIn!`
          );
        } else {
          showToast("error", "Knock ID not found for knock back action.");
        }
      }
      fetchUserProfile();
    } catch (error: any) {
      console.error("Action failed:", error);
      showToast(
        "error",
        error.response?.data?.message || "Failed to perform action."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActionButtons = () => {
    if (!userProfile) return null;

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
              borderColor: colors.border,
              opacity: primaryButtonDisabled ? 0.6 : 1,
            },
          ]}
          onPress={() => handleUserAction(userProfile, primaryButtonAction)}
          disabled={primaryButtonDisabled}
        >
          {actionLoadingId === userProfile._id ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <ThemedText
              style={[styles.actionButtonText, { color: colors.text }]}
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
              borderColor: colors.border,
              opacity: secondaryButtonDisabled ? 0.6 : 1,
            },
          ]}
          onPress={() => handleUserAction(userProfile, "message")}
          disabled={secondaryButtonDisabled}
        >
          <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>
            Message
          </ThemedText>
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
        <ThemedView style={styles.profileInfoContainer}>
          <UserAvatarComponent
            imageUri={getUserAvatar({
              avatar: userProfile.profileImage ?? null,
              username: `${userProfile.firstName} ${
                userProfile.lastName || ""
              }`,
            })}
            size={80}
          />
          <ThemedView style={styles.userInfoAndStats}>
            <ThemedView style={styles.usernameAndStatus}>
              <ThemedText style={styles.fullName}>
                {`${userProfile.firstName} ${
                  userProfile.lastName || ""
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
                <ThemedText style={styles.statNumber}>
                  {postsCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Posts
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {knockersCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Knockers
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {knockingCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  Knocking
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.statItem}>
                <ThemedText style={styles.statNumber}>
                  {lockedInCount}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: colors.textDim }]}
                >
                  LockedIn
                </ThemedText>
              </ThemedView>
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

        <ThemedView
          style={[styles.postsTabContainer, { borderTopColor: colors.border }]}
        >
          <TouchableOpacity style={styles.postsTabButton}>
            <Ionicons name="grid" size={24} color={colors.text} />
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
      <ThemedText style={styles.noPostsText}>
        No posts yet
      </ThemedText>
      <ThemedText style={[styles.privateProfileSubText, { color: colors.textDim }]}>
        This user hasn't posted anything yet.
      </ThemedText>
    </ThemedView>
  );

  const isPrivateAndNotConnected =
    userProfile?.isPrivate &&
    relationToMe !== "lockedIn";

  if (isLoading) {
    return (
      <ThemedView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="small" color={colors.text} />
        <ThemedText type="subtitle" style={{ color: colors.textDim }}>
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
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.container}>
        <CommonHeader
          leftContent={<BackButton color={colors.text}/>}
          title={
            userProfile
              ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
              : ""
          }
          rightContent1={
            <TouchableOpacity
              onPress={() => showToast("info", "More info about this user.")}
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
              <Image source={{ uri: item.thumbnail }} style={styles.postImage} />
              {item.isMultiple && (
                <View style={styles.multipleIconContainer}>
                  <Ionicons name="copy-outline" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={isPrivateAndNotConnected ? renderPrivateProfileContent : renderNoPostsContent}
          contentContainerStyle={{ flexGrow: 1 }}
        />
        <ThemedModal
          visible={showUnknockConfirmModal}
          onClose={() => setShowUnknockConfirmModal(false)}
        >
          <ThemedText
            type="subtitle"
            style={{
              textAlign: "center",
              marginBottom: 25,
              color: colors.text,
            }}
          >
            Are you sure you want to unknock {userProfile?.firstName}?
          </ThemedText>

          <ThemedView style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={() => setShowUnknockConfirmModal(false)}
              style={[styles.button, { marginRight: 8 }]}
            />
            <Button
              title="Unknock"
              onPress={() => userProfile && confirmUnknockAction(userProfile)}
              style={styles.button}
            />
          </ThemedView>
        </ThemedModal>
      </ThemedSafeArea>
    </LinearGradient>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
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