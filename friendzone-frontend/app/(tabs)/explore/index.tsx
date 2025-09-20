import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { getUserStatusLabel } from "@/constants/Functions";
import KnockService, {
  KnockRequest,
  UserSearchResult,
} from "@/services/knockService";
import ChatService from "@/services/ChatService";
import UserProfileCard from "@/components/UserProfileCard";
import UserSearchLoader from "@/components/UserSearchLoader";
import CategoryCircle from "@/components/CategoryCircle";
import PostGrid, { PostItem } from "@/components/PostGrid";
import { useAuth } from "@/context/AuthContext";
import ThemedScrollView from "@/components/ThemedScrollView";
import CategoryLoader from "@/components/CategoryLoader";
import PostGridLoader from "@/components/PostgridLoader";
import { useSocket } from "@/context/SocketContext";

interface ExploreDisplayUser {
  id: string;
  username: string;
  avatar: string | null;
  status?: "pending" | "lockedIn" | "onesidedlock" | "declined";
  relationToMe?: "knocker" | "knocked" | "lockedIn" | "stranger";
  isActionLoading?: boolean;
  knockId?: string;
}

const categoriesData = [
  {
    id: "profileBased",
    label: "Profiles",
    mainImage:
      "https://i.pinimg.com/474x/26/f0/29/26f029e054e73facfb522b2abed7e49d.jpg",
    avatars: [
      "https://randomuser.me/api/portraits/women/11.jpg",
      "https://randomuser.me/api/portraits/men/21.jpg",
      "https://randomuser.me/api/portraits/women/31.jpg",
      "https://randomuser.me/api/portraits/men/41.jpg",
    ],
  },
  {
    id: "locationBased",
    label: "Nearby",
    mainImage:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5dQyKA-MZ5CYCviWJr80rng1OHJcn5jAaSw&s",
    avatars: [
      "https://randomuser.me/api/portraits/men/51.jpg",
      "https://randomuser.me/api/portraits/women/61.jpg",
    ],
  },
  {
    id: "birthdays",
    label: "Birthdays",
    mainImage:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCIyUj-DZtOHXgViANsPt1M4VtXowny1FzlQ&s",
    avatars: [
      "https://randomuser.me/api/portraits/women/71.jpg",
      "https://randomuser.me/api/portraits/men/81.jpg",
    ],
  },
];

const postsData: PostItem[] = [
  {
    id: "1",
    thumbnail: "https://randomuser.me/api/portraits/women/71.jpg",
    type: "image",
  },
  {
    id: "2",
    thumbnail: "https://randomuser.me/api/portraits/men/81.jpg",
    type: "video",
  },
  {
    id: "3",
    thumbnail: "https://randomuser.me/api/portraits/women/61.jpg",
    type: "image",
  },
  {
    id: "4",
    thumbnail: "https://randomuser.me/api/portraits/men/51.jpg",
    type: "image",
  },
  {
    id: "5",
    thumbnail: "https://randomuser.me/api/portraits/women/11.jpg",
    type: "video",
  },
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const searchQueryRef = useRef("");
  const usersRef = useRef<ExploreDisplayUser[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<ExploreDisplayUser[]>([]);
  const textInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      console.log("➡️ Screen focused. Restoring state.");
      setSearchQuery(searchQueryRef.current);
      setUsers(usersRef.current);
      setInitialLoading(false);

      return () => {
        console.log("⬅️ Screen blurred.");
      };
    }, [])
  );

  const determineUserRelation = useCallback(
    (
      allUsers: UserSearchResult[],
      knockers: KnockRequest[],
      knocked: KnockRequest[],
      currentUserId: string
    ) => {
      const usersMap = new Map<string, ExploreDisplayUser>();

      allUsers.forEach((u) => {
        if (u._id === currentUserId) return;
        usersMap.set(u._id, {
          id: u._id,
          username: `${u.firstName} ${u.lastName || ""}`.trim(),
          avatar: u.profileImage,
          relationToMe: "stranger",
          isActionLoading: false,
        });
      });

      knockers.forEach((k) => {
        if (k.user.id === currentUserId) return;
        const existing = usersMap.get(k.user.id);
        if (existing) {
          usersMap.set(k.user.id, {
            ...existing,
            status: k.status,
            relationToMe: "knocker",
            knockId: k.id,
          });
        }
      });

      knocked.forEach((k) => {
        if (k.user.id === currentUserId) return;
        const existing = usersMap.get(k.user.id);
        if (existing) {
          if (k.status === "lockedIn") {
            usersMap.set(k.user.id, {
              ...existing,
              status: k.status,
              relationToMe: "lockedIn",
              knockId: existing.knockId || k.id,
            });
          } else if (existing.relationToMe !== "knocker") {
            usersMap.set(k.user.id, {
              ...existing,
              status: k.status,
              relationToMe: "knocked",
              knockId: k.id,
            });
          }
        }
      });

      return Array.from(usersMap.values()).filter(
        (u) => u.id !== currentUserId
      );
    },
    []
  );

  const fetchUsers = useCallback(
    async (query: string) => {
      if (!accessToken || !user?._id) {
        setIsSearching(false);
        setRefreshing(false);
        return;
      }
      console.log("🌐 Fetching users for query:", query);
      try {
        const [searchResults, knockersResponse, knockedResponse] =
          await Promise.all([
            KnockService.searchUsers(accessToken, query),
            KnockService.getKnockers(accessToken),
            KnockService.getKnocked(accessToken),
          ]);

        const processedUsers = determineUserRelation(
          searchResults,
          knockersResponse,
          knockedResponse,
          user._id
        );
        usersRef.current = processedUsers;
        setUsers(processedUsers);
      } catch (error) {
        console.error("❌ Failed to fetch users:", error);
        console.log("error", "Failed to load users.");
        usersRef.current = [];
        setUsers([]);
      } finally {
        setIsSearching(false);
        setRefreshing(false);
      }
    },
    [accessToken, user?._id, determineUserRelation]
  );

  useEffect(() => {
    if (!socket || !accessToken || !user) {
      return;
    }

    const handleStatusChange = async () => {
      console.log(
        `[ExploreScreen] Received knockStatusChanged. Re-fetching users.`
      );
      if (searchQueryRef.current.length > 0) {
        await fetchUsers(searchQueryRef.current);
      }
    };

    socket.on("knockStatusChanged", handleStatusChange);

    return () => {
      socket.off("knockStatusChanged", handleStatusChange);
    };
  }, [socket, accessToken, user, fetchUsers]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      searchQueryRef.current = text;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length === 0) {
        usersRef.current = [];
        setUsers([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        await fetchUsers(text);
      }, 500);
    },
    [fetchUsers]
  );

  const handleClearSearch = () => {
    console.log("🧹 Clearing search query and results.");
    setSearchQuery("");
    searchQueryRef.current = "";
    usersRef.current = [];
    setUsers([]);
    setIsSearching(false);
    textInputRef.current?.focus();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (searchQuery.length > 0) {
      fetchUsers(searchQuery);
    } else {
      setTimeout(() => setRefreshing(false), 1500);
    }
  }, [fetchUsers, searchQuery]);

  const handleUserAction = async (targetUser: ExploreDisplayUser) => {
    if (!accessToken || actionLoadingId) {
      return;
    }

    setActionLoadingId(targetUser.id);
    console.log("➡️ Action button pressed. Processing action.");

    try {
      if (targetUser.relationToMe === "lockedIn") {
        const chatResponse = await ChatService.createChat(
          accessToken,
          targetUser.id
        );
        router.push({
          pathname: "/(chat)/[id]",
          params: {
            id: chatResponse.chatId,
            chatName: targetUser.username,
            chatAvatar: targetUser.avatar || "",
            isRestricted: String(chatResponse.isRestricted),
            firstMessageByKnockerId: chatResponse.firstMessageByKnockerId || "",
          },
        });
      } else if (targetUser.relationToMe === "knocker") {
        if (targetUser.knockId) {
          await KnockService.knockBack(targetUser.knockId, accessToken);
          console.log(
            "success",
            `You knocked back ${targetUser.username}! You are now LockedIn!`
          );
        } else {
          console.log("error", "Knock ID not found for knock back action.");
        }
      } else if (targetUser.relationToMe === "stranger") {
        await KnockService.knockUser(targetUser.id, accessToken);
        console.log("success", `Knock sent to ${targetUser.username}!`);
      }
      await fetchUsers(searchQueryRef.current);
    } catch (error: any) {
      console.error("❌ Action failed:", error);
      console.log(
        "error",
        error.response?.data?.message || "Failed to perform action."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCardPress = (item: ExploreDisplayUser) => {
    console.log("➡️ User card tapped. Navigating to profile.");
    router.push(`/profile/${item.id}`);
  };

  const renderUserItem = ({ item }: { item: ExploreDisplayUser }) => {
    let buttonText = "";
    let buttonBackgroundColor;
    let buttonBorderColor;
    let buttonTextColor;
    let isDisabled = actionLoadingId === item.id;

    switch (item.relationToMe) {
      case "lockedIn":
        buttonText = "Message";
        buttonBackgroundColor = colors.buttonBackgroundSecondary;
        buttonBorderColor = colors.border;
        buttonTextColor = colors.text;
        break;
      case "knocker":
        buttonText = "Knock Back";
        buttonBackgroundColor = colors.primary;
        buttonBorderColor = colors.primary;
        buttonTextColor = colors.buttonText;
        break;
      case "knocked":
        buttonText = "Knocked";
        buttonBackgroundColor = colors.primary;
        buttonBorderColor = colors.primary;
        buttonTextColor = colors.buttonText;
        isDisabled = true;
        break;
      case "stranger":
      default:
        buttonText = "Knock";
        buttonBackgroundColor = colors.buttonBackgroundSecondary;
        buttonBorderColor = colors.border;
        buttonTextColor = colors.text;
        break;
    }

    if (item.relationToMe === "knocked" && item.status === "pending") {
      buttonText = "Requested";
      buttonBackgroundColor = colors.buttonBackgroundSecondary;
      buttonBorderColor = colors.border;
      buttonTextColor = colors.textDim;
      isDisabled = true;
    }

    const description = getUserStatusLabel(item.status, item.relationToMe);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleCardPress(item)}
      >
        <UserProfileCard
          userId={item.id}
          username={item.username}
          avatar={item.avatar}
          description={description}
          isLoading={actionLoadingId === item.id}
          rightActionComponent={
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: buttonBackgroundColor,
                  borderColor: buttonBorderColor,
                  opacity: isDisabled ? 0.6 : 1,
                },
              ]}
              onPress={() => handleUserAction(item)}
              disabled={isDisabled || actionLoadingId === item.id}
            >
              <ThemedText
                style={[styles.actionButtonText, { color: buttonTextColor }]}
              >
                {buttonText}
              </ThemedText>
            </TouchableOpacity>
          }
        />
      </TouchableOpacity>
    );
  };

  const showSearchLoader = isSearching && users.length === 0;

  const renderContent = () => {
    if (searchQuery.length > 0) {
      if (showSearchLoader) {
        return (
          <ThemedView
            style={[styles.loaderContainer, { paddingHorizontal: 15 }]}
          >
            {[...Array(5)].map((_, i) => (
              <UserSearchLoader key={i} />
            ))}
          </ThemedView>
        );
      }
      return (
        <FlatList
          data={users}
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
                No users found matching your search.
              </ThemedText>
            </ThemedView>
          )}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      );
    } else {
      if (initialLoading || refreshing) {
        return (
          <ThemedView style={styles.loaderContainer}>
            <CategoryLoader />
            <ThemedView style={styles.postGridSection}>
              <PostGridLoader />
            </ThemedView>
          </ThemedView>
        );
      }

      return (
        <ThemedScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-start",
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <ThemedView style={{ marginBottom: 16 }}>
            <FlatList
              data={categoriesData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CategoryCircle
                  label={item.label}
                  mainImage={item.mainImage}
                  avatars={item.avatars}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/explore/CategoryDetailScreen",
                      params: { categoryId: item.id, categoryName: item.label },
                    })
                  }
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
              }}
            />
          </ThemedView>

          <ThemedView style={styles.postGridSection}>
            <PostGrid
              posts={postsData}
              onPressPost={(item) => console.log("Tapped post:", item.id)}
            />
          </ThemedView>
        </ThemedScrollView>
      );
    }
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ThemedView
              style={[
                styles.searchContainer,
                {
                  backgroundColor: colors.buttonBackgroundSecondary,
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
                ref={textInputRef}
                style={[
                  styles.searchInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.buttonBackgroundSecondary,
                  },
                ]}
                placeholder="Search users"
                placeholderTextColor={colors.textDim}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  style={styles.clearIcon}
                >
                  <Feather name="x" size={20} color={colors.textDim} />
                </TouchableOpacity>
              )}
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.searchLoading}
                />
              )}
            </ThemedView>
            {renderContent()}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: "transparent" },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  content: { flex: 1 },
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
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: "100%", fontSize: 16 },
  searchLoading: { marginLeft: 10 },
  listContent: { flexGrow: 1, paddingHorizontal: 10 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 15 },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  loaderContainer: { flex: 1 },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 30,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonText: { fontSize: 14, fontWeight: "bold" },
  clearIcon: {
    marginLeft: 10,
  },
  postGridSection: {
    paddingHorizontal: 2,
    paddingBottom: Platform.OS === "ios" ? 60 : 0,
  },
});
