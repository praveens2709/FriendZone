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
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import ChatService from "@/services/ChatService";
import { useAuth } from "@/context/AuthContext";
import {
  sortUsersByStatusAndRelation,
  getUserStatusLabel,
} from "@/constants/Functions";
import KnockService, { KnockRequest } from "@/services/knockService";
import UserProfileCard from "@/components/UserProfileCard";
import UserSearchLoader from "@/components/UserSearchLoader";
import { DisplayUser } from "@/types/chat.type";
import Button from "@/components/Button";

const screenWidth = Dimensions.get("window").width;
const LIST_ITEM_HORIZONTAL_PADDING = 10;

interface SelectedUser {
  id: string;
  username: string;
  avatar: string | null;
}

export default function GroupChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [groupName, setGroupName] = useState("");

  const listItemWidth = screenWidth - LIST_ITEM_HORIZONTAL_PADDING * 2;

  const getRelationAndStatus = useCallback(
    (
      targetUserId: string,
      knockers: KnockRequest[],
      knocked: KnockRequest[],
      currentUserId: string
    ) => {
      let relation: DisplayUser["relationToMe"] = "stranger";
      let status: DisplayUser["status"] = undefined;

      const knockReceived = knockers.find((k) => k.user.id === targetUserId);
      if (knockReceived) {
        relation = "knocker";
        status = knockReceived.status;
      }

      const knockSent = knocked.find((k) => k.user.id === targetUserId);
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
      console.log("error", "Failed to load users for group chat.");
      setUsers([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, user?._id]);

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
          const [searchResults, knockersResponse, knockedResponse] =
            await Promise.all([
              KnockService.searchUsers(accessToken, text),
              KnockService.getKnockers(accessToken),
              KnockService.getKnocked(accessToken),
            ]);

          const processedSearchResults: DisplayUser[] = searchResults
            .filter((u) => u._id !== user._id)
            .map((u) => {
              const { relation, status } = getRelationAndStatus(
                u._id,
                knockersResponse,
                knockedResponse,
                user._id
              );
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
          console.log("error", "Failed to search users.");
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
    setSelectedUsers([]);
    setGroupName("");
    fetchInitialUsers();
  }, [fetchInitialUsers]);

  const handleUserSelection = (item: DisplayUser) => {
    const isSelected = selectedUsers.find((u) => u.id === item.id);

    if (isSelected) {
      // Deselect user
      setSelectedUsers((prev) => prev.filter((u) => u.id !== item.id));
    } else {
      // Select user
      const newSelectedUser: SelectedUser = {
        id: item.id,
        username: item.username,
        avatar: item.avatar,
      };
      setSelectedUsers((prev) => [...prev, newSelectedUser]);
    }
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleCreateGroupChat = async () => {
    if (!accessToken || selectedUsers.length < 2) {
      console.log("error", "Please select at least 2 users for a group chat.");
      return;
    }

    if (!groupName.trim()) {
      console.log("error", "Please enter a group name.");
      return;
    }

    if (isCreatingChat) return;

    setIsCreatingChat(true);
    try {
      const participantIds = selectedUsers.map((u) => u.id);
      const response = await ChatService.createGroupChat(
        accessToken,
        participantIds,
        groupName.trim()
      );
      router.replace({
        pathname: "/(chat)/[id]",
        params: {
          id: response.chatId,
          chatName: groupName.trim(),
          chatAvatar: "",
          isNewChatFromCreation: "true",
          isRestricted: "false",
          firstMessageByKnockerId: "",
        },
      });
    } catch (error: any) {
      console.error("Failed to create group chat:", error);
      console.log(
        "error",
        error.response?.data?.message ||
          "Failed to create group chat. Please try again."
      );
    } finally {
      setIsCreatingChat(false);
    }
  };

  const clearSelection = () => {
    setSelectedUsers([]);
    setGroupName("");
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((u) => u.id === userId);
  };

  const renderSelectedUser = ({ item }: { item: SelectedUser }) => (
    <ThemedView
      style={[
        styles.selectedUserChip,
        { backgroundColor: colors.buttonBackgroundSecondary },
      ]}
    >
      <ThemedView style={styles.selectedUserContent}>
        <ThemedText
          style={[styles.selectedUserName, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.username}
        </ThemedText>
        <TouchableOpacity
          onPress={() => removeSelectedUser(item.id)}
          style={styles.removeButton}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textDim} />
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderUserItem = ({ item }: { item: DisplayUser }) => {
    const description =
      item.status && item.relationToMe
        ? getUserStatusLabel(item.status, item.relationToMe)
        : "Stranger";

    const selected = isUserSelected(item.id);

    return (
      <UserProfileCard
        userId={item.id}
        username={item.username}
        avatar={item.avatar}
        description={description}
        onPress={() => handleUserSelection(item)}
        isLoading={false}
        rightActionComponent={
          <Ionicons
            name={selected ? "checkmark-circle" : "chatbubble-outline"}
            size={24}
            color={selected ? colors.primary : colors.textDim}
          />
        }
      />
    );
  };

  const showLoader =
    (isLoading && searchQuery.length === 0) ||
    (isSearching && users.length === 0);

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title="New group chat"
          rightContent1={
            selectedUsers.length > 0 ? (
              <TouchableOpacity onPress={clearSelection}>
                <ThemedText style={[styles.clearText, { color: colors.text }]}>
                  Clear
                </ThemedText>
              </TouchableOpacity>
            ) : null
          }
          showBottomBorder={true}
        />
        <ThemedText style={[styles.descriptionText, { color: colors.textDim }]}>
          Start your group chat by selecting at least 2 people and entering a
          group name.
        </ThemedText>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Group Name Input */}
          <ThemedView style={styles.groupNameSection}>
            <ThemedView
              style={[
                styles.groupNameInputContainer,
                { borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="group"
                size={20}
                color={colors.textDim}
                style={styles.groupIcon}
              />
              <TextInput
                style={[
                  styles.groupNameInput,
                  {
                    color: colors.text,
                  },
                ]}
                placeholder="Enter group name"
                placeholderTextColor={colors.textDim}
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
            </ThemedView>
          </ThemedView>

          {/* Selected Users Section */}
          {selectedUsers.length > 0 && (
            <ThemedView style={styles.selectedUsersSection}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                Selected ({selectedUsers.length})
              </ThemedText>
              <FlatList
                data={selectedUsers}
                renderItem={renderSelectedUser}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </ThemedView>
          )}

          {/* Search Section */}
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

          {/* Users List */}
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
                      : "No eligible users to add to group. Connect with someone first!"}
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

          {/* Create Group Button */}
          {selectedUsers.length >= 2 && groupName.trim() && (
            <ThemedView style={styles.actionButtonContainer}>
              <Button
                onPress={handleCreateGroupChat}
                disabled={isCreatingChat}
                style={[
                  styles.actionButton,
                  { opacity: isCreatingChat ? 0.7 : 1 },
                ]}
                textStyle={styles.actionButtonText}
              >
                {isCreatingChat ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="people" size={20} color="white" />
                    <ThemedText style={styles.actionButtonText}>
                      Create Group
                    </ThemedText>
                  </>
                )}
              </Button>
            </ThemedView>
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
  clearText: {
    fontSize: 16,
    fontWeight: "500",
  },
  descriptionText: {
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 10,
    fontSize: 14,
  },
  groupNameSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  groupNameInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 45,
    borderBottomWidth: 1,
  },
  groupIcon: {
    marginRight: 10,
  },
  groupNameInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  selectedUsersSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectedUserChip: {
    borderRadius: 20,
    marginRight: 8,
    minWidth: 100,
    maxWidth: 160,
  },
  selectedUserContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  selectedUserName: {
    fontSize: 14,
    flex: 1,
  },
  removeButton: {
    marginLeft: 2,
    flexShrink: 0,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 100,
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
  actionButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "transparent",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
