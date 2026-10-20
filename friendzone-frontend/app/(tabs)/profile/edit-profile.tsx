import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import ThemedModal from "@/components/ThemedModal";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";

type FormValues = {
  firstName: string;
  lastName: string;
  bio: string;
};

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [gender, setGender] = useState(user?.gender || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      bio: user?.bio || "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        bio: data.bio.trim(),
        gender: gender.toLowerCase(),
        profileImage: newImageUri || profileImage,
      });

      router.back();
    } catch (error: any) {
      console.error("Update profile error:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (source: "camera" | "library") => {
    setShowPhotoModal(false);

    let result;
    if (source === "camera") {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) return;

      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) return;

      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setNewImageUri(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    setShowPhotoModal(false);
    setProfileImage("");
    setNewImageUri(null);
  };

  const renderFormField = (
    name: keyof FormValues,
    label: string,
    placeholder: string,
    multiline?: boolean,
    maxLength?: number
  ) => (
    <Controller
      control={control}
      name={name}
      rules={{ required: `${label} is required` }}
      render={({ field: { onChange, value } }) => (
        <ThemedView style={styles.formField}>
          <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
            {label}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              multiline && styles.multilineInput,
              {
                color: colors.text,
                borderColor: errors[name] ? colors.error : colors.border,
                backgroundColor: colors.backgroundSecondary,
              },
            ]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            multiline={multiline}
            maxLength={maxLength}
          />
          {maxLength && (
            <ThemedText
              style={[styles.characterCount, { color: colors.textDim }]}
            >
              {value.length}/{maxLength}
            </ThemedText>
          )}
          {errors[name] && (
            <ThemedText style={[styles.errorText, { color: colors.error }]}>
              {errors[name]?.message}
            </ThemedText>
          )}
        </ThemedView>
      )}
    />
  );

  const renderGenderSelector = () => (
    <ThemedView style={styles.formField}>
      <ThemedText style={[styles.fieldLabel, { color: colors.text }]}>
        Gender
      </ThemedText>
      <ThemedView style={styles.genderContainer}>
        {["Male", "Female"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderOption,
              {
                borderColor: colors.border,
                backgroundColor:
                  gender === option.toLowerCase()
                    ? colors.primary
                    : colors.backgroundSecondary,
              },
            ]}
            onPress={() => setGender(option.toLowerCase())}
          >
            <ThemedText
              style={[
                styles.genderText,
                {
                  color: gender === option.toLowerCase() ? "#fff" : colors.text,
                },
              ]}
            >
              {option}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>
    </ThemedView>
  );

  if (!user) {
    return (
      <ThemedSafeArea style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={{ marginTop: 16 }}>Loading profile...</ThemedText>
      </ThemedSafeArea>
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
            Edit Profile
          </ThemedText>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </ThemedView>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <ThemedView style={styles.photoSection}>
              <TouchableOpacity onPress={() => setShowPhotoModal(true)}>
                <UserAvatar imageUri={profileImage} size={100} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => setShowPhotoModal(true)}
              >
                <ThemedText
                  style={[styles.changePhotoText, { color: colors.primary }]}
                >
                  Edit Profile Photo
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.formContainer}>
              {renderFormField(
                "firstName",
                "First Name",
                "Enter your first name"
              )}
              {renderFormField("lastName", "Last Name", "Enter your last name")}
              {renderFormField(
                "bio",
                "Bio",
                "Write something about yourself...",
                true,
                150
              )}
              {renderGenderSelector()}
              <View style={styles.bottomPadding} />
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedSafeArea>
      <ThemedModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      >
        <ThemedView>
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowPhotoModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.title, { color: colors.text }]}>
              Edit Profile Photo
            </ThemedText>
            <View style={styles.modalPlaceholder} />
          </ThemedView>

          <TouchableOpacity
            style={[
              styles.photoOption,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => pickImage("camera")}
          >
            <Ionicons name="camera" size={24} color={colors.text} />
            <ThemedText
              style={[styles.photoOptionText, { color: colors.text }]}
            >
              Take Photo
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoOption,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => pickImage("library")}
          >
            <Ionicons name="image" size={24} color={colors.text} />
            <ThemedText
              style={[styles.photoOptionText, { color: colors.text }]}
            >
              Choose from Library
            </ThemedText>
          </TouchableOpacity>

          {profileImage && (
            <TouchableOpacity
              style={[
                styles.photoOption,
                { backgroundColor: colors.backgroundSecondary },
              ]}
              onPress={removePhoto}
            >
              <Ionicons name="trash" size={24} color={colors.red} />
              <ThemedText
                style={[styles.photoOptionText, { color: colors.red }]}
              >
                Remove Photo
              </ThemedText>
            </TouchableOpacity>
          )}

          <ThemedText
            style={[styles.profileInfoText, { color: colors.textDim }]}
          >
            Your profile picture is visible to everyone on and off the app.
          </ThemedText>
        </ThemedView>
      </ThemedModal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  modalCloseButton: {
    padding: 8,
    margin: -8,
  },
  modalPlaceholder: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerButton: {
    padding: 4,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 16,
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 50,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  genderText: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  photoOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
  },
  photoOptionText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  profileInfoText: {
    fontSize: 14,
    paddingBottom: 20,
  },
  bottomPadding: {
    height: 60,
  },
});
