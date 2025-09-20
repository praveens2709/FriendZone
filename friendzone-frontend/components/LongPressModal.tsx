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
  onDeleteForMe: () => void;
  onUnsend: () => void;
  myUserId: string;
  modalPosition: { x: number; y: number } | null;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

export const LongPressModal: React.FC<LongPressModalProps> = ({
  visible,
  onClose,
  selectedMessage,
  onReply,
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

  const modalOptions = [
    {
      text: "Reply",
      icon: <Feather name="corner-up-left" size={24} color={colors.text} />,
      action: onReply,
      show: true,
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

  // Calculate modal position
  let modalTop = modalPosition.y - modalLayout.height - 20;
  let modalLeft = modalPosition.x - modalLayout.width / 2;

  // Ensure modal is not off-screen vertically
  if (modalTop < insets.top) {
    modalTop = modalPosition.y + 20;
  }
  if (modalTop + modalLayout.height > screenHeight - insets.bottom) {
    modalTop = screenHeight - modalLayout.height - insets.bottom - 20;
  }

  // Ensure modal is not off-screen horizontally
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
              <ThemedView style={styles.modalIconWrapper}>
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
    minWidth: 200,
    maxWidth: 250,
    alignItems: 'flex-start',
    borderWidth: 1,
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
    backgroundColor: '#383838',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});