import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import ChatService, {
  ChatPreviewResponse,
  GetChatsResponse,
} from "@/services/ChatService";
import {
  filterValidChats,
  getUserAvatar,
  parseDateString,
  safeFormatDate,
  sortChatsByTimestamp,
} from "@/constants/Functions";

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

  const fetchChats = useCallback(
    async (pageNum: number, initialLoad: boolean = false) => {
      if (!accessToken) {
        console.log("No access token, skipping chat fetch.");
        if (initialLoad) setIsLoading(false);
        setRefreshing(false);
        return;
      }

      if (initialLoad && pageNum === 1) {
        setIsLoading(true);
      }
      console.log(
        `Fetching chats for page: ${pageNum}, initialLoad: ${initialLoad}`
      );

      try {
        const response: GetChatsResponse = await ChatService.getUserChats(
          accessToken,
          pageNum
        );
        console.log(
          "API response chats:",
          response.chats.map((c) => ({
            id: c.id,
            name: c.name,
            lastMessage: c.lastMessage,
            unreadCount: c.unreadCount,
          }))
        );

        const validChats = filterValidChats(response.chats);
        console.log(
          "Valid chats after filter:",
          validChats.map((c) => c.id)
        );

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
            console.log(
              "Combined and sorted chats (load more):",
              sorted.map((c) => c.id)
            );
            return sorted;
          });
        }
        setTotalPages(response.totalPages);
        setHasMoreChats(
          response.chats.length > 0 && pageNum < response.totalPages
        );
      } catch (error: any) {
        console.error("Error fetching chats:", error);
        Alert.alert("Error", "Failed to load chats. Please try again later.");
        setHasMoreChats(false);
      } finally {
        if (initialLoad && pageNum === 1) {
          setIsLoading(false);
        }
        setRefreshing(false);
      }
    },
    [accessToken, filterValidChats]
  );

  useEffect(() => {
    console.log(
      "ChatsScreen mounted or accessToken changed. Resetting state and fetching chats."
    );
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
        console.log(
          "[Socket] Received newChat/chatCreatedConfirmation via socket:",
          newChatData
        );
        if (newChatData && newChatData.id) {
          setChats((prevChats) => {
            const existingChatIndex = prevChats.findIndex(
              (chat) => chat.id === newChatData.id
            );
            let updatedChats;
            if (existingChatIndex !== -1) {
              console.log(
                `[Socket] Updating existing chat ${newChatData.id} with new data from newChat/confirmation. Unread: ${newChatData.unreadCount}`
              );
              updatedChats = [...prevChats];
              updatedChats[existingChatIndex] = {
                ...prevChats[existingChatIndex],
                ...newChatData,
              };
            } else {
              console.log(
                `[Socket] Adding new chat ${newChatData.id} from newChat/confirmation.`
              );
              updatedChats = [newChatData, ...prevChats];
            }
            const sorted = updatedChats.sort(sortChatsByTimestamp);
            console.log(
              "[Socket] Chats after newChat/confirmation (sorted):",
              sorted.map((c) => ({
                id: c.id,
                lastMessage: c.lastMessage,
                unreadCount: c.unreadCount,
                timestamp: c.timestamp,
              }))
            );
            return sorted;
          });
        }
      };

      const handleChatPreviewUpdate = (
        updatedChatData: SocketChatPreviewUpdate
      ) => {
        console.log(
          "[Socket] Received chatPreviewUpdate via socket:",
          JSON.stringify(updatedChatData, null, 2)
        );
        setChats((prevChats) => {
          const existingChatIndex = prevChats.findIndex(
            (chat) => chat.id === updatedChatData.id
          );

          let newChatsArray;
          if (existingChatIndex !== -1) {
            console.log(
              `[Socket] Updating existing chat ${updatedChatData.id} with new data from chatPreviewUpdate. New Unread: ${updatedChatData.unreadCount}`
            );
            newChatsArray = prevChats.map((chat, index) =>
              index === existingChatIndex
                ? {
                    ...chat,
                    ...updatedChatData,
                    lastMessage:
                      updatedChatData.lastMessage !== undefined &&
                      updatedChatData.lastMessage !== ""
                        ? updatedChatData.lastMessage
                        : chat.lastMessage,
                  }
                : chat
            );
          } else {
            console.warn(
              `[Socket] ChatPreviewUpdate received for chat ID: ${updatedChatData.id} not found in current state. Adding it.`
            );
            newChatsArray = [updatedChatData, ...prevChats];
          }

          const sortedChats = newChatsArray.sort(sortChatsByTimestamp);
          console.log(
            "[Socket] Chats after chatPreviewUpdate (sorted):",
            sortedChats.map((c) => ({
              id: c.id,
              lastMessage: c.lastMessage,
              unreadCount: c.unreadCount,
              timestamp: c.timestamp,
            }))
          );
          return sortedChats;
        });
      };

      const handleMessagesRead = ({
        chatId,
        userId: readerId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        console.log(
          `[Socket] Received messagesRead event for chat ${chatId} by reader ${readerId}`
        );
        if (readerId === user?._id) {
          setChats((prevChats) => {
            const updated = prevChats.map((chat) => {
              if (chat.id === chatId) {
                console.log(
                  `[Socket] Clearing unread count for chat ${chatId} because I read it via messagesRead event.`
                );
                return { ...chat, unreadCount: 0 };
              }
              return chat;
            });
            console.log(
              `[Socket] Chats after messagesRead (self): ${updated.map((c) => ({
                id: c.id,
                unreadCount: c.unreadCount,
              }))}`
            );
            return updated;
          });
        }
      };

      socket.on("newChat", handleNewChatOrConfirmation);
      socket.on("chatCreatedConfirmation", handleNewChatOrConfirmation);
      socket.on("chatPreviewUpdate", handleChatPreviewUpdate);
      socket.on("messagesRead", handleMessagesRead);

      return () => {
        console.log("[Socket] Cleaning up socket listeners for ChatsScreen.");
        socket.off("newChat", handleNewChatOrConfirmation);
        socket.off("chatCreatedConfirmation", handleNewChatOrConfirmation);
        socket.off("chatPreviewUpdate", handleChatPreviewUpdate);
        socket.off("messagesRead", handleMessagesRead);
      };
    }
  }, [socket, user?._id, sortChatsByTimestamp]);

  const onRefresh = useCallback(() => {
    console.log("Initiating manual refresh.");
    setRefreshing(true);
    setPage(1);
    setTotalPages(1);
    setHasMoreChats(true);
    fetchChats(1, true);
  }, [fetchChats]);

  const handleLoadMore = () => {
    if (hasMoreChats && page < totalPages && !refreshing && !isLoading) {
      console.log("Loading more chats. Next page:", page + 1);
      setPage((prevPage) => prevPage + 1);
    } else {
      console.log(
        `Load more condition false: hasMoreChats=${hasMoreChats}, page=${page}, totalPages=${totalPages}, refreshing=${refreshing}, isLoading=${isLoading}`
      );
    }
  };

  useEffect(() => {
    if (page > 1) {
      fetchChats(page, false);
    }
  }, [page, fetchChats]);

  const filteredChats = useMemo(() => {
    console.log(`Filtering chats with query: "${searchQuery}"`);
    const filtered = chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage &&
          chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    console.log(`Filtered chat count: ${filtered.length}`);
    return filtered;
  }, [chats, searchQuery]);

  const renderChatItem = ({ item }: { item: ChatPreviewResponse }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => {
        console.log("Navigating to chat:", item.id);
        router.push({
          pathname: "/(chat)/[id]",
          params: {
            id: item.id,
            chatName: item.name,
            chatAvatar: getUserAvatar({
              avatar: item.avatar,
              username: item.name,
            }),
            isRestricted: item.isRestricted ? "true" : "false",
            firstMessageByKnockerId: item.firstMessageByKnockerId || "",
          },
        });
      }}
    >
      <Image
        source={{
          uri: getUserAvatar({ avatar: item.avatar, username: item.name }),
        }}
        style={[styles.chatAvatar, { borderColor: colors.border }]}
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
        <ThemedText
          numberOfLines={1}
          style={[
            styles.chatLastMessage,
            { color: colors.textDim },
            item.unreadCount > 0 && { fontWeight: "500", color: colors.text },
          ]}
        >
          {item.lastMessage}
        </ThemedText>
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
                <Feather
                  name="edit"
                  size={25}
                  color={colors.text}
                />
              </TouchableOpacity>
            }
            showBottomBorder={true}
          />
          <ThemedView style={styles.initialLoadingContainer}>
            <ActivityIndicator size="small" color={colors.text} />
            <ThemedText type="subtitle" style={{ color: colors.textDim }}>
              Loading chats...
            </ThemedText>
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

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
              <Feather
                name="edit"
                size={25}
                color={colors.text}
              />
            </TouchableOpacity>
          }
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
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
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
});
