import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import ChatService from "@/services/ChatService";
import { useAuth } from "@/context/AuthContext";
import {
  sortUsersByStatusAndRelation,
  getUserAvatar,
  getUserStatusLabel,
  showToast,
} from "@/constants/Functions";
import KnockService, { KnockRequest } from "@/services/knockService";
import UserProfileCard from "@/components/UserProfileCard";
import UserSearchLoader from "@/components/UserSearchLoader";
import { DisplayUser } from "@/types/chat.type";

const screenWidth = Dimensions.get('window').width;
const LIST_ITEM_HORIZONTAL_PADDING = 10;

export default function NewChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingChatId, setCreatingChatId] = useState<string | null>(null);

  const listItemWidth = screenWidth - (LIST_ITEM_HORIZONTAL_PADDING * 2);

  const getRelationAndStatus = useCallback(
    (targetUserId: string, knockers: KnockRequest[], knocked: KnockRequest[], currentUserId: string) => {
      let relation: DisplayUser['relationToMe'] = "stranger";
      let status: DisplayUser['status'] = undefined;

      const knockReceived = knockers.find(k => k.user.id === targetUserId);
      if (knockReceived) {
        relation = "knocker";
        status = knockReceived.status;
      }

      const knockSent = knocked.find(k => k.user.id === targetUserId);
      if (knockSent) {
        if (relation === "knocker" && knockSent.status === "lockedIn") {
          relation = "lockedIn";
          status = "lockedIn";
        } else if (relation === "stranger") {
          relation = "knocked";
          status = knockSent.status;
        }
      }

      return { relation, status };
    },
    []
  );

  const fetchInitialUsers = useCallback(async () => {
    if (!accessToken || !user?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [knockersResponse, knockedResponse] = await Promise.all([
        KnockService.getKnockers(accessToken),
        KnockService.getKnocked(accessToken),
      ]);

      const uniqueUsersMap = new Map<string, DisplayUser>();

      knockersResponse.forEach((k) => {
        if (k.user.id === user._id) return;
        uniqueUsersMap.set(k.user.id, {
          id: k.user.id,
          username: k.user.username,
          avatar: k.user.avatar,
          status: k.status,
          relationToMe: "knocker",
          isCreatingChat: false,
        });
      });

      knockedResponse.forEach((k) => {
        if (k.user.id === user._id) return;
        const existing = uniqueUsersMap.get(k.user.id);
        if (existing) {
          if (existing.relationToMe === "knocker" && k.status === "lockedIn") {
            uniqueUsersMap.set(k.user.id, {
              ...existing,
              status: k.status,
              relationToMe: "lockedIn",
            });
          }
        } else {
          uniqueUsersMap.set(k.user.id, {
            id: k.user.id,
            username: k.user.username,
            avatar: k.user.avatar,
            status: k.status,
            relationToMe: "knocked",
            isCreatingChat: false,
          });
        }
      });

      const sortedUsers = Array.from(uniqueUsersMap.values()).sort(
        sortUsersByStatusAndRelation
      );
      setUsers(sortedUsers);
    } catch (error: any) {
      console.error("Failed to fetch potential chat users:", error);
      showToast("error", "Failed to load users for new chat.");
      setUsers([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, user?._id]); // Removed mapAndEnrichUsers from dependencies as it's not used directly here

  useEffect(() => {
    fetchInitialUsers();
  }, [fetchInitialUsers]);

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleSearch = useCallback(
    async (text: string) => {
      if (!accessToken || !user?._id) return;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length === 0) {
        setIsSearching(false);
        fetchInitialUsers();
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
            });

          setUsers(processedSearchResults);
        } catch (error) {
          console.error("Error searching users:", error);
          showToast("error", "Failed to search users.");
          setUsers([]);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    },
    [accessToken, user?._id, fetchInitialUsers, getRelationAndStatus]
  );

  const onChangeSearch = (text: string) => {
    setSearchQuery(text);
    handleSearch(text);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery("");
    fetchInitialUsers();
  }, [fetchInitialUsers]);

  const handleCreateChat = async (
    recipientId: string,
    recipientName: string,
    recipientAvatar: string | null
  ) => {
    if (!accessToken) {
      showToast("error", "You are not authenticated.");
      return;
    }
    if (creatingChatId) return;

    setCreatingChatId(recipientId);
    try {
      const response = await ChatService.createChat(accessToken, recipientId);
      router.replace({
        pathname: "/(chat)/[id]",
        params: {
          id: response.chatId,
          chatName: recipientName,
          chatAvatar: getUserAvatar({ avatar: recipientAvatar, username: recipientName }),
          isNewChatFromCreation: "true",
          isRestricted: String(response.isRestricted),
          firstMessageByKnockerId: response.firstMessageByKnockerId || "",
        },
      });
    } catch (error: any) {
      console.error("Failed to create chat:", error);
      showToast(
        "error",
        error.response?.data?.message || "Failed to create chat. Please try again."
      );
    } finally {
      setCreatingChatId(null);
    }
  };

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
        onPress={() =>
          handleCreateChat(item.id, item.username, item.avatar)
        }
        isLoading={creatingChatId === item.id}
        rightActionComponent={
          <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
        }
      />
    );
  };

  const showLoader = (isLoading && searchQuery.length === 0) || (isSearching && users.length === 0);

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title="Start a New Chat"
          showBottomBorder={true}
        />
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  backgroundColor: colors.buttonBackgroundSecondary,
                },
              ]}
              placeholder="Search by name"
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={onChangeSearch}
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
          </ThemedView>

          {showLoader ? (
            <ThemedView style={styles.loaderContainer}>
              {[...Array(5)].map((_, i) => (
                <UserSearchLoader key={i} />
              ))}
            </ThemedView>
          ) : (
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
                    {searchQuery.length > 0
                      ? "No users found matching your search."
                      : "No eligible users to chat with yet. Connect with someone first!"}
                  </ThemedText>
                </ThemedView>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </KeyboardAvoidingView>
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
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
  fullScreenLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  searchLoading: {
    marginLeft: 10,
  },
});