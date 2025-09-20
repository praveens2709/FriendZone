import React, { useEffect } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { MessageResponse } from "@/services/ChatService";
import AudioPlayer from "@/components/AudioPlayer";

interface MessageBubbleProps {
  message: MessageResponse;
  isMyMessage: boolean;
  isTemp: boolean;
  onImagePress: (uri: string) => void;
  onLongPress: (
    message: MessageResponse,
    event: NativeSyntheticEvent<NativeTouchEvent>
  ) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMyMessage,
  isTemp,
  onImagePress,
  onLongPress,
}) => {
  const { colors } = useTheme();

  useEffect(() => {
    if (message.attachments) {
      message.attachments.forEach((att, index) => {
        console.log(`Attachment ${index} info:`, {
          url: att.url,
          type: att.type,
          fileName: att.fileName,
        });
      });
    }
  }, [message]);

  const handlePressAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", url, error);
    }
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <TouchableOpacity
      style={[
        styles.messageBubbleContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
      onLongPress={(event) => onLongPress(message, event)}
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
          hasAttachments &&
            (message.text === "" || !message.text) &&
            styles.bubbleWithOnlyAttachment,
        ]}
      >
        {hasAttachments && (
          <ThemedView style={styles.attachmentsContainer}>
            {(message.attachments || []).map((attachment, index) => {
              const fileType = attachment.type.split("/")[0];
              if (fileType === "image") {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => onImagePress(attachment.url)}
                  >
                    <Image
                      source={{ uri: attachment.url }}
                      style={styles.imageAttachment}
                    />
                  </TouchableOpacity>
                );
              } else if (fileType === "audio") {
                return (
                  <AudioPlayer
                    key={index}
                    audioUrl={attachment.url}
                    isMyMessage={isMyMessage}
                  />
                );
              } else {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.documentAttachment,
                      {
                        backgroundColor: isMyMessage
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                      },
                    ]}
                    onPress={() => handlePressAttachment(attachment.url)}
                  >
                    <Ionicons
                      name="document"
                      size={24}
                      color={isMyMessage ? colors.buttonText : colors.text}
                    />
                    <ThemedText
                      style={{
                        color: isMyMessage ? colors.buttonText : colors.text,
                        flex: 1,
                        marginLeft: 8,
                      }}
                      numberOfLines={1}
                    >
                      {attachment.fileName || "Document"}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }
            })}
          </ThemedView>
        )}
        {message.text ? (
          <ThemedText
            style={[
              styles.messageText,
              { color: isMyMessage ? colors.buttonText : colors.text },
              hasAttachments ? { marginBottom: 0 } : {},
            ]}
          >
            {message.text}
          </ThemedText>
        ) : null}
        <ThemedView style={styles.messageMeta}>
          <ThemedText
            style={[
              styles.messageTimestamp,
              { color: isMyMessage ? colors.buttonText : colors.text },
            ]}
          >
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "Invalid Time"}
          </ThemedText>
          {isMyMessage && isTemp && (
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.buttonText}
              style={styles.readIcon}
            />
          )}
          {isMyMessage && !isTemp && (
            <Ionicons
              name={message.read ? "checkmark-done" : "checkmark"}
              size={14}
              color={message.read ? colors.buttonText : colors.buttonText}
              style={styles.readIcon}
            />
          )}
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  bubbleWithOnlyAttachment: {
    paddingVertical: 6,
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
  attachmentsContainer: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 4,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 15,
    resizeMode: "cover",
  },
  documentAttachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 15,
    minWidth: 200,
  },
});

export default MessageBubble;
