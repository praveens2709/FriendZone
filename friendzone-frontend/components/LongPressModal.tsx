import React, { useRef, useEffect, useState } from "react";
import {
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { MessageResponse } from "@/services/ChatService";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LongPressModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMessage: MessageResponse | null;
  onReply: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onDeleteForMe: () => void;
  onUnsend: () => void;
  myUserId: string;
  modalPosition: { x: number; y: number } | null;
}

export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

export const LongPressModal: React.FC<LongPressModalProps> = ({
  visible,
  onClose,
  selectedMessage,
  onReply,
  onEdit,
  onReact,
  onDeleteForMe,
  onUnsend,
  myUserId,
  modalPosition,
}) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [modalLayout, setModalLayout] = useState({ width: 0, height: 0 });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setModalLayout(event.nativeEvent.layout);
  };

  if (!selectedMessage || !modalPosition) return null;

  const isMyMessage = selectedMessage.sender === myUserId;
  const isTempMessage = selectedMessage.isTemp;

  const canEdit =
    isMyMessage &&
    !isTempMessage &&
    !!selectedMessage.text &&
    Date.now() - new Date(selectedMessage.timestamp).getTime() < EDIT_WINDOW_MS;
  const myReaction = selectedMessage.reactions?.find((r) => r.user === myUserId)?.emoji;

  const modalOptions = [
    {
      text: "Reply",
      icon: <Feather name="corner-up-left" size={24} color={colors.text} />,
      action: onReply,
      show: true,
    },
    {
      text: "Edit",
      icon: <Feather name="edit-2" size={22} color={colors.text} />,
      action: onEdit,
      show: canEdit,
    },
    {
      text: "Unsend",
      icon: <MaterialCommunityIcons name="undo" size={24} color={colors.text} />,
      action: onUnsend,
      show: isMyMessage && !isTempMessage,
    },
    {
      text: "Delete for me",
      icon: <Ionicons name="trash-outline" size={24} color={colors.text} />,
      action: onDeleteForMe,
      show: !isTempMessage,
    },
  ];

  const filteredOptions = modalOptions.filter((option) => option.show);

  let modalTop = modalPosition.y - modalLayout.height - 20;
  let modalLeft = modalPosition.x - modalLayout.width / 2;

  if (modalTop < insets.top) {
    modalTop = modalPosition.y + 20;
  }
  if (modalTop + modalLayout.height > screenHeight - insets.bottom) {
    modalTop = screenHeight - modalLayout.height - insets.bottom - 20;
  }

  if (modalLeft < 10) {
    modalLeft = 10;
  }
  if (modalLeft + modalLayout.width > screenWidth - 10) {
    modalLeft = screenWidth - modalLayout.width - 10;
  }

  const modalStyle = {
    top: modalTop,
    left: modalLeft,
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <BlurView
          intensity={50}
          tint={colors.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles.longPressModal,
            modalStyle,
            {
              backgroundColor: colors.backgroundSecondary,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              borderColor: colors.border,
            },
          ]}
          onLayout={handleLayout}
        >
          {!isTempMessage && (
            <ThemedView style={[styles.reactionRow, { borderBottomColor: colors.border }]}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    onReact(emoji);
                    onClose();
                  }}
                  style={[
                    styles.reactionButton,
                    myReaction === emoji && { backgroundColor: colors.buttonBackgroundSecondary },
                  ]}
                >
                  <ThemedText style={styles.reactionEmoji}>{emoji}</ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
          {filteredOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.modalButton,
                {
                  borderBottomWidth:
                    index === filteredOptions.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                option.action();
                onClose();
              }}
            >
              <ThemedView
                style={[
                  styles.modalIconWrapper,
                  { backgroundColor: colors.buttonBackgroundSecondary },
                ]}
              >
                {option.icon}
              </ThemedView>
              <ThemedText style={[styles.modalButtonText, { color: colors.text }]}>
                {option.text}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  longPressModal: {
    borderRadius: 20,
    padding: 10,
    position: 'absolute',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    minWidth: 260,
    maxWidth: 300,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  modalIconWrapper: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});