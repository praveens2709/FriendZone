import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { useAuth } from "@/context/AuthContext";
import { getUserAvatar, showToast, getUserStatusLabel } from "@/constants/Functions";
import KnockService, { KnockRequest, UserSearchResult } from "@/services/knockService";
import ChatService from "@/services/ChatService";
import UserProfileCard from "@/components/UserProfileCard";
import UserSearchLoader from "@/components/UserSearchLoader";

interface ExploreDisplayUser {
  id: string;
  username: string;
  avatar: string | null;
  status?: "pending" | "lockedIn" | "onesidedlock" | "declined";
  relationToMe?: "knocker" | "knocked" | "lockedIn" | "stranger";
  isActionLoading?: boolean;
  knockId?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<ExploreDisplayUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const determineUserRelation = useCallback(
    (allUsers: UserSearchResult[], knockers: KnockRequest[], knocked: KnockRequest[], currentUserId: string) => {
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
          if (existing.relationToMe === "knocker" && k.status === "lockedIn") {
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

      return Array.from(usersMap.values()).filter(u => u.id !== currentUserId);
    },
    []
  );

  const fetchUsers = useCallback(
    async (query: string) => {
      if (!accessToken || !user?._id) {
        setIsSearching(false);
        return;
      }

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
        setUsers(processedUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        showToast("error", "Failed to load users.");
        setUsers([]);
      } finally {
        setIsSearching(false);
        setRefreshing(false);
      }
    },
    [accessToken, user?._id, determineUserRelation]
  );

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (text.length === 0) {
        setUsers([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        fetchUsers(text);
      }, 500);
    },
    [fetchUsers]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery("");
    setUsers([]);
    fetchUsers("");
  }, [fetchUsers]);

  const handleUserAction = async (targetUser: ExploreDisplayUser) => {
    if (!accessToken || actionLoadingId) {
      return;
    }

    setActionLoadingId(targetUser.id);

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
            chatAvatar: getUserAvatar(targetUser),
            isRestricted: String(chatResponse.isRestricted),
            firstMessageByKnockerId: chatResponse.firstMessageByKnockerId || "",
          },
        });
      } else if (targetUser.relationToMe === "knocker") {
        if (targetUser.knockId) {
             await KnockService.knockBack(targetUser.knockId, accessToken);
             showToast("success", `You knocked back ${targetUser.username}! You are now LockedIn!`);
        } else {
             showToast("error", "Knock ID not found for knock back action.");
        }
      } else if (targetUser.relationToMe === "stranger") {
        await KnockService.knockUser(targetUser.id, accessToken);
        showToast("success", `Knock sent to ${targetUser.username}!`);
      }
      await fetchUsers(searchQuery);
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
        buttonTextColor = colors.buttonText;
        break;
      case "knocker":
        buttonText = "Knock Back";
        buttonBackgroundColor = colors.primary;
        buttonBorderColor = colors.border;
        buttonTextColor = colors.text;
        break;
      case "knocked":
        buttonText = "Knocking";
        buttonBackgroundColor = colors.primary;
        buttonBorderColor = colors.border;
        buttonTextColor = colors.text;
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

    const description = getUserStatusLabel(item.status, item.relationToMe);

    return (
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
            <ThemedText style={[styles.actionButtonText, { color: buttonTextColor }]}>
                {buttonText}
            </ThemedText>
          </TouchableOpacity>
        }
      />
    );
  };

  const showLoader = isSearching && users.length === 0;

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
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
              placeholder="Search users"
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={handleSearch}
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
                      : "Start typing to search for users."}
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
  loaderContainer: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  backButton: {
    padding: 5,
  },
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
  actionButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});