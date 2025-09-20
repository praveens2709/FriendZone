import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons, Feather, FontAwesome5, Entypo } from "@expo/vector-icons";
import { Animated as RNAnimated } from "react-native";
import { useLocalSearchParams } from "expo-router";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import {
  formatMessageDateLabel,
  parseDateString,
  compareMessageTimestamps,
  generateClientTempId,
} from "@/constants/Functions";
import ChatService, {
  MessageResponse,
  GetMessagesResponse,
  Attachment,
  ReplyToMessage,
} from "@/services/ChatService";
import TypingIndicator from "@/components/TypingIndicator";
import MessageBubble from "@/components/MessageBubble";
import FullImageViewer from "@/components/FullImageViewer";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import UserAvatar from "@/components/UserAvatar";
import { LongPressModal } from "@/components/LongPressModal";

const AnimatedTypingText: React.FC = () => {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);
  return (
    <RNAnimated.Text style={{ marginLeft: 8, fontSize: 12, opacity }}>
      Typing...
    </RNAnimated.Text>
  );
};

export default function ChatMessagesScreen() {
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();

  const {
    id: chatId,
    chatName,
    chatAvatar,
    isNewChatFromCreation,
    isRestricted,
    firstMessageByKnockerId,
    isLockedIn,
  } = useLocalSearchParams<{
    id: string;
    chatName: string;
    chatAvatar: string;
    isNewChatFromCreation?: string;
    isRestricted?: string;
    firstMessageByKnockerId?: string;
    isLockedIn?: string;
  }>();

  const [messageText, setMessageText] = useState("");
  const [currentMessages, setCurrentMessages] = useState<MessageResponse[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [chatIsRestricted, setChatIsRestricted] = useState(
    isRestricted === "true"
  );
  const [chatIsLockedIn, setChatIsLockedIn] = useState(isLockedIn === "true");
  const [knockerId, setKnockerId] = useState<string | null>(
    firstMessageByKnockerId || null
  );
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Reply functionality states
  const [replyToMessage, setReplyToMessage] = useState<MessageResponse | null>(
    null
  );

  const [modalImageUri, setModalImageUri] = useState<string | null>(null);
  const [modalImageSender, setModalImageSender] = useState<{
    name: string;
    avatar: string;
  } | null>(null);

  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  const didSlideCancelRef = useRef(false);
  const recordingCancelledRef = useRef(false);
  const isStoppingOrSendingRef = useRef(false);

  const recordingPulse = useRef(new Animated.Value(1)).current;
  const recordingOpacity = useRef(new Animated.Value(0)).current;

  const recordingRef = useRef<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList<MessageResponse>>(null);
  const loadingMoreRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const wasCancelledRef = useRef(false);

  const [isLongPressModalVisible, setIsLongPressModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] =
    useState<MessageResponse | null>(null);
  const longPressModalOpacity = useRef(new Animated.Value(0)).current;
  const [modalPosition, setModalPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status: cameraStatus } =
          await ImagePicker.requestCameraPermissionsAsync();
        const { status: galleryStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: audioStatus } = await Audio.requestPermissionsAsync();

        if (
          cameraStatus !== "granted" ||
          galleryStatus !== "granted" ||
          audioStatus !== "granted"
        ) {
          Alert.alert(
            "Permissions Required",
            "Camera, gallery, and microphone permissions are needed to use these features."
          );
        }
      }
    })();
  }, []);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecordingDelayed = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      startRecordingAnimation();
    } catch (err) {
      console.error("Failed to start recording", err);
      console.log("error", "Failed to start voice recording.");
      cancelRecording();
    }
  };

  const startRecordingAnimation = () => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulse, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(recordingPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.timing(recordingOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    pulseAnimation.start();
    setIsRecordingStarted(true);
  };

  const stopRecordingAnimation = () => {
    recordingPulse.stopAnimation();
    Animated.parallel([
      Animated.timing(recordingPulse, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(recordingOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onRecordingPanGesture = (event: any) => {
    const { translationX } = event.nativeEvent;
    if (translationX < -30 && !recordingCancelledRef.current) {
      didSlideCancelRef.current = true;
      wasCancelledRef.current = true;
      recordingCancelledRef.current = true;
      cancelRecording();
    }
  };

  const onMicPressIn = () => {
    if (messageText.trim().length > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wasCancelledRef.current = false;
    didSlideCancelRef.current = false;
    recordingCancelledRef.current = false;
    setIsRecordingStarted(true);
    recordingStartTimeoutRef.current = setTimeout(() => {
      startRecordingDelayed();
    }, 200);
  };

  const onMicPressOut = () => {
    if (recordingStartTimeoutRef.current) {
      clearTimeout(recordingStartTimeoutRef.current);
      recordingStartTimeoutRef.current = null;
    }
    setTimeout(() => {
      if (
        wasCancelledRef.current ||
        didSlideCancelRef.current ||
        recordingCancelledRef.current
      ) {
        wasCancelledRef.current = false;
        didSlideCancelRef.current = false;
        recordingCancelledRef.current = false;
        return;
      }
      if (!isRecordingStarted) {
        return;
      }
      if (isRecording && recordingDuration >= 1) {
        stopRecordingAndSend();
      } else {
        cancelRecording();
      }
    }, 120);
  };

  const stopRecordingAndSend = async () => {
    try {
      if (recordingCancelledRef.current || isStoppingOrSendingRef.current) {
        return;
      }
      isStoppingOrSendingRef.current = true;
      if (!recordingRef.current) {
        isStoppingOrSendingRef.current = false;
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopRecordingAnimation();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
      resetRecordingUI();
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (uri) {
        const { sound: playbackObject, status } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );
        let durationMillis = 0;
        if (status.isLoaded) {
          durationMillis = status.durationMillis || 0;
          await playbackObject.unloadAsync();
        }
        const filename = `voice_note_${Date.now()}.m4a`;
        const mimeType = "audio/m4a";
        const file = {
          uri,
          name: filename,
          mimeType,
          type: "audio",
          durationMillis,
        };
        await sendMediaMessage([file]);
      }
      recordingRef.current = null;
      isStoppingOrSendingRef.current = false;
    } catch (error) {
      console.error("Failed to stop recording", error);
      console.log("error", "Failed to stop voice recording.");
      cancelRecording();
      isStoppingOrSendingRef.current = false;
    }
  };

  const cancelRecording = async () => {
    try {
      if (isStoppingOrSendingRef.current) {
        return;
      }
      isStoppingOrSendingRef.current = true;
      if (recordingStartTimeoutRef.current) {
        clearTimeout(recordingStartTimeoutRef.current);
        recordingStartTimeoutRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
      resetRecordingUI();
      stopRecordingAnimation();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      isStoppingOrSendingRef.current = false;
    } catch (error) {
      console.error("Failed to cancel recording", error);
      isStoppingOrSendingRef.current = false;
    }
  };

  const resetRecordingUI = () => {
    setIsRecordingStarted(false);
  };

  const sendMediaMessage = useCallback(
    async (
      files: {
        uri: string;
        name: string;
        mimeType: string;
        type: string;
        durationMillis?: number;
      }[]
    ) => {
      const currentUserId = user?._id?.toString();
      if (!accessToken || !chatId || !currentUserId) {
        console.log(
          "error",
          "Failed to send message: Missing user or chat info."
        );
        return;
      }
      if (chatIsRestricted && !chatIsLockedIn && knockerId === currentUserId) {
        console.log("error", "The recipient needs to reply to unlock this chat.");
        return;
      }
      setIsSendingMessage(true);
      const clientTempId = generateClientTempId();
      const nowISO = new Date().toISOString();
      const tempAttachments: Attachment[] = files.map((file) => ({
        type: file.type,
        url: file.uri,
        fileName: file.name,
        size: 0,
        duration: file.durationMillis,
      }));
      const newMessage: MessageResponse = {
        id: clientTempId,
        sender: currentUserId,
        text: "",
        attachments: tempAttachments,
        timestamp: nowISO,
        read: false,
        isTemp: true,
        replyTo: replyToMessage
          ? ({
              id: replyToMessage.id,
              text: replyToMessage.text,
              sender:
                replyToMessage.sender === currentUserId
                  ? {
                      id: currentUserId,
                      firstName: user?.firstName || "",
                      lastName: user?.lastName,
                    }
                  : {
                      id: replyToMessage.sender,
                      firstName: "User",
                      lastName: "",
                    },
              attachments: replyToMessage.attachments,
            } as ReplyToMessage)
          : null,
      };
      setCurrentMessages((prevMessages) => {
        const newMessages = [...prevMessages, newMessage];
        newMessages.sort(compareMessageTimestamps);
        return newMessages;
      });
      flatListRef.current?.scrollToEnd({ animated: true });
      setShowMediaPicker(false);
      setReplyToMessage(null);
      if (user?._id) {
        socket?.emit("stopTyping", { chatId, userId: user._id.toString() });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
      try {
        await ChatService.sendMessageWithAttachment(
          accessToken,
          chatId,
          clientTempId,
          files,
          isNewChatFromCreation === "true",
          replyToMessage?.id
        );
      } catch (error) {
        console.error("Failed to send message with attachment:", error);
        console.log("error", "Failed to send message. Please try again.");
        setCurrentMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== clientTempId)
        );
        setIsSendingMessage(false);
      }
    },
    [
      accessToken,
      chatId,
      user,
      chatIsRestricted,
      chatIsLockedIn,
      knockerId,
      isNewChatFromCreation,
      socket,
      replyToMessage,
    ]
  );

  const handleCameraPress = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to take a photo."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const filename = asset.uri.split("/").pop() || "camera_photo.jpg";
        const file = {
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || "image/jpeg",
          type: "image",
        };
        await sendMediaMessage([file]);
      }
    } catch (e) {
      console.error(e);
      console.log("error", "Failed to capture image.");
    }
  }, [sendMediaMessage]);

  const handleGalleryPress = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Gallery permission is required to pick an image."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const filename = asset.uri.split("/").pop() || "gallery_image.jpg";
        const file = {
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || "image/jpeg",
          type: "image",
        };
        await sendMediaMessage([file]);
      }
    } catch (e) {
      console.error(e);
      console.log("error", "Failed to pick image from gallery.");
    }
  }, [sendMediaMessage]);

  const handleDocumentPress = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "audio/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || "",
          type: asset.mimeType?.split("/")[0] || "application",
        };
        await sendMediaMessage([file]);
      }
    } catch (error) {
      console.error("Document picking failed:", error);
      console.log("error", "Failed to pick file.");
    }
  }, [sendMediaMessage]);

  const fetchMessages = useCallback(
    async (pageNum: number, initialLoad: boolean = false) => {
      const currentUserId = user?._id?.toString();
      if (!accessToken || !chatId || !currentUserId) {
        if (initialLoad) setIsLoadingMessages(false);
        return;
      }
      if (loadingMoreRef.current && !initialLoad) return;
      loadingMoreRef.current = true;
      if (initialLoad) setIsLoadingMessages(true);
      try {
        const response: GetMessagesResponse = await ChatService.getChatMessages(
          chatId,
          accessToken,
          currentUserId,
          pageNum
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
        setHasMoreChats(
          response.messages.length > 0 && pageNum < response.totalPages
        );
        setChatIsRestricted(response.isRestricted);
        setChatIsLockedIn(response.isLockedIn);
        setKnockerId(response.firstMessageByKnockerId || null);
      } catch (error: any) {
        console.log("error", "Failed to load messages. Please try again.");
      } finally {
        if (initialLoad) setIsLoadingMessages(false);
        loadingMoreRef.current = false;
      }
    },
    [accessToken, chatId, user?._id]
  );

  useEffect(() => {
    if (chatId) {
      socket?.emit("joinChat", chatId);
      setPage(1);
      setCurrentMessages([]);
      fetchMessages(1, true);
      if (user?._id) {
        socket?.emit("markMessagesAsRead", { chatId, userId: user._id });
      }
    }
    return () => {
      if (chatId) {
        socket?.emit("leaveChat", chatId);
        if (user?._id) {
          socket?.emit("stopTyping", { chatId, userId: user._id.toString() });
        }
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordingStartTimeoutRef.current) {
        clearTimeout(recordingStartTimeoutRef.current);
      }
      stopRecordingAnimation();
    };
  }, [chatId, fetchMessages, socket, user?._id]);

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
          const messageSenderId =
            typeof message.sender === "string"
              ? message.sender
              : message.sender?._id?.toString() ||
                message.sender?.id?.toString() ||
                "unknown";
          const formattedMessage: MessageResponse = {
            id: message.id || message._id,
            sender: messageSenderId,
            text: message.text,
            attachments: message.attachments,
            timestamp: message.timestamp || new Date().toISOString(),
            read: message.read,
            isTemp: false,
            replyTo: message.replyTo || null,
          };
          setCurrentMessages((prevMessages) => {
            let updatedMessages = [...prevMessages];
            const tempMessageIndex = updatedMessages.findIndex(
              (msg) => msg.id === message.clientTempId && msg.isTemp
            );
            if (tempMessageIndex !== -1) {
              updatedMessages[tempMessageIndex] = formattedMessage;
            } else {
              const exists = updatedMessages.some(
                (msg) => msg.id === formattedMessage.id
              );
              if (!exists) {
                updatedMessages.push(formattedMessage);
              }
            }
            updatedMessages.sort(compareMessageTimestamps);
            if (message.isRestricted !== undefined)
              setChatIsRestricted(message.isRestricted);
            if (message.isLockedIn !== undefined)
              setChatIsLockedIn(message.isLockedIn);
            if (message.firstMessageByKnockerId !== undefined)
              setKnockerId(message.firstMessageByKnockerId || null);
            if (messageSenderId && messageSenderId !== currentUserId) {
              setChatIsRestricted(false);
              setChatIsLockedIn(true);
              setKnockerId(null);
            }
            if (accessToken && chatId && messageSenderId !== currentUserId) {
              socket?.emit("markMessagesAsRead", {
                chatId,
                userId: currentUserId,
              });
            }
            return updatedMessages;
          });
          setIsSendingMessage(false);
          flatListRef.current?.scrollToEnd({ animated: true });
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            if (messageSenderId) newSet.delete(messageSenderId);
            return newSet;
          });
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
          setCurrentMessages((prevMessages) =>
            prevMessages.map((msg) => {
              const isMyMessage = msg.sender === currentUserId;
              const isReaderOtherParticipant = readerId !== currentUserId;
              if (isMyMessage && isReaderOtherParticipant)
                return { ...msg, read: true };
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
        setCurrentMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== clientTempId)
        );
        console.log("error", error || "Your message could not be sent.");
        setIsSendingMessage(false);
      };
      const handleTyping = ({
        chatId: typingChatId,
        userId: typingUserId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (typingChatId === chatId && typingUserId !== currentUserId) {
          setTypingUsers((prev) => new Set(prev).add(typingUserId));
        }
      };
      const handleStopTyping = ({
        chatId: stopTypingChatId,
        userId: stopTypingUserId,
      }: {
        chatId: string;
        userId: string;
      }) => {
        if (stopTypingChatId === chatId && stopTypingUserId !== currentUserId) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(stopTypingUserId);
            return newSet;
          });
        }
      };
      const handleMessageDeleted = ({
        messageId,
        deleteForEveryone,
      }: {
        messageId: string;
        deleteForEveryone: boolean;
      }) => {
        if (chatId) {
          setCurrentMessages((prevMessages) =>
            prevMessages.filter((msg) => msg.id !== messageId)
          );
        }
      };
      const handleMessageDeletedForUser = ({
        messageId,
      }: {
        messageId: string;
      }) => {
        if (chatId) {
          setCurrentMessages((prevMessages) =>
            prevMessages.filter((msg) => msg.id !== messageId)
          );
        }
      };
      socket.on("message", handleNewMessage);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("messageFailed", handleMessageFailed);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("messageDeleted", handleMessageDeleted);
      socket.on("messageDeletedForUser", handleMessageDeletedForUser);
      return () => {
        socket.off("message", handleNewMessage);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("messageFailed", handleMessageFailed);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("messageDeleted", handleMessageDeleted);
        socket.off("messageDeletedForUser", handleMessageDeletedForUser);
      };
    }
  }, [socket, chatId, user?._id, accessToken]);

  const handleMessageTextChange = (text: string) => {
    const currentUserId = user?._id?.toString();
    if (!socket || !chatId || !currentUserId) return;
    setMessageText(text);
    if (text.length > 0) {
      socket.emit("typing", { chatId, userId: currentUserId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { chatId, userId: currentUserId });
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.emit("stopTyping", { chatId, userId: currentUserId });
    }
  };

  const handleSendMessage = async () => {
    const currentUserId = user?._id?.toString();
    if (
      messageText.trim().length === 0 ||
      !chatId ||
      !accessToken ||
      !currentUserId ||
      isSendingMessage
    )
      return;
    if (chatIsRestricted && !chatIsLockedIn && knockerId === currentUserId) {
      console.log(
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
      replyTo: replyToMessage
        ? ({
            id: replyToMessage.id,
            text: replyToMessage.text,
            sender:
              replyToMessage.sender === currentUserId
                ? {
                    id: currentUserId,
                    firstName: user?.firstName || "",
                    lastName: user?.lastName,
                  }
                : {
                    id: replyToMessage.sender,
                    firstName: "User",
                    lastName: "",
                  },
            attachments: replyToMessage.attachments,
          } as ReplyToMessage)
        : null,
    };
    setCurrentMessages((prevMessages) => {
      const newMessages = [...prevMessages, newMessage];
      newMessages.sort(compareMessageTimestamps);
      return newMessages;
    });
    setMessageText("");
    setReplyToMessage(null); // Clear reply after sending
    flatListRef.current?.scrollToEnd({ animated: true });
    if (user?._id) {
      socket?.emit("stopTyping", { chatId, userId: user._id.toString() });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    try {
      socket?.emit("sendMessage", {
        chatId,
        senderId: currentUserId,
        text: newMessage.text,
        replyToId: replyToMessage?.id || null,
        isNewChatFromCreation: isNewChatFromCreation === "true",
        clientTempId: clientTempId,
      });
    } catch (error: any) {
      console.log("error", "Failed to send message. Please try again.");
      setCurrentMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== clientTempId)
      );
      setMessageText(newMessage.text || "");
      setIsSendingMessage(false);
    }
  };

  const handleLoadOlderMessages = () => {
    if (hasMoreChats && !loadingMoreRef.current && page < totalPages) {
      setPage((prevPage) => prevPage + 1);
      fetchMessages(page + 1);
    }
  };

  const showTypingIndicator = typingUsers.size > 0;

  if (!chatId) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={styles.safeArea}>
          <CommonHeader
            leftContent={<BackButton color={colors.text} />}
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

  const handleLongPress = useCallback(
    (
      message: MessageResponse,
      event: NativeSyntheticEvent<NativeTouchEvent>
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setSelectedMessage(message);
      const { pageX, pageY } = event.nativeEvent;
      setModalPosition({ x: pageX, y: pageY });
      setIsLongPressModalVisible(true);
    },
    []
  );

  const closeLongPressModal = useCallback(() => {
    setIsLongPressModalVisible(false);
    setSelectedMessage(null);
    setModalPosition(null);
  }, []);

  const handleDeleteForYou = async () => {
    if (!selectedMessage || !accessToken) return;
    try {
      await ChatService.deleteMessage(accessToken, selectedMessage.id, false);
      setCurrentMessages((prev) =>
        prev.filter((msg) => msg.id !== selectedMessage?.id)
      );
      console.log("success", "Message deleted for you.");
    } catch (error) {
      console.error("Failed to delete message for you:", error);
      console.log("error", "Failed to delete message.");
    } finally {
      closeLongPressModal();
    }
  };

  const handleUnsend = async () => {
    if (!selectedMessage || !accessToken) return;
    try {
      await ChatService.deleteMessage(accessToken, selectedMessage.id, true);
      console.log("success", "Message unsent.");
    } catch (error) {
      console.error("Failed to unsend message:", error);
      console.log("error", "Failed to unsend message.");
    } finally {
      closeLongPressModal();
    }
  };

  const handleReply = () => {
    if (selectedMessage) {
      setReplyToMessage(selectedMessage);
      closeLongPressModal();
    }
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: MessageResponse;
    index: number;
  }) => {
    const myUserIdString = user?._id?.toString();
    const isMyMessage = myUserIdString === item.sender;
    let showDateLabel = false;
    let dateLabel = "";
    const currentMessageDate = parseDateString(item.timestamp);
    if (!currentMessageDate) {
      dateLabel = "Invalid Date";
    } else {
      if (index === 0) {
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

    const handleImagePress = (uri: string) => {
      const senderName = isMyMessage
        ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "You"
        : chatName;
      const senderAvatar = isMyMessage ? user?.profileImage || "" : chatAvatar;
      const senderDetails = {
        name: senderName,
        avatar: senderAvatar,
      };
      setModalImageUri(uri);
      setModalImageSender(senderDetails);
    };

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
        <MessageBubble
          message={item}
          isMyMessage={isMyMessage}
          isTemp={item.isTemp || false}
          onImagePress={handleImagePress}
          onLongPress={handleLongPress}
        />
      </>
    );
  };

  const ReplyPreview = () => {
    if (!replyToMessage) return null;

    const replyToSenderName =
      replyToMessage.sender === user?._id?.toString()
        ? "You"
        : replyToMessage.replyTo?.sender?.firstName || "User";

    return (
      <ThemedView
        style={[
          styles.replyPreviewContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderLeftColor: colors.primary,
          },
        ]}
      >
        <ThemedView style={styles.replyPreviewContent}>
          <ThemedText
            style={[styles.replyPreviewSender, { color: colors.primary }]}
          >
            Replying to {replyToSenderName}
          </ThemedText>
          <ThemedText
            style={[styles.replyPreviewText, { color: colors.textDim }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {replyToMessage.text ||
              (replyToMessage.attachments?.length
                ? `${
                    replyToMessage.attachments[0].type === "image"
                      ? "Photo"
                      : replyToMessage.attachments[0].type === "video"
                      ? "Video"
                      : replyToMessage.attachments[0].type === "audio"
                      ? "Voice Note"
                      : "File"
                  }`
                : "Message")}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity
          onPress={cancelReply}
          style={styles.replyPreviewCancelButton}
        >
          <Ionicons name="close" size={20} color={colors.textDim} />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <ThemedSafeArea style={styles.safeArea}>
      <CommonHeader
        leftContent={<BackButton color={colors.text} />}
        titleComponent={
          <ThemedView style={styles.headerTitleContainer}>
            <UserAvatar
              imageUri={chatAvatar}
              size={32}
              style={styles.headerAvatar}
            />
            <ThemedText
              style={[styles.headerTitleText, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatName}
            </ThemedText>
            {showTypingIndicator && <AnimatedTypingText />}
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
                hasMoreChats &&
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
              ListFooterComponent={
                showTypingIndicator ? <TypingIndicator isTyping={true} /> : null
              }
            />
          )}
        </LinearGradient>
        <ThemedView style={styles.inputContainerWrapper}>
          <ReplyPreview />
          <ThemedView
            style={[styles.inputContainer, { borderTopColor: colors.border }]}
          >
            <ThemedView
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.buttonBackgroundSecondary },
                isRecordingStarted && [
                  styles.recordingInputWrapper,
                  { borderColor: colors.text },
                ],
              ]}
            >
              {!isRecordingStarted && (
                <TouchableOpacity
                  onPress={() => setShowMediaPicker(true)}
                  style={styles.iconButton}
                >
                  <Entypo name="plus" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              {isRecordingStarted ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.deleteIconButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={cancelRecording}
                  >
                    <Ionicons
                      name="trash"
                      size={20}
                      color={colors.buttonText}
                    />
                  </TouchableOpacity>
                  <ThemedView style={styles.recordingContainer}>
                    <Animated.View
                      style={[
                        styles.recordingIndicator,
                        {
                          transform: [{ scale: recordingPulse }],
                          opacity: recordingOpacity,
                        },
                      ]}
                    >
                      <ThemedView
                        style={[
                          styles.recordingDot,
                          { backgroundColor: colors.text },
                        ]}
                      />
                    </Animated.View>
                    <ThemedText
                      style={[styles.recordingText, { color: colors.text }]}
                    >
                      Recording... {formatRecordingTime(recordingDuration)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText
                    style={[
                      styles.slideToCancelText,
                      { color: colors.textDim },
                    ]}
                  >
                    {"<"} Slide to cancel
                  </ThemedText>
                </>
              ) : (
                <ThemedView style={styles.messageInputWrapper}>
                  <TextInput
                    style={[styles.messageInput, { color: colors.text }]}
                    // Only show the placeholder if messages are not loading
                    placeholder={
                      !isLoadingMessages &&
                      chatIsRestricted &&
                      !chatIsLockedIn &&
                      user?._id === knockerId
                        ? "Recipient needs to reply to unlock chat"
                        : "Type a message..."
                    }
                    placeholderTextColor={colors.textDim}
                    value={messageText}
                    onChangeText={handleMessageTextChange}
                    editable={
                      !(
                        chatIsRestricted &&
                        !chatIsLockedIn &&
                        user?._id === knockerId
                      )
                    }
                    multiline
                  />
                </ThemedView>
              )}
              {messageText.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleSendMessage}
                  disabled={isSendingMessage}
                >
                  {isSendingMessage ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Feather name="send" size={24} color={colors.text} />
                  )}
                </TouchableOpacity>
              ) : (
                <PanGestureHandler
                  onGestureEvent={onRecordingPanGesture}
                  enabled={true}
                  activeOffsetX={[-10, 10]}
                >
                  <Animated.View>
                    <TouchableOpacity
                      onPressIn={onMicPressIn}
                      onPressOut={onMicPressOut}
                      style={styles.iconButton}
                    >
                      <Ionicons name="mic" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </Animated.View>
                </PanGestureHandler>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
        <Modal
          visible={showMediaPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMediaPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMediaPicker(false)}
          >
            <ThemedView
              style={[
                styles.mediaPickerContainer,
                { backgroundColor: colors.buttonBackgroundSecondary },
              ]}
            >
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={handleCameraPress}
              >
                <Ionicons name="camera" size={30} color={colors.primary} />
                <ThemedText style={styles.mediaOptionText}>Camera</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={handleGalleryPress}
              >
                <Ionicons name="image" size={30} color={colors.primary} />
                <ThemedText style={styles.mediaOptionText}>Image</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={handleDocumentPress}
              >
                <FontAwesome5
                  name="file-upload"
                  size={30}
                  color={colors.primary}
                />
                <ThemedText style={styles.mediaOptionText}>Document</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
      {modalImageUri && modalImageSender && (
        <FullImageViewer
          imageUri={modalImageUri}
          onClose={() => {
            setModalImageUri(null);
            setModalImageSender(null);
          }}
          senderName={modalImageSender.name}
          senderAvatar={modalImageSender.avatar}
        />
      )}
      <LongPressModal
        visible={isLongPressModalVisible}
        onClose={closeLongPressModal}
        selectedMessage={selectedMessage}
        onReply={handleReply}
        onDeleteForMe={handleDeleteForYou}
        onUnsend={handleUnsend}
        myUserId={user?._id?.toString() || ""}
        modalPosition={modalPosition}
      />
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
    marginRight: 8,
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
  inputContainerWrapper: {
    backgroundColor: "transparent",
  },
  inputContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 5,
    minHeight: 50,
  },
  recordingInputWrapper: {
    borderWidth: 1,
  },
  deleteIconButton: {
    width: 34,
    height: 34,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 10.5,
    paddingHorizontal: 10,
  },
  recordingIndicator: {
    marginRight: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slideToCancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
  messageInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 14 : 8,
    backgroundColor: "transparent",
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    backgroundColor: "transparent",
    textAlignVertical: "center",
    minHeight: Platform.OS === "ios" ? 20 : 40,
    paddingTop: 0,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mediaPickerContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 40,
    position: "absolute",
    bottom: 0,
    width: "100%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mediaOption: {
    alignItems: "center",
    padding: 10,
    minWidth: 80,
  },
  mediaOptionText: {
    marginTop: 5,
    fontSize: 14,
    textAlign: "center",
  },
  longPressModal: {
    borderRadius: 15,
    padding: 10,
    position: "absolute",
    bottom: 150,
    alignSelf: "center",
    minWidth: 250,
    maxWidth: 300,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  modalIconWrapper: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#383838",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  replyPreviewContainer: {
    marginHorizontal: 10,
    marginTop: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    lineHeight: 18,
  },
  replyPreviewCancelButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
