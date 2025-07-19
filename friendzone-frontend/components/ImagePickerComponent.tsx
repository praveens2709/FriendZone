import React, { useState, useRef } from "react";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import UserAvatar from "./UserAvatar";
import { ThemedView } from "./ThemedView";

interface ImagePickerComponentProps {
  onImageSelected: (uri: string | null) => void;
  currentImageUri: string | null;
}

export default function ImagePickerComponent({
  onImageSelected,
  currentImageUri,
}: ImagePickerComponentProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const pickerTypeRef = useRef<"camera" | "library" | null>(null);

  const handleModalDismissed = async () => {
    if (!pickerTypeRef.current) return;

    const type = pickerTypeRef.current;
    pickerTypeRef.current = null;

    console.log(`Modal dismissed. Now launching ${type} picker.`);

    const permissionRequest =
      type === "camera"
        ? ImagePicker.requestCameraPermissionsAsync()
        : ImagePicker.requestMediaLibraryPermissionsAsync();

    const { status } = await permissionRequest;
    console.log(`${type} permission status:`, status);

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        `Please grant ${type === 'camera' ? 'camera' : 'photo library'} access to continue. You might need to go to app settings.`
      );
      return;
    }

    try {
      let result;
      if (type === "camera") {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      console.log("Picker result:", result);

      if (!result.canceled && result.assets?.length) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Could not pick image. Please try again.");
    }
  };

  const prepareAndDismissModal = (type: "camera" | "library") => {
    pickerTypeRef.current = type;
    setModalVisible(false); 
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.touchWrapper}
      >
       <UserAvatar imageUri={currentImageUri} />

        <ThemedView
          style={[
            styles.cameraIconWrapper,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="camera" size={22} color={colors.text} />
        </ThemedView>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
        onDismiss={handleModalDismissed}
        onShow={() => {
          // No-op or additional logic for when modal appears
        }}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <ThemedView style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <ThemedView
                style={[
                  styles.modalContent,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => prepareAndDismissModal("library")}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={22}
                    color={colors.textSecondary}
                  />
                  <ThemedText
                    style={[styles.modalLabel, { color: colors.textSecondary }]}
                  >
                    Choose from Library
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => prepareAndDismissModal("camera")}
                >
                  <Ionicons name="camera" size={22} color={colors.textSecondary} />
                  <ThemedText
                    style={[styles.modalLabel, { color: colors.textSecondary }]}
                  >
                    Take Photo
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                  <ThemedText
                    style={[styles.modalLabel, { color: colors.textSecondary }]}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </TouchableWithoutFeedback>
          </ThemedView>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  touchWrapper: {
    position: "relative",
    overflow: "visible",
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cameraIconWrapper: {
    position: "absolute",
    bottom: -12,
    alignSelf: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});