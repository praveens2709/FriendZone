import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
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
import ChatService, {
  ChatPreviewResponse,
  GetChatsResponse,
} from "@/services/ChatService";
import {
  filterValidChats,
  safeFormatDate,
  sortChatsByTimestamp,
} from "@/constants/Functions";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import UserAvatar from "@/components/UserAvatar";

interface SocketChatPreviewUpdate extends ChatPreviewResponse {}

export default function ChatsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<ChatPreviewResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [typingChatIds, setTypingChatIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchChats = useCallback(
    async (pageNum: number, initialLoad: boolean = false) => {
      if (!accessToken) {
        if (initialLoad) setIsLoading(false);
        setRefreshing(false);
        return;
      }
      if (initialLoad && pageNum === 1) {
        setIsLoading(true);
      }
      try {
        const response: GetChatsResponse = await ChatService.getUserChats(
          accessToken,
          pageNum
        );
        const validChats = filterValidChats(response.chats);
        if (pageNum === 1) {
          setChats(validChats);
        } else {
          setChats((prevChats) => {
            const newChats = validChats.filter(
              (newChat) =>
                !prevChats.some((prevChat) => prevChat.id === newChat.id)
            );
            const combinedChats = [...prevChats, ...newChats];
            const sorted = combinedChats.sort(sortChatsByTimestamp);
            return sorted;
          });
        }
        setTotalPages(response.totalPages);
        setHasMoreChats(
          response.chats.length > 0 && pageNum < response.totalPages
        );
      } catch (error: any) {
        console.log("Error", "Failed to load chats. Please try again later.");
        setHasMoreChats(false);
      } finally {
        if (initialLoad && pageNum === 1) {
          setIsLoading(false);
        }
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    setChats([]);
    setPage(1);
    setTotalPages(1);
    setHasMoreChats(true);
    fetchChats(1, true);
  }, [accessToken, fetchChats]);

  useEffect(() => {
    if (socket) {
      const handleNewChatOrConfirmation = (
        newChatData: ChatPreviewResponse
      ) => {
        if (newChatData && newChatData.id) {
          setChats((prevChats) => {
            const existingChatIndex = prevChats.findIndex(
              (chat) => chat.id === newChatData.id
            );
            let updatedChats;
            if (existingChatIndex !== -1) {
              updatedChats = [...prevChats];
              updatedChats[existingChatIndex] = {
                ...prevChats[existingChatIndex],
                ...newChatData,
              };
            } else {
              updatedChats = [newChatData, ...prevChats];
            }
            const sorted = updatedChats.sort(sortChatsByTimestamp);
            return sorted;
          });
        }
      };

      const handleChatPreviewUpdate = (
        updatedChatData: SocketChatPreviewUpdate
      ) => {
        setChats((prevChats) => {
          const existingChatIndex = prevChats.findIndex(
            (chat) => chat.id === updatedChatData.id
          );

          if (existingChatIndex !== -1) {
            const newChatsArray = prevChats.map((chat) => {
              if (chat.id !== updatedChatData.id) return chat;
              const updatedChat = { ...chat };
              if (updatedChatData.lastMessage !== undefined) {
                if (
                  updatedChatData.lastMessage &&
                  typeof updatedChatData.lastMessage === "object" &&
                  "content" in updatedChatData.lastMessage &&
                  updatedChatData.lastMessage.content
                ) {
                  updatedChat.lastMessage = updatedChatData.lastMessage;
                } else if (updatedChatData.lastMessage === null) {
                  updatedChat.lastMessage = {
                    id: "empty",
                    senderId: null,
                    content: "No messages yet",
                    type: "text",
                    read: undefined,
                  };
                } else if (
                  typeof updatedChatData.lastMessage === "object" &&
                  "content" in updatedChatData.lastMessage &&
                  (!updatedChatData.lastMessage.content ||
                    updatedChatData.lastMessage.content === "No messages yet")
                ) {
                  updatedChat.lastMessage = updatedChatData.lastMessage;
                }
              }
              if (updatedChatData.timestamp !== undefined) {
                updatedChat.timestamp = updatedChatData.timestamp;
              }
              if (updatedChatData.unreadCount !== undefined) {
                updatedChat.unreadCount = updatedChatData.unreadCount;
              }
              if (updatedChatData.name !== undefined) {
                updatedChat.name = updatedChatData.name;
              }
              if (updatedChatData.avatar !== undefined) {
                updatedChat.avatar = updatedChatData.avatar;
              }
              if (updatedChatData.isRestricted !== undefined) {
                updatedChat.isRestricted = updatedChatData.isRestricted;
              }
              if (updatedChatData.firstMessageByKnockerId !== undefined) {
                updatedChat.firstMessageByKnockerId =
                  updatedChatData.firstMessageByKnockerId;
              }
              if (updatedChatData.isLockedIn !== undefined) {
                updatedChat.isLockedIn = updatedChatData.isLockedIn;
              }

              return updatedChat;
            });

            return newChatsArray.sort(sortChatsByTimestamp);
          } else {
            return [updatedChatData, ...prevChats].sort(sortChatsByTimestamp);
          }
        });
      };

      const handleMessagesRead = ({
        chatId,
        userId: readerId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (readerId === user?._id) {
          setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) => {
              if (chat.id === chatId) {
                return { ...chat, unreadCount: 0 };
              }
              return chat;
            });
            return updatedChats;
          });
        }
      };

      const handleTyping = ({
        chatId,
        userId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (userId !== user?._id) {
          setTypingChatIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(chatId);
            return newSet;
          });
        }
      };

      const handleStopTyping = ({
        chatId,
        userId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (userId !== user?._id) {
          setTypingChatIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
        }
      };

      const handleChatRemoved = ({ chatId }: { chatId: string }) => {
        setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
      };

      const handleChatsDeletedConfirmation = ({
        chatIds,
      }: {
        chatIds: string[];
      }) => {
        setChats((prevChats) =>
          prevChats.filter((chat) => !chatIds.includes(chat.id))
        );
        setSelectedChatIds([]);
        setIsSelectionMode(false);
      };

      socket.on("newChat", handleNewChatOrConfirmation);
      socket.on("chatCreatedConfirmation", handleNewChatOrConfirmation);
      socket.on("chatPreviewUpdate", handleChatPreviewUpdate);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("chatRemoved", handleChatRemoved);
      socket.on("chatsDeletedConfirmation", handleChatsDeletedConfirmation);

      return () => {
        socket.off("newChat", handleNewChatOrConfirmation);
        socket.off("chatCreatedConfirmation", handleNewChatOrConfirmation);
        socket.off("chatPreviewUpdate", handleChatPreviewUpdate);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("chatRemoved", handleChatRemoved);
        socket.off("chatsDeletedConfirmation", handleChatsDeletedConfirmation);
      };
    }
  }, [socket, user?._id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setTotalPages(1);
    setHasMoreChats(true);
    fetchChats(1, true);
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [fetchChats]);

  const handleLoadMore = () => {
    if (hasMoreChats && page < totalPages && !refreshing && !isLoading) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  useEffect(() => {
    if (page > 1) {
      fetchChats(page, false);
    }
  }, [page, fetchChats]);

  const filteredChats = useMemo(() => {
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage &&
          chat.lastMessage.content &&
          chat.lastMessage.content
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    );
  }, [chats, searchQuery]);

  const toggleSelectChat = (chatId: string) => {
    setSelectedChatIds((prevSelected) => {
      if (prevSelected.includes(chatId)) {
        const newSelected = prevSelected.filter((id) => id !== chatId);
        if (newSelected.length === 0) {
          setIsSelectionMode(false);
        }
        return newSelected;
      } else {
        return [...prevSelected, chatId];
      }
    });
  };

  const handleLongPressChat = (chatId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedChatIds([chatId]);
    }
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedChatIds([]);
  };

  const handleDeleteSelectedChats = async () => {
    if (selectedChatIds.length === 0) return;

    if (!accessToken) {
      console.log("Error", "Authentication error. Please log in again.");
      return;
    }

    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!accessToken) {
      console.log("Error", "Authentication error. Please log in again.");
      return;
    }

    try {
      await ChatService.deleteChats(accessToken, selectedChatIds);
      console.log("Success", "Chats deleted successfully.");
    } catch (error) {
      console.log("Error", "Failed to delete chats.");
      cancelSelectionMode();
    }
  };

  const renderSentReadStatus = (
    isMyMessage: boolean,
    isRead: boolean | undefined
  ) => {
    if (!isMyMessage) return null;

    if (isRead === undefined) {
      return (
        <Ionicons
          name="checkmark"
          size={14}
          color={colors.textDim}
          style={styles.readStatusIcon}
        />
      );
    } else if (isRead) {
      return (
        <Ionicons
          name="checkmark-done"
          size={14}
          color={colors.primary}
          style={styles.readStatusIcon}
        />
      );
    } else {
      return (
        <Ionicons
          name="checkmark"
          size={14}
          color={colors.textDim}
          style={styles.readStatusIcon}
        />
      );
    }
  };

  const renderLastMessageContent = (
    lastMessage: ChatPreviewResponse["lastMessage"],
    chatId: string
  ) => {
    const isTyping = typingChatIds.has(chatId);

    if (isTyping) {
      return (
        <ThemedView style={styles.typingContainer}>
          <ThemedText
            numberOfLines={1}
            style={[
              styles.chatLastMessage,
              { color: colors.primary, fontStyle: "italic" },
            ]}
          >
            Typing...
          </ThemedText>
        </ThemedView>
      );
    }

    if (!lastMessage || !lastMessage.content) {
      return (
        <ThemedText
          numberOfLines={1}
          style={[styles.chatLastMessage, { color: colors.textDim }]}
        >
          No messages yet
        </ThemedText>
      );
    }

    const isMyMessage = user?._id === lastMessage.senderId;
    const sentReadStatus = renderSentReadStatus(isMyMessage, lastMessage.read);

    switch (lastMessage.type) {
      case "image":
        return (
          <ThemedView style={styles.attachmentIconContainer}>
            {isMyMessage && sentReadStatus}
            <Ionicons name="camera" size={16} color={colors.textDim} />
            <ThemedText
              numberOfLines={1}
              style={[styles.chatLastMessage, { color: colors.textDim }]}
            >
              Photo
            </ThemedText>
          </ThemedView>
        );
      case "video":
        return (
          <ThemedView style={styles.attachmentIconContainer}>
            {isMyMessage && sentReadStatus}
            <MaterialIcons name="videocam" size={16} color={colors.textDim} />
            <ThemedText
              numberOfLines={1}
              style={[styles.chatLastMessage, { color: colors.textDim }]}
            >
              Video
            </ThemedText>
          </ThemedView>
        );
      case "audio":
        return (
          <ThemedView style={styles.attachmentIconContainer}>
            {isMyMessage && sentReadStatus}
            <Ionicons name="mic" size={16} color={colors.textDim} />
            <ThemedText
              numberOfLines={1}
              style={[styles.chatLastMessage, { color: colors.textDim }]}
            >
              {lastMessage.content}
            </ThemedText>
          </ThemedView>
        );
      default:
        return (
          <ThemedView style={styles.chatLastMessageContainer}>
            {isMyMessage && sentReadStatus}
            <ThemedText
              numberOfLines={1}
              style={[
                styles.chatLastMessage,
                { color: colors.textDim },
                lastMessage.content &&
                  lastMessage.content !== "No messages yet" && {
                    fontWeight: "500",
                    color: colors.textDim,
                  },
              ]}
            >
              {lastMessage.content}
            </ThemedText>
          </ThemedView>
        );
    }
  };

  const renderChatItem = ({ item }: { item: ChatPreviewResponse }) => {
    const isSelected = selectedChatIds.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          isSelectionMode
            ? toggleSelectChat(item.id)
            : router.push({
                pathname: "/(chat)/[id]",
                params: {
                  id: item.id,
                  chatName: item.name,
                  chatAvatar: item.avatar,
                  isRestricted: item.isRestricted ? "true" : "false",
                  firstMessageByKnockerId: item.firstMessageByKnockerId || "",
                },
              })
        }
        onLongPress={() => handleLongPressChat(item.id)}
      >
        {isSelectionMode && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleSelectChat(item.id)}
          >
            <Ionicons
              name={isSelected ? "checkmark" : "square-outline"}
              size={24}
              color={isSelected ? colors.primary : colors.textDim}
            />
          </TouchableOpacity>
        )}
        <UserAvatar
          imageUri={item.avatar}
          size={50}
          style={styles.userAvatarContainer}
        />
        <ThemedView style={styles.chatContent}>
          <ThemedText
            style={[
              styles.chatName,
              item.unreadCount > 0 && { fontWeight: "bold" },
            ]}
          >
            {item.name}
          </ThemedText>
          {renderLastMessageContent(item.lastMessage, item.id)}
        </ThemedView>
        <ThemedView style={styles.chatMeta}>
          <ThemedText style={[styles.chatTimestamp, { color: colors.textDim }]}>
            {safeFormatDate(item.timestamp)}
          </ThemedText>
          {item.unreadCount > 0 ? (
            <ThemedView
              style={[styles.unreadBadge, { backgroundColor: colors.primary }]}
            >
              <ThemedText
                style={[styles.unreadText, { color: colors.buttonText }]}
              >
                {item.unreadCount}
              </ThemedText>
            </ThemedView>
          ) : null}
        </ThemedView>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            leftContent={<BackButton color={colors.text} />}
            title="Chats"
            rightContent1={
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  router.push("/(chat)/new");
                }}
              >
                <Feather name="edit" size={25} color={colors.text} />
              </TouchableOpacity>
            }
            showBottomBorder={true}
          />
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
            <ThemedText style={{ color: colors.textDim }}>
              Loading chats...
            </ThemedText>
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

  const headerTitle = isSelectionMode
    ? `${selectedChatIds.length} Selected`
    : "Chats";
  const headerLeftContent = isSelectionMode ? (
    <TouchableOpacity onPress={cancelSelectionMode} style={styles.iconButton}>
      <MaterialIcons name="close" size={25} color={colors.text} />
    </TouchableOpacity>
  ) : (
    <BackButton color={colors.text} />
  );
  const headerRightContent = isSelectionMode ? (
    <TouchableOpacity
      onPress={handleDeleteSelectedChats}
      style={styles.iconButton}
      disabled={selectedChatIds.length === 0}
    >
      <MaterialIcons
        name="delete"
        size={25}
        color={selectedChatIds.length > 0 ? colors.text : colors.textDim}
      />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={styles.iconButton}
      onPress={() => {
        router.push("/(chat)/new");
      }}
    >
      <Feather name="edit" size={25} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <CommonHeader
          leftContent={headerLeftContent}
          title={headerTitle}
          rightContent1={headerRightContent}
          showBottomBorder={true}
        />

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
            placeholder="Search chats"
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </ThemedView>

        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatListContent}
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
                No chats found. Start a new conversation!
              </ThemedText>
            </ThemedView>
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={() =>
            !isLoading && hasMoreChats ? (
              <ThemedView style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText style={{ color: colors.textDim, marginTop: 5 }}>
                  Loading more chats...
                </ThemedText>
              </ThemedView>
            ) : null
          }
        />
        <ThemedModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        >
          <ThemedText style={styles.modalTitle}>Delete Chats</ThemedText>
          <ThemedText style={styles.modalText}>
            Are you sure you want to delete {selectedChatIds.length} chat(s)?
            This action cannot be undone.
          </ThemedText>
          <ThemedView style={styles.modalButtons}>
            <Button
              title="Cancel"
              onPress={() => setShowDeleteModal(false)}
              style={styles.modalButton}
            />
            <Button
              title="Delete"
              onPress={confirmDelete}
              style={styles.modalButton}
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
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  iconButton: {
    padding: 8,
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
    lineHeight: 18,
  },
  chatListContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  checkboxContainer: {
    paddingRight: 15,
  },
  userAvatarContainer: {
    marginRight: 15,
  },
  chatContent: {
    flex: 1,
    justifyContent: "center",
  },
  chatName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  chatLastMessage: {
    fontSize: 14,
  },
  chatLastMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  attachmentIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  readStatusIcon: {
    marginRight: 2,
    marginTop: 2,
  },
  chatMeta: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  chatTimestamp: {
    fontSize: 12,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: -1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 20,
  },
  loadingMoreContainer: {
    alignItems: "center",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
  },
});
