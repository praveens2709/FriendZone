import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import {
  formatMessageDateLabel,
  parseDateString,
  compareMessageTimestamps,
  generateClientTempId,
  showToast,
} from "@/constants/Functions";
import ChatService, {
  MessageResponse,
  GetMessagesResponse,
} from "@/services/ChatService";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

export default function ChatMessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const {
    id: chatId,
    chatName,
    chatAvatar,
    isNewChatFromCreation,
    isRestricted,
    firstMessageByKnockerId,
  } = useLocalSearchParams<{
    id: string;
    chatName: string;
    chatAvatar: string;
    isNewChatFromCreation?: string;
    isRestricted?: string;
    firstMessageByKnockerId?: string;
  }>();

  const [messageText, setMessageText] = useState("");
  const [currentMessages, setCurrentMessages] = useState<MessageResponse[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [chatIsRestricted, setChatIsRestricted] = useState(
    isRestricted === "true"
  );
  const [knockerId, setKnockerId] = useState<string | null>(
    firstMessageByKnockerId || null
  );

  const flatListRef = useRef<FlatList>(null);
  const loadingMoreRef = useRef(false);

  const fetchMessages = useCallback(
    async (pageNum: number, initialLoad: boolean = false) => {
      const currentUserId = user?._id?.toString();

      if (!accessToken || !chatId || !currentUserId) {
        if (initialLoad) setIsLoadingMessages(false);
        return;
      }

      if (loadingMoreRef.current && !initialLoad) {
        return;
      }
      loadingMoreRef.current = true;

      if (initialLoad) {
        setIsLoadingMessages(true);
      }

      try {
        console.log("Fetching messages for page:", pageNum);
        const response: GetMessagesResponse = await ChatService.getChatMessages(
          chatId,
          accessToken,
          currentUserId,
          pageNum
        );
        console.log(
          "API Response messages:",
          response.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            read: m.read,
            isTemp: m.isTemp,
          }))
        );

        const sortedMessages = response.messages.sort(compareMessageTimestamps);

        if (pageNum === 1) {
          setCurrentMessages(sortedMessages);
        } else {
          setCurrentMessages((prevMessages) => {
            const newMessagesToAdd = sortedMessages.filter(
              (newMessage) =>
                !prevMessages.some(
                  (existingMessage) => existingMessage.id === newMessage.id
                )
            );
            const combinedMessages = [...newMessagesToAdd, ...prevMessages];
            combinedMessages.sort(compareMessageTimestamps);
            return combinedMessages;
          });
        }
        setTotalPages(response.totalPages);
        setHasMoreMessages(
          response.messages.length > 0 && pageNum < response.totalPages
        );
        setChatIsRestricted(response.isRestricted);
        setKnockerId(response.firstMessageByKnockerId || null);
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        showToast("error", "Failed to load messages. Please try again.");
      } finally {
        if (initialLoad) {
          setIsLoadingMessages(false);
        }
        loadingMoreRef.current = false;
      }
    },
    [accessToken, chatId, user?._id]
  );

  useEffect(() => {
    if (chatId) {
      console.log("Joining chat:", chatId);
      socket?.emit("joinChat", chatId);
      setPage(1);
      setCurrentMessages([]);
      fetchMessages(1, true);
    }

    return () => {
      if (chatId) {
        console.log("Leaving chat:", chatId);
        socket?.emit("leaveChat", chatId);
      }
    };
  }, [chatId, fetchMessages, socket]);

  useEffect(() => {
    if (!isLoadingMessages && currentMessages.length > 0 && page === 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length, isLoadingMessages, page]);

  useEffect(() => {
    if (socket) {
      const currentUserId = user?._id?.toString();

      const handleNewMessage = (message: any) => {
        if (message.chat === chatId) {
          console.log("Received new message via socket:", message);
          setCurrentMessages((prevMessages) => {
            let messageSenderId: string | undefined;
            if (typeof message.sender === "string") {
              messageSenderId = message.sender;
            } else if (message.sender && typeof message.sender === "object") {
              messageSenderId =
                message.sender._id?.toString() || message.sender.id?.toString();
            }

            let initialReadStatus = false;

            const formattedMessage: MessageResponse = {
              id: message.id || message._id,
              sender: messageSenderId || "unknown",
              text: message.text,
              timestamp: message.timestamp || new Date().toISOString(),
              read: initialReadStatus,
              isTemp: false,
            };

            let updatedMessages = [...prevMessages];
            let messageReplaced = false;

            if (message.clientTempId) {
              const tempMessageIndex = updatedMessages.findIndex(
                (msg) => msg.id === message.clientTempId && msg.isTemp
              );
              if (tempMessageIndex !== -1) {
                console.log("Replacing temp message with confirmed message.");
                const existingReadStatus =
                  updatedMessages[tempMessageIndex].read;
                updatedMessages[tempMessageIndex] = {
                  ...formattedMessage,
                  read:
                    message.read !== undefined
                      ? message.read
                      : existingReadStatus,
                };
                messageReplaced = true;
              }
            }
            if (!messageReplaced) {
              const exists = updatedMessages.some(
                (msg) => msg.id === formattedMessage.id
              );
              if (!exists) {
                updatedMessages.push(formattedMessage);
              }
            }
            updatedMessages.sort(compareMessageTimestamps);

            if (message.isRestricted !== undefined) {
              setChatIsRestricted(message.isRestricted);
            }
            if (message.firstMessageByKnockerId !== undefined) {
              setKnockerId(message.firstMessageByKnockerId || null);
            }

            if (accessToken && chatId && messageSenderId !== currentUserId) {
              console.log(
                "Marking messages as read due to new incoming message."
              );
              ChatService.markMessagesAsRead(chatId, accessToken);
            }
            return updatedMessages;
          });
          setIsSendingMessage(false);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      };

      const handleMessagesRead = ({
        chatId: readChatId,
        userId: readerId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (readChatId === chatId) {
          console.log(
            `Messages read event: Chat ID ${readChatId}, Reader ID ${readerId}`
          );
          setCurrentMessages((prevMessages) =>
            prevMessages.map((msg) => {
              const isMyMessage = msg.sender?.toString() === currentUserId;
              const isReaderOtherParticipant = readerId !== currentUserId;

              if (isMyMessage && isReaderOtherParticipant) {
                console.log(
                  `My message ID ${msg.id} marked as read by other participant.`
                );
                return { ...msg, read: true };
              }
              return msg;
            })
          );
        }
      };

      const handleMessageFailed = ({
        clientTempId,
        error,
      }: {
        clientTempId: string;
        error: string;
      }) => {
        console.error(`Message failed: ${clientTempId}, Error: ${error}`);
        setCurrentMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== clientTempId)
        );
        showToast("error", error || "Your message could not be sent.");
        setIsSendingMessage(false);
      };

      socket.on("message", handleNewMessage);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("messageFailed", handleMessageFailed);

      return () => {
        socket.off("message", handleNewMessage);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("messageFailed", handleMessageFailed);
      };
    }
  }, [socket, chatId, user?._id, accessToken]);

  const handleSendMessage = async () => {
    const currentUserId = user?._id?.toString();
    if (
      messageText.trim().length === 0 ||
      !chatId ||
      !accessToken ||
      !currentUserId ||
      isSendingMessage
    ) {
      console.log("Send message conditions not met.");
      return;
    }

    const isCurrentUserKnocker = currentUserId === knockerId;
    if (chatIsRestricted && knockerId && isCurrentUserKnocker) {
      console.warn("User is knocker in restricted chat, cannot send.");
      showToast(
        "error",
        "You've already sent your first message in this restricted chat. The recipient needs to reply to unlock it."
      );
      return;
    }

    setIsSendingMessage(true);
    const clientTempId = generateClientTempId();
    const nowISO = new Date().toISOString();

    const newMessage: MessageResponse = {
      id: clientTempId,
      sender: currentUserId,
      text: messageText.trim(),
      timestamp: nowISO,
      read: false,
      isTemp: true,
    };

    console.log("Adding temporary message:", newMessage);
    setCurrentMessages((prevMessages) => {
      const newMessages = [...prevMessages, newMessage];
      newMessages.sort(compareMessageTimestamps);
      return newMessages;
    });
    setMessageText("");
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      console.log("Emitting sendMessage event to socket.");
      socket?.emit("sendMessage", {
        chatId,
        senderId: currentUserId,
        text: newMessage.text,
        isNewChatFromCreation: isNewChatFromCreation === "true",
        clientTempId: clientTempId,
      });
    } catch (error: any) {
      console.error("Error emitting sendMessage:", error);
      showToast("error", "Failed to send message. Please try again.");
      setCurrentMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== clientTempId)
      );
      setMessageText(newMessage.text);
      setIsSendingMessage(false);
    }
  };

  const handleLoadOlderMessages = () => {
    if (hasMoreMessages && !loadingMoreRef.current && page < totalPages) {
      console.log("Loading older messages, incrementing page to:", page + 1);
      setPage((prevPage) => prevPage + 1);
      fetchMessages(page + 1);
    }
  };

  useEffect(() => {
    if (socket && user?._id && chatId) {
      socket.emit("markMessagesAsRead", { chatId, userId: user._id });
      console.log(`[ChatScreen] Emitted markMessagesAsRead for chat ${chatId}`);
    }
  }, [chatId, socket, user?._id]);

  if (!chatId) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            leftContent={<BackButton />}
            title="Chat Not Found"
            showBottomBorder={true}
          />
          <ThemedView style={styles.emptyScreenContent}>
            <ThemedText style={{ color: colors.textDim, fontSize: 16 }}>
              Oops! This chat doesn't exist.
            </ThemedText>
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageResponse;
    index: number;
  }) => {
    const myUserIdString = user?._id?.toString();
    const itemSenderIdString = item.sender?.toString();

    const isMyMessage = myUserIdString === itemSenderIdString;

    let showDateLabel = false;
    let dateLabel = "";

    const currentMessageDate = parseDateString(item.timestamp);

    if (!currentMessageDate) {
      dateLabel = "Invalid Date";
    } else {
      if (index === 0) {
        showDateLabel = true;
        dateLabel = formatMessageDateLabel(item.timestamp);
      } else {
        const prevMessage = currentMessages[index - 1];
        const prevMessageDate = parseDateString(prevMessage.timestamp);
        if (
          prevMessageDate &&
          currentMessageDate.toDateString() !== prevMessageDate.toDateString()
        ) {
          showDateLabel = true;
          dateLabel = formatMessageDateLabel(item.timestamp);
        }
      }
    }

    return (
      <>
        {showDateLabel && (
          <ThemedView style={styles.dateLabelContainer}>
            <ThemedText
              style={[styles.dateLabelText, { color: colors.textDim }]}
            >
              {dateLabel}
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView
          style={[
            styles.messageBubbleContainer,
            isMyMessage
              ? styles.myMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          <ThemedView
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              {
                backgroundColor: isMyMessage
                  ? colors.primary
                  : colors.buttonBackgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.messageText,
                { color: isMyMessage ? colors.buttonText : colors.text },
              ]}
            >
              {item.text}
            </ThemedText>
            <ThemedView style={styles.messageMeta}>
              <ThemedText
                style={[
                  styles.messageTimestamp,
                  { color: isMyMessage ? colors.buttonText : colors.text },
                ]}
              >
                {currentMessageDate
                  ? currentMessageDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Invalid Time"}
              </ThemedText>
              {isMyMessage && item.isTemp && (
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.buttonText}
                  style={styles.readIcon}
                />
              )}
              {isMyMessage && !item.isTemp && (
                <Ionicons
                  name={item.read ? "checkmark-done" : "checkmark"}
                  size={14}
                  color={item.read ? colors.buttonText : colors.buttonText}
                  style={styles.readIcon}
                />
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </>
    );
  };

  return (
    <ThemedSafeArea style={styles.safeArea}>
      <CommonHeader
        leftContent={<BackButton color={colors.text} />}
        titleComponent={
          <ThemedView style={styles.headerTitleContainer}>
            <Image
              source={{ uri: chatAvatar }}
              style={[styles.headerAvatar, { borderColor: colors.border }]}
            />
            <ThemedText
              style={[styles.headerTitleText, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatName}
            </ThemedText>
          </ThemedView>
        }
        rightContent1={
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="phone" size={24} color={colors.text} />
          </TouchableOpacity>
        }
        rightContent2={
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="video" size={24} color={colors.text} />
          </TouchableOpacity>
        }
        showBottomBorder={true}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={colors.gradient}
          style={styles.gradientMessagesContainer}
        >
          {isLoadingMessages && page === 1 ? (
            <ThemedView style={styles.fullScreenLoading}>
              <ActivityIndicator size="small" color={colors.text} />
              <ThemedText style={{ color: colors.textDim, marginTop: 10 }}>
                Loading messages...
              </ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={currentMessages}
              renderItem={renderMessage}
              keyExtractor={(item) =>
                item.id ||
                `fallback-${item.text || ""}-${
                  item.timestamp || ""
                }-${Math.random()}`
              }
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onEndReached={handleLoadOlderMessages}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={() =>
                hasMoreMessages &&
                !isLoadingMessages &&
                page < totalPages &&
                loadingMoreRef.current ? (
                  <ThemedView style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <ThemedText style={{ color: colors.textDim, marginTop: 5 }}>
                      Loading older messages...
                    </ThemedText>
                  </ThemedView>
                ) : null
              }
            />
          )}
        </LinearGradient>

        <ThemedView
          style={[
            styles.inputArea,
            { backgroundColor: "transparent", borderColor: colors.border },
          ]}
        >
          <TouchableOpacity style={styles.inputIconButton}>
            <Feather name="plus" size={24} color={colors.text} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.messageInput,
              {
                color: colors.text,
                backgroundColor: colors.buttonBackgroundSecondary,
              },
            ]}
            placeholder={
              chatIsRestricted && user?._id === knockerId
                ? "Recipient needs to reply to unlock chat"
                : "Type a message..."
            }
            placeholderTextColor={colors.text}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            editable={!(chatIsRestricted && user?._id === knockerId)}
          />
          <TouchableOpacity
            style={styles.inputIconButton}
            onPress={handleSendMessage}
            disabled={
              isSendingMessage || (chatIsRestricted && user?._id === knockerId)
            }
          >
            {isSendingMessage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={messageText.trim().length > 0 ? "send" : "mic"}
                size={24}
                color={
                  messageText.trim().length > 0 ? colors.text : colors.text
                }
              />
            )}
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  gradientMessagesContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  emptyScreenContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
  },
  iconButton: {
    padding: 8,
  },
  messagesList: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  dateLabelContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  dateLabelText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  messageBubbleContainer: {
    maxWidth: "80%",
    marginVertical: 5,
  },
  myMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    maxWidth: "100%",
    flexDirection: "column",
  },
  myMessageBubble: {
    borderBottomRightRadius: 2,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 18,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  messageTimestamp: {
    fontSize: 10,
    lineHeight: 12,
  },
  readIcon: {
    marginLeft: 2,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputIconButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingMoreContainer: {
    alignItems: "center",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
});
