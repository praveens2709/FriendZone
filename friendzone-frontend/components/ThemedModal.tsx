import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  fullHeight?: boolean;
}

export default function ThemedModal({
  visible,
  onClose,
  children,
  containerStyle,
  fullHeight = false,
}: ThemedModalProps) {
  const { colors } = useTheme();

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary, maxHeight: fullHeight ? "100%" : "80%", },
            containerStyle,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
});
