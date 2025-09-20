import React from "react";
import { Modal, StyleSheet, TouchableOpacity, Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import ImageViewer from "react-native-image-zoom-viewer";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommonHeader from "@/components/CommonHeader";
import { LinearGradient } from "expo-linear-gradient";

interface FullImageViewerProps {
  imageUri: string;
  onClose: () => void;
  senderName: string;
  senderAvatar: string;
}

const FullImageViewer: React.FC<FullImageViewerProps> = ({
  imageUri,
  onClose,
  senderName,
  senderAvatar,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const imageUrls = [{ url: imageUri }];

  const renderHeader = () => (
    <ThemedView style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <CommonHeader
        leftContent={
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={30} color={colors.text} />
          </TouchableOpacity>
        }
        titleComponent={
          <ThemedView style={styles.headerTitleContainer}>
            <Image
              source={{ uri: senderAvatar }}
              style={[styles.senderAvatar, { borderColor: colors.border }]}
            />
            <ThemedText
              style={[styles.senderName, { color: colors.text }]}
              numberOfLines={1}
            >
              {senderName}
            </ThemedText>
          </ThemedView>
        }
        showBottomBorder={true}
      />
    </ThemedView>
  );

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ImageViewer
          imageUrls={imageUrls}
          enableSwipeDown
          onSwipeDown={onClose}
          backgroundColor="transparent"
          renderIndicator={() => <View />}
          renderHeader={renderHeader}
        />
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    paddingStart: 2,
    paddingEnd: 10,
    paddingVertical: 5,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  senderName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default FullImageViewer;
