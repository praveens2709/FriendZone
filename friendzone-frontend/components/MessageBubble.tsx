import React from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { MessageResponse } from "@/services/ChatService";
import AudioPlayer from "@/components/AudioPlayer";
import UserAvatar from "@/components/UserAvatar";
import { useRouter } from "expo-router";

interface MessageBubbleProps {
  message: MessageResponse;
  isMyMessage: boolean;
  isTemp: boolean;
  myUserId: string;
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
  myUserId,
  onImagePress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const mineInk = readableTextOn(colors.primary, colors.buttonText);
  const textColor = isMyMessage ? mineInk : colors.text;

  const router = useRouter();
  const sharedPost = message.sharedPost || null;

  const handlePressAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", url, error);
    }
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  const reactionGroups = (message.reactions || []).reduce<
    Record<string, { count: number; mine: boolean }>
  >((acc, r) => {
    const group = acc[r.emoji] || { count: 0, mine: false };
    group.count += 1;
    if (r.user === myUserId) group.mine = true;
    acc[r.emoji] = group;
    return acc;
  }, {});
  const reactionEntries = Object.entries(reactionGroups);

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
                      color={textColor}
                    />
                    <ThemedText
                      style={{
                        color: textColor,
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
        {sharedPost && (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={sharedPost.unavailable}
            onPress={() =>
              router.push({ pathname: "/posts/[postId]", params: { postId: sharedPost.id as string } })
            }
            onLongPress={(event) => onLongPress(message, event)}
            style={[
              styles.sharedCard,
              {
                backgroundColor: isMyMessage ? "rgba(255,255,255,0.12)" : colors.backgroundSecondary,
                borderColor: isMyMessage ? "rgba(255,255,255,0.25)" : colors.border,
              },
            ]}
          >
            {sharedPost.unavailable || !sharedPost.user ? (
              <ThemedView style={styles.sharedUnavailable}>
                <Ionicons name="image-outline" size={22} color={textColor} />
                <ThemedText style={{ color: textColor, fontSize: 13 }}>
                  This post is unavailable
                </ThemedText>
              </ThemedView>
            ) : (
              <>
                <ThemedView style={styles.sharedHeader}>
                  <UserAvatar imageUri={sharedPost.user.profileImage || undefined} size={24} />
                  <ThemedText
                    style={[styles.sharedName, { color: isMyMessage ? mineInk : colors.text }]}
                    numberOfLines={1}
                  >
                    {sharedPost.user.firstName} {sharedPost.user.lastName || ""}
                  </ThemedText>
                </ThemedView>
                {!!sharedPost.image && (
                  <Image source={{ uri: sharedPost.image }} style={styles.sharedImage} />
                )}
                {(sharedPost.imageCount || 0) > 1 && (
                  <ThemedView style={styles.sharedCount}>
                    <Ionicons name="copy-outline" size={12} color="#fff" />
                  </ThemedView>
                )}
                {!!sharedPost.caption && (
                  <ThemedText
                    style={[styles.sharedCaption, { color: isMyMessage ? mineInk : colors.text }]}
                    numberOfLines={2}
                  >
                    {sharedPost.caption}
                  </ThemedText>
                )}
              </>
            )}
          </TouchableOpacity>
        )}
        {message.text && !sharedPost ? (
          <ThemedText
            style={[
              styles.messageText,
              { color: textColor },
              hasAttachments ? { marginBottom: 0 } : {},
            ]}
          >
            {message.text}
          </ThemedText>
        ) : null}
        <ThemedView style={styles.messageMeta}>
          {message.editedAt ? (
            <ThemedText style={[styles.messageTimestamp, { color: textColor, marginRight: 4 }]}>
              edited
            </ThemedText>
          ) : null}
          <ThemedText
            style={[
              styles.messageTimestamp,
              { color: textColor },
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
              color={mineInk}
              style={styles.readIcon}
            />
          )}
          {isMyMessage && !isTemp && (
            <Ionicons
              name={message.read ? "checkmark-done" : "checkmark"}
              size={14}
              color={mineInk}
              style={styles.readIcon}
            />
          )}
        </ThemedView>
      </ThemedView>
      {reactionEntries.length > 0 && (
        <ThemedView
          style={[
            styles.reactionsRow,
            isMyMessage ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
          ]}
        >
          {reactionEntries.map(([emoji, info]) => (
            <ThemedView
              key={emoji}
              style={[
                styles.reactionChip,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: info.mine ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText style={styles.reactionChipEmoji}>{emoji}</ThemedText>
              {info.count > 1 && (
                <ThemedText style={[styles.reactionChipCount, { color: colors.textDim }]}>
                  {info.count}
                </ThemedText>
              )}
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sharedCard: {
    width: 230,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  sharedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  sharedName: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  sharedImage: { width: "100%", aspectRatio: 1 },
  sharedCount: {
    position: "absolute",
    top: 46,
    right: 8,
    padding: 5,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sharedCaption: { fontSize: 13, lineHeight: 18, paddingHorizontal: 10, paddingVertical: 8 },
  sharedUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: "transparent",
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
  reactionsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: -6,
    marginHorizontal: 8,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionChipEmoji: {
    fontSize: 13,
    lineHeight: 17,
  },
  reactionChipCount: {
    fontSize: 11,
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
