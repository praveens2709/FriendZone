// app/(chat)/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CommonHeader from '@/components/CommonHeader';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import BackButton from '@/components/BackButton';
import ChatService, { MessageResponse } from '@/services/ChatService';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useLoadingDialog } from '@/context/LoadingContext';
import { formatMessageDateLabel } from '@/constants/Functions';

export default function ChatMessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id: chatId, chatName, chatAvatar } = useLocalSearchParams<{ id: string; chatName?: string; chatAvatar?: string }>();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();
  const loadingDialog = useLoadingDialog();

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const flatListRef = useRef<FlatList<MessageResponse>>(null);
  const isFetchingMoreRef = useRef(false);
  const [chatHeaderName, setChatHeaderName] = useState(chatName || 'Chat');
  const [chatHeaderAvatar, setChatHeaderAvatar] = useState(chatAvatar || 'https://i.pravatar.cc/100');

  useEffect(() => {
    const fetchChatDetails = async () => {
      if (!chatId || !accessToken) return;
      try {
        const chatDetail = await ChatService.getChatDetails(chatId, accessToken);
        if (chatDetail) {
          setChatHeaderName(chatDetail.name);
          setChatHeaderAvatar(chatDetail.avatar || `https://ui-avatars.com/api/?name=${chatDetail.name}`);
        }
      } catch (error) {
      }
    };

    if (!chatName || !chatAvatar) {
      fetchChatDetails();
    }
  }, [chatId, accessToken, chatName, chatAvatar]);

  const fetchMessages = useCallback(async (pageNum: number, initialLoad: boolean = false) => {
    if (!accessToken || !chatId) return;

    if (initialLoad) loadingDialog.show();
    isFetchingMoreRef.current = true;
    try {
      const response = await ChatService.getChatMessages(chatId, accessToken, pageNum);
      if (pageNum === 1) {
        setMessages(response.messages.reverse());
      } else {
        setMessages(prevMessages => [...response.messages.reverse(), ...prevMessages]);
      }
      setTotalPages(response.totalPages);
    } catch (error) {
    } finally {
      if (initialLoad) loadingDialog.hide();
      setRefreshing(false);
      isFetchingMoreRef.current = false;
    }
  }, [accessToken, chatId, loadingDialog]);

  useEffect(() => {
    if (chatId) {
      fetchMessages(1, true);
      if (socket && user?._id) {
        socket.emit('joinChat', chatId);
        socket.emit('markMessagesRead', { chatId: chatId, userId: user._id });
      }
    }
    return () => {
      if (socket && chatId) {
        socket.emit('leaveChat', chatId);
      }
    };
  }, [chatId, fetchMessages, socket, user?._id]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage: any) => {
        if (newMessage.chat.toString() === chatId) {
          setMessages(prevMessages => {
            const isDuplicate = prevMessages.some(msg => msg.id === newMessage._id);
            if (!isDuplicate) {
                const formattedMessage: MessageResponse = {
                    id: newMessage._id,
                    sender: newMessage.sender === user?._id ? 'me' : 'other',
                    text: newMessage.text,
                    timestamp: newMessage.timestamp,
                    read: newMessage.readBy.includes(user?._id),
                };
                return [...prevMessages, formattedMessage];
            }
            return prevMessages;
          });
          if (user?._id) {
            socket.emit('markMessagesRead', { chatId: chatId, userId: user._id });
          }
        }
      };

      const handleMessagesRead = ({ chatId: readChatId, userId: readerId }: { chatId: string, userId: string }) => {
        if (readChatId === chatId) {
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg.sender === 'me' && msg.read === false ? { ...msg, read: true } : msg
            )
          );
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messagesRead', handleMessagesRead);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messagesRead', handleMessagesRead);
      };
    }
  }, [socket, chatId, user?._id]);

  useEffect(() => {
    if (messages.length > 0 && !isFetchingMoreRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchMessages(1);
  }, [fetchMessages]);

  const handleLoadOlderMessages = () => {
    if (page < totalPages && !isFetchingMoreRef.current) {
      setPage(prevPage => prevPage + 1);
      fetchMessages(page + 1);
    }
  };

  if (!chatId) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader leftContent={<BackButton />} title="Chat Not Found" showBottomBorder={true} />
          <ThemedView style={styles.emptyScreenContent}>
            <ThemedText style={{ color: colors.textDim, fontSize: 16 }}>
              Oops! This chat doesn't exist.
            </ThemedText>
          </ThemedView>
        </ThemedSafeArea>
      </LinearGradient>
    );
  }

  const handleSendMessage = () => {
    if (messageText.trim().length === 0 || !socket || !user?._id || !chatId) return;

    socket.emit('sendMessage', {
      chatId: chatId,
      senderId: user._id,
      text: messageText.trim(),
    });

    const tempMessage: MessageResponse = {
      id: `temp-${Date.now()}`,
      sender: 'me',
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    setMessageText('');
  };

  const renderMessage = ({ item, index }: { item: MessageResponse; index: number }) => {
    const isMyMessage = item.sender === 'me';

    let showDateLabel = false;
    let dateLabel = '';

    const currentMessageDate = new Date(item.timestamp);

    if (isNaN(currentMessageDate.getTime())) {
      dateLabel = 'Invalid Date';
    } else {
      if (index === 0) {
        showDateLabel = true;
        dateLabel = formatMessageDateLabel(item.timestamp);
      } else {
        const prevMessage = messages[index - 1];
        const prevMessageDate = new Date(prevMessage.timestamp);
        if (!isNaN(prevMessageDate.getTime()) && currentMessageDate.toDateString() !== prevMessageDate.toDateString()) {
          showDateLabel = true;
          dateLabel = formatMessageDateLabel(item.timestamp);
        }
      }
    }

    return (
      <>
        {showDateLabel && (
          <View style={styles.dateLabelContainer}>
            <ThemedText style={[styles.dateLabelText, { color: colors.textDim }]}>
              {dateLabel}
            </ThemedText>
          </View>
        )}
        <View style={[styles.messageBubbleContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <ThemedView style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, { backgroundColor: isMyMessage ? colors.primary : colors.buttonBackgroundSecondary }]}>
            <ThemedText style={[styles.messageText, { color: isMyMessage ? colors.buttonText : colors.text }]}>
              {item.text}
            </ThemedText>
            <View style={styles.messageMeta}>
              <ThemedText style={[styles.messageTimestamp, { color: isMyMessage ? colors.buttonText : colors.text }]}>
                {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </ThemedText>
              {isMyMessage && item.read !== undefined && (
                <Ionicons
                  name={item.read ? "checkmark-done" : "checkmark"}
                  size={14}
                  color={item.read ? colors.buttonText : colors.buttonText}
                  style={styles.readIcon}
                />
              )}
            </View>
          </ThemedView>
        </View>
      </>
    );
  };

  return (
    <ThemedSafeArea style={styles.safeArea}>
      <CommonHeader
        leftContent={<BackButton color={colors.text}/>}
        titleComponent={
          <View style={styles.headerTitleContainer}>
            <Image source={{ uri: chatHeaderAvatar }} style={[styles.headerAvatar, {borderColor: colors.border}]} />
            <ThemedText
              style={[styles.headerTitleText, {color: colors.text}]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatHeaderName}
            </ThemedText>
          </View>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <LinearGradient
          colors={colors.gradient}
          style={styles.gradientMessagesContainer}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.id + index}
            contentContainerStyle={styles.messagesList}
            onEndReached={handleLoadOlderMessages}
            onEndReachedThreshold={0.5}
            inverted={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={() => (
              <ThemedView style={styles.emptyListContainer}>
                <ThemedText style={{ color: colors.textDim, fontSize: 16 }}>
                  Say hello! 👋 No messages yet.
                </ThemedText>
              </ThemedView>
            )}
            ListHeaderComponent={() => (
              !loadingDialog.visible && page < totalPages && (
                <View style={styles.loadingMoreContainer}>
                  <ThemedText style={{ color: colors.textDim }}>Loading older messages...</ThemedText>
                </View>
              )
            )}
          />
        </LinearGradient>

        <ThemedView style={[styles.inputArea, { backgroundColor: "transparent", borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.inputIconButton}>
            <Feather name="plus" size={24} color={colors.text} />
          </TouchableOpacity>
          <TextInput
            style={[styles.messageInput, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.text}
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity style={styles.inputIconButton} onPress={handleSendMessage}>
            <Ionicons
              name={messageText.trim().length > 0 ? "send" : "mic"}
              size={24}
              color={messageText.trim().length > 0 ? colors.primary : colors.text}
            />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: 'transparent',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    flexShrink: 1,
  },
  iconButton: {
    padding: 8,
  },
  messagesList: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dateLabelContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  dateLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubbleContainer: {
    maxWidth: '80%',
    marginVertical: 5,
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    maxWidth: '100%',
    flexDirection: 'column',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});