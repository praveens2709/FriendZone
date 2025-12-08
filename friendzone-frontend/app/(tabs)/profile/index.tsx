import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import {
  Ionicons,
  Feather,
  FontAwesome5,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import ThemedModal from "@/components/ThemedModal";
import AuthModalContent from "@/components/AuthModalContent";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import KnockService, { KnockRequest } from "@/services/knockService";
import PostService from "@/services/PostService";
import { categorizeKnocks } from "@/utils/knock-utils";
import { KnockListType } from "@/types/knock.type";
import { useSocket } from "@/context/SocketContext";
import { Post as PostType } from "@/types/post.type";
import PostGrid, { PostItem } from "@/components/PostGrid";
import ThemedScrollView from "@/components/ThemedScrollView";
import WordleGameModal from "@/components/modals/WordleGameModal";
import QRModal from "@/components/modals/QRModal";
import MoodStatusModal, {
  MoodStatus,
} from "@/components/modals/MoodStatusModal";

const { width, height } = Dimensions.get("window");

// Predefined Avatar Types
interface Avatar {
  id: string;
  uri: string;
  category: string;
}

// Mock avatars
const PRESET_AVATARS: Avatar[] = [
  {
    id: "avatar1",
    uri: "https://api.dicebear.com/7.x/avataaars/png?seed=1",
    category: "Classic",
  },
  {
    id: "avatar2",
    uri: "https://api.dicebear.com/7.x/avataaars/png?seed=2",
    category: "Classic",
  },
  {
    id: "avatar3",
    uri: "https://api.dicebear.com/7.x/personas/png?seed=1",
    category: "Personas",
  },
  {
    id: "avatar4",
    uri: "https://api.dicebear.com/7.x/personas/png?seed=2",
    category: "Personas",
  },
  {
    id: "avatar5",
    uri: "https://api.dicebear.com/7.x/fun-emoji/png?seed=1",
    category: "Fun",
  },
  {
    id: "avatar6",
    uri: "https://api.dicebear.com/7.x/fun-emoji/png?seed=2",
    category: "Fun",
  },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, authLoading, signOut, accessToken } = useAuth();
  const { socket } = useSocket();

  const [showMainModal, setShowMainModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showAuthFlowModal, setShowAuthFlowModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showWordleModal, setShowWordleModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [currentMood, setCurrentMood] = useState<MoodStatus | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  const [knockersCount, setKnockersCount] = useState(0);
  const [knockingCount, setKnockingCount] = useState(0);
  const [lockedInCount, setLockedInCount] = useState(0);

  const [knockersList, setKnockersList] = useState<KnockRequest[]>([]);
  const [knockingList, setKnockingList] = useState<KnockRequest[]>([]);
  const [lockedInList, setLockedInList] = useState<KnockRequest[]>([]);

  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostType[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [refreshing, setRefreshing] = useState(false);

  const [scaleAnimation] = useState(new Animated.Value(1));

  const fetchKnockData = useCallback(async () => {
    if (!user || !accessToken) {
      return;
    }

    try {
      const [myReceivedKnocks, mySentKnocks] = await Promise.all([
        KnockService.getKnockers(accessToken),
        KnockService.getKnocked(accessToken),
      ]);

      const { knockers, knocking, lockedIn, lockedInCount } = categorizeKnocks(
        myReceivedKnocks,
        mySentKnocks,
        user._id
      );

      setKnockersList(knockers);
      setKnockingList(knocking);
      setLockedInList(lockedIn);
      setKnockersCount(knockers.length);
      setKnockingCount(knocking.length);
      setLockedInCount(lockedInCount);
    } catch (error) {
      console.error("Failed to fetch knock data:", error);
      setKnockersCount(0);
      setKnockingCount(0);
      setLockedInCount(0);
    }
  }, [user, accessToken]);

  const fetchUserPosts = useCallback(async () => {
    if (!user || !accessToken) {
      setLoadingPosts(false);
      return;
    }

    setLoadingPosts(true);
    try {
      const allPosts = await PostService.getPosts(accessToken);
      const posts = allPosts.filter((post) => post.user._id === user._id);
      setUserPosts(posts);
      setSavedPosts([]);
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [user, accessToken]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchKnockData(), fetchUserPosts()]);
    setRefreshing(false);
  }, [fetchKnockData, fetchUserPosts]);

  const handlePressPost = (item: PostItem) => {
    let postsToUse = activeTab === "posts" ? userPosts : savedPosts;
    const postData = postsToUse.find((p) => p._id === item.id);
    if (postData) {
      router.push({
        pathname: "/posts/[postId]",
        params: { postId: postData._id },
      });
    }
  };

  const handleMoodSelect = (mood: MoodStatus) => {
    setCurrentMood(mood);
  };

  const handleRemoveMood = () => {
    setCurrentMood(null);
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setShowAvatarModal(false);
    // Here you would typically update the user's avatar
  };

  useEffect(() => {
    fetchKnockData();
    fetchUserPosts();

    if (socket && user) {
      const handleKnockStatusChange = (data: { userId: string }) => {
        if (data.userId === user._id) {
          fetchKnockData();
        }
      };
      socket.on("knockStatusChanged", handleKnockStatusChange);

      return () => {
        socket.off("knockStatusChanged", handleKnockStatusChange);
      };
    }
  }, [fetchKnockData, fetchUserPosts, socket, user]);

  if (authLoading) {
    return (
      <ThemedSafeArea style={styles.centered}>
        <ActivityIndicator size="small" color={colors.text} />
        <ThemedText type="subtitle" style={{ color: colors.textDim }}>
          Loading profile...
        </ThemedText>
      </ThemedSafeArea>
    );
  }

  if (!user) {
    return (
      <ThemedSafeArea style={[styles.centered, styles.safeAreaTransparentBg]}>
        <ThemedText type="title">Couldn't load your profile</ThemedText>
        <ThemedText type="default" style={{ color: colors.textDim }}>
          Please try again later.
        </ThemedText>
      </ThemedSafeArea>
    );
  }

  const closeAuthFlowModal = () => {
    setShowAuthFlowModal(false);
    setAuthMode("login");
  };

  const navigateToKnockList = (type: KnockListType, data: KnockRequest[]) => {
    router.push({
      pathname: "/profile/knock-list",
      params: {
        listType: type,
        data: JSON.stringify(data),
      },
    });
  };

  const renderStatItem = (
    label: string,
    count: number,
    list: KnockRequest[],
    type: KnockListType,
    uniqueKey: string
  ) => (
    <TouchableOpacity
      key={uniqueKey}
      style={styles.statItem}
      onPress={() => navigateToKnockList(type, list)}
    >
      <ThemedText
        type="subtitle"
        style={[styles.statNumber, { color: colors.text }]}
      >
        {count}
      </ThemedText>
      <ThemedText
        type="default"
        style={[styles.statLabel, { color: colors.textDim }]}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  const postsForGrid: PostItem[] = (
    activeTab === "posts" ? userPosts : savedPosts
  ).map((post) => ({
    id: post._id,
    thumbnail: post.images[0]?.url,
    isMultiple: post.images.length > 1,
    type: "image",
  }));

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeAreaTransparentBg}>
        <CommonHeader
          leftContent={
            <TouchableOpacity
              style={styles.userHeader}
              onPress={() => setShowMainModal(true)}
            >
              <Feather
                name="lock"
                size={16}
                color={colors.text}
                style={{ marginRight: 6 }}
              />
              <ThemedText style={styles.username}>{user.firstName}</ThemedText>
              <FontAwesome5
                name="chevron-down"
                size={12}
                color={colors.text}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          }
          rightContent1={
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/profile/settings")}
            >
              <Ionicons name="menu" size={26} color={colors.text} />
            </TouchableOpacity>
          }
        />

        <ThemedScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <ThemedView style={styles.profileHeaderContainer}>
            <ThemedView style={styles.profileTopRow}>
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.statusLabelContainer}
                  onPress={() => setShowMoodModal(true)}
                >
                  <View
                    style={[
                      styles.statusBubble,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      style={[styles.statusText, { color: colors.text }]}
                    >
                      {currentMood ? currentMood.label : "What’s the vibe?"}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.bubbleTip,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  />
                  <View
                    style={[
                      styles.bubbleDot,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  />
                </TouchableOpacity>
                <View style={styles.avatarContainer}>
                  <TouchableOpacity onPress={() => setShowAvatarModal(true)}>
                    <UserAvatar
                      imageUri={selectedAvatar?.uri || user.profileImage}
                      size={85}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.plusIcon,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={() => setShowAvatarModal(true)}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedView style={styles.userInfoContainer}>
                <View style={styles.usernameRow}>
                  <ThemedText
                    style={[styles.profileUsername, { color: colors.text }]}
                  >
                    {user.firstName} {user.lastName}
                  </ThemedText>
                </View>

                <ThemedView style={styles.statsContainer}>
                  {renderStatItem(
                    "Posts",
                    userPosts.length,
                    [],
                    KnockListType.Knockers,
                    "posts"
                  )}
                  {renderStatItem(
                    "Knockers",
                    knockersCount,
                    knockersList,
                    KnockListType.Knockers,
                    "knockers"
                  )}
                  {renderStatItem(
                    "Knocking",
                    knockingCount,
                    knockingList,
                    KnockListType.Knocking,
                    "knocking"
                  )}
                  {renderStatItem(
                    "LockedIn",
                    lockedInCount,
                    lockedInList,
                    KnockListType.LockedIn,
                    "lockedIn"
                  )}
                </ThemedView>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.profileInfoSection}>
              {user.bio && (
                <ThemedText
                  type="default"
                  style={[styles.bio, { color: colors.text }]}
                >
                  {user.bio}
                </ThemedText>
              )}
              {currentMood && (
                <ThemedText
                  type="default"
                  style={[styles.moodDescription, { color: colors.textDim }]}
                >
                  {currentMood.description}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/profile/edit-profile")}
              >
                <ThemedText
                  style={[
                    styles.primaryActionButtonText,
                    { color: colors.text },
                  ]}
                >
                  Edit Profile
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setShowQRModal(true)}
              >
                <ThemedText
                  style={[
                    styles.secondaryActionButtonText,
                    { color: colors.text },
                  ]}
                >
                  Share Profile
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionButton,
                  {
                    borderColor: colors.border,
                    justifyContent: "center",
                    flex: 0,
                  },
                ]}
                onPress={() => setShowWordleModal(true)}
              >
                <MaterialCommunityIcons
                  name="gamepad-variant-outline"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.tabBarContainer}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab("posts")}
            >
              <Ionicons
                name="grid"
                size={22}
                color={activeTab === "posts" ? colors.primary : colors.textDim}
              />
              {activeTab === "posts" && (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab("saved")}
            >
              <Ionicons
                name="bookmark"
                size={22}
                color={activeTab === "saved" ? colors.primary : colors.textDim}
              />
              {activeTab === "saved" && (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.postsSection}>
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : postsForGrid.length > 0 ? (
              <PostGrid posts={postsForGrid} onPressPost={handlePressPost} />
            ) : (
              <ThemedView style={styles.noPostsContainer}>
                <View
                  style={[styles.noPostsIcon, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={40}
                    color={colors.textDim}
                  />
                </View>
                <ThemedText
                  style={[styles.noPostsText, { color: colors.text }]}
                >
                  {activeTab === "posts" ? "No posts yet" : "No saved posts"}
                </ThemedText>
                <ThemedText
                  style={[styles.noPostsSubtext, { color: colors.textDim }]}
                >
                  {activeTab === "posts"
                    ? "Share photos and videos to see them here"
                    : "Save photos and videos to see them here"}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedScrollView>
      </ThemedSafeArea>

      <MoodStatusModal
        visible={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onMoodSelect={handleMoodSelect}
        userProfileImage={
          selectedAvatar?.uri ||
          user.profileImage ||
          "https://via.placeholder.com/150"
        }
      />

      <ThemedModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        fullHeight={true}
      >
        <ThemedView style={styles.avatarModalContent}>
          <ThemedView style={styles.avatarModalHeader}>
            <TouchableOpacity
              onPress={() => setShowAvatarModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText
              type="subtitle"
              style={[styles.avatarModalTitle, { color: colors.text }]}
            >
              Choose Your Avatar
            </ThemedText>
            <View style={styles.modalPlaceholder} />
          </ThemedView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.avatarScroll}
          >
            {PRESET_AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarOption,
                  selectedAvatar?.id === avatar.id && {
                    borderColor: colors.primary,
                    borderWidth: 3,
                  },
                ]}
                onPress={() => handleAvatarSelect(avatar)}
              >
                <UserAvatar imageUri={avatar.uri} size={60} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </ThemedModal>

      <WordleGameModal
        visible={showWordleModal}
        onClose={() => setShowWordleModal(false)}
      />
      <QRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        username={user.firstName + user.lastName}
      />

      <ThemedModal
        visible={showMainModal}
        onClose={() => setShowMainModal(false)}
      >
        <ThemedView style={[styles.mainModal, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.modalItem} onPress={() => {}}>
            <UserAvatar imageUri={user.profileImage} size={42} />
            <ThemedView style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: colors.textSecondary }}
              >
                {user.firstName} {user.lastName}
              </ThemedText>
            </ThemedView>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <ThemedView
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              setShowMainModal(false);
              setShowAddAccountModal(true);
            }}
          >
            <ThemedView
              style={[
                styles.iconCircle,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.textSecondary,
                },
              ]}
            >
              <Ionicons name="add" size={28} color={colors.textSecondary} />
            </ThemedView>
            <ThemedText
              type="defaultSemiBold"
              style={{ marginLeft: 10, color: colors.textSecondary }}
            >
              Add FriendZone Account
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView
          style={{
            marginTop: 20,
            marginBottom: Platform.OS === "ios" ? 10 : 40,
          }}
        >
          <Button
            title="Sign Out"
            onPress={() => {
              setShowMainModal(false);
              setShowLogoutConfirmModal(true);
            }}
          />
        </ThemedView>
      </ThemedModal>

      <ThemedModal
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalItemCentered, { borderColor: colors.border }]}
          onPress={() => {
            setShowAddAccountModal(false);
            setAuthMode("login");
            setShowAuthFlowModal(true);
          }}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ color: colors.textSecondary }}
          >
            Login to existing account
          </ThemedText>
        </TouchableOpacity>

        <ThemedView
          style={[styles.divider, { backgroundColor: colors.border }]}
        />

        <TouchableOpacity
          style={[styles.modalItemCentered, { borderColor: colors.border }]}
          onPress={() => {
            setShowAddAccountModal(false);
            setAuthMode("signup");
            setShowAuthFlowModal(true);
          }}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{
              color: colors.textSecondary,
              marginBottom: Platform.OS === "ios" ? 20 : 40,
            }}
          >
            Create a new account
          </ThemedText>
        </TouchableOpacity>
      </ThemedModal>

      <ThemedModal
        visible={showAuthFlowModal}
        onClose={closeAuthFlowModal}
        fullHeight={true}
        containerStyle={styles.authModalContainerStyle}
      >
        <AuthModalContent
          initialMode={authMode}
          onCloseModal={closeAuthFlowModal}
        />
      </ThemedModal>

      <ThemedModal
        visible={showLogoutConfirmModal}
        onClose={() => setShowLogoutConfirmModal(false)}
      >
        <ThemedText
          type="subtitle"
          style={{
            textAlign: "center",
            marginBottom: 25,
            color: colors.textSecondary,
          }}
        >
          Are you sure you want to sign out?
        </ThemedText>

        <ThemedView style={styles.buttonRow}>
          <Button
            title="Cancel"
            onPress={() => setShowLogoutConfirmModal(false)}
            style={[styles.button, { marginRight: 8 }]}
          />
          <Button title="OK" onPress={signOut} style={styles.button} />
        </ThemedView>
      </ThemedModal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaTransparentBg: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  scrollView: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerButton: {
    marginLeft: 15,
    padding: 2,
  },
  profileHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginRight: 10,
  },
  statusLabelContainer: {
    position: "absolute",
    top: -22,
    alignItems: "flex-start",
    zIndex: 10,
  },
  statusBubble: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  bubbleTip: {
    width: 20,
    height: 24,
    borderRadius: 9,
    marginTop: -18,
    marginLeft: 14,
    zIndex: -9,
  },
  bubbleDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    marginTop: 1,
    marginLeft: 26,
  },
  avatarContainer: {
    position: "relative",
    alignItems: "center",
  },
  plusIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  userInfoContainer: {
    flex: 1,
    paddingTop: 8,
    paddingLeft: 20,
  },
  usernameRow: {
    alignItems: "flex-start",
    marginBottom: 12,
  },
  profileUsername: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "400",
  },
  profileInfoSection: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  moodDescription: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  primaryActionButton: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryActionButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flex: 1,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabBarContainer: {
    flexDirection: "row",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: 50,
    borderRadius: 1,
  },
  postsSection: {
    flex: 1,
    paddingTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  noPostsContainer: {
    flex: 0.8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noPostsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noPostsText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  noPostsSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalCloseButton: {
    padding: 8,
    margin: -8,
  },
  modalPlaceholder: {
    width: 24,
  },
  avatarModalContent: {
    // maxHeight: height * 0.6,
  },
  avatarModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  avatarModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  avatarScroll: {
    marginBottom: 20,
  },
  avatarOption: {
    marginRight: 15,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "transparent",
  },
  mainModal: {
    borderWidth: 1,
    borderRadius: 14,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  modalItemCentered: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  authModalContainerStyle: {
    marginTop: 120,
    flexGrow: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: Platform.OS === "ios" ? 20 : 40,
  },
  button: {
    flex: 1,
  },
});
