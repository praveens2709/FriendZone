import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import ThemedModal from "@/components/ThemedModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "../ThemedText";

export interface MoodStatus {
  label: string;
  description?: string;
}

interface MoodStatusModalProps {
  visible: boolean;
  onClose: () => void;
  userProfileImage: string;
  onMoodSelect: (mood: MoodStatus) => void;
  onShareWithFriends?: () => void;
}

export default function MoodStatusModal({
  visible,
  onClose,
  userProfileImage,
  onMoodSelect,
  onShareWithFriends,
}: MoodStatusModalProps) {
  const { colors } = useTheme();
  const [moodText, setMoodText] = useState("");

  const handleShare = () => {
    if (!moodText.trim()) return;
    onMoodSelect({ label: moodText, description: "" });
    onClose();
    setMoodText("");
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      containerStyle={styles.modalContent}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ThemedView style={{flex: 1}}>
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.modalPlaceholder} />
          </ThemedView>
          <ThemedView style={styles.centerContent}>
            <ThemedView style={styles.avatarSection}>
              <ThemedView style={styles.statusLabelContainer}>
                <ThemedView
                  style={[
                    styles.statusBubble,
                    { backgroundColor: colors.buttonBackgroundSecondary },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="What’s new?"
                    placeholderTextColor={colors.textDim}
                    value={moodText}
                    onChangeText={setMoodText}
                    multiline
                    autoFocus
                  />
                </ThemedView>
                <ThemedView
                  style={[
                    styles.bubbleTip,
                    { backgroundColor: colors.buttonBackgroundSecondary },
                  ]}
                />
                <ThemedView
                  style={[
                    styles.bubbleDot,
                    { backgroundColor: colors.buttonBackgroundSecondary },
                  ]}
                />
              </ThemedView>

              <ThemedView style={styles.avatarContainer}>
                <Image
                  source={{ uri: userProfileImage }}
                  style={styles.profileImage}
                />
              </ThemedView>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.bottomRow}>
            <TouchableOpacity onPress={onShareWithFriends}>
              <ThemedText
                style={[styles.shareFriendsText, { color: colors.textDim }]}
              >
                Share with friends
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              disabled={!moodText.trim()}
              style={[
                styles.shareButton,
                {
                  backgroundColor: !moodText.trim()
                    ? colors.border
                    : colors.primary,
                },
              ]}
            >
              <ThemedText style={{ color: colors.background, fontWeight: "600" }}>
                Share
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalCloseButton: {
    padding: 8,
    margin: -8,
  },
  modalPlaceholder: {
    width: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSection: {
    alignItems: "center",
    position: "absolute",
    top: "25%",
  },
  avatarContainer: {
    position: "relative",
    alignItems: "center",
  },
  profileImage: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
  },
  statusLabelContainer: {
    position: "absolute",
    top: -42,
    alignItems: "flex-start",
    zIndex: 10,
  },
  statusBubble: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: 160,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  textInput: {
    fontSize: 14,
    fontWeight: "500",
    minHeight: 30,
  },
  bubbleTip: {
    width: 25,
    height: 22,
    borderRadius: 20,
    marginTop: -14,
    marginLeft: 20,
  },
  bubbleDot: {
    width: 10,
    height: 10,
    borderRadius: 20,
    marginTop: 2,
    marginLeft: 32,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  shareFriendsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  shareButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
});
