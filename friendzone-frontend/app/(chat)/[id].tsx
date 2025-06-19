import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
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
import { mockChatPreviews, mockChatMessages, ChatMessage } from '@/utils/mockChats';
import { formatMessageDateLabel } from '@/constants/Functions';

export default function ChatMessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const chatDetails = mockChatPreviews.find(chat => chat.id === id);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const messagesForChat = mockChatMessages[id as string] || [];
    setCurrentMessages(messagesForChat);
  }, [id]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  }, [currentMessages.length]);

  if (!chatDetails) {
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
    if (messageText.trim().length === 0) return;

    const newMessage: ChatMessage = {
      id: `msg${Date.now()}`,
      sender: 'me',
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setCurrentMessages(prevMessages => [...prevMessages, newMessage]);
    setMessageText('');
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
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
        const prevMessage = currentMessages[index - 1];
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
            <Image source={{ uri: chatDetails.avatar }} style={[styles.headerAvatar, {borderColor: colors.border}]} />
            <ThemedText
              style={[styles.headerTitleText, {color: colors.text}]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatDetails.name}
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
      >
        <LinearGradient
          colors={colors.gradient}
          style={styles.gradientMessagesContainer}
        >
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
          />
        </LinearGradient>

        <ThemedView style={[styles.inputArea, { backgroundColor: "transparent", borderColor: colors.border }]}>
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
              color={messageText.trim().length > 0 ? colors.text : colors.text}
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
    // backgroundColor: 'transparent',
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
});