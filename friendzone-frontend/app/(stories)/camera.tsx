import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Button,
  Image,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import * as MediaLibrary from "expo-media-library";
import TextStoryEditor from "@/components/TextStoryEditor";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

export default function CameraScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  const [lastGalleryImage, setLastGalleryImage] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);

  const userProfilePic = user?.profileImage || null;

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await fetchLastImageForDisplay();
      } else {
        setLastGalleryImage(null);
      }
    })();
  }, []);

  const fetchLastImageForDisplay = async () => {
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        first: 1,
        sortBy: [MediaLibrary.SortBy.creationTime],
        mediaType: [MediaLibrary.MediaType.photo],
      });

      if (assets.assets && assets.assets.length > 0) {
        const asset = assets.assets[0];
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (assetInfo.localUri) {
          setLastGalleryImage(assetInfo.localUri);
        } else {
          setLastGalleryImage(null);
        }
      } else {
        setLastGalleryImage(null);
      }
    } catch (error) {
      console.error("Error fetching last image for display:", error);
      setLastGalleryImage(null);
    }
  };

  if (authLoading) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ color: colors.text }}>Loading user data...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ color: colors.text }}>User not authenticated.</ThemedText>
      </ThemedView>
    );
  }

  if (!cameraPermission) {
    return <ThemedView style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!cameraPermission.granted) {
    return (
      <ThemedSafeArea
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText style={[styles.message, { color: colors.text }]}>
          We need your permission to show the camera and record audio for
          stories.
        </ThemedText>
        <Button
          onPress={requestCameraPermission}
          title="Grant Camera & Microphone Permission"
        />
      </ThemedSafeArea>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(facing === "back" ? "front" : "back");
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled) {
      setLastGalleryImage(result.assets[0].uri);
    } else {
      console.log("Image picker cancelled.");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setLastGalleryImage(photo.uri);
    } else {
      console.log("Camera ref not available to take picture.");
    }
  };

  const handleTextStoryUpload = (text: string, privacy: 'public' | 'friends') => {
    console.log(`Text story to upload (${privacy}):`, text);
    router.back();
  };

  const handleGoToCamera = () => {
    setShowTextEditor(false);
  };

  const handleCloseScreen = () => {
    router.back();
  };

  return (
    <ThemedSafeArea style={styles.container}>
      {!showTextEditor && (
        <ThemedView style={styles.fullScreenContent}>
          <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
          <ThemedView style={styles.topBarOverlay}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTextEditor(true)}
              style={styles.iconButton}
            >
              <ThemedText style={styles.aaIcon}>Aa</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <ThemedView style={styles.bottomBarOverlay}>
            {lastGalleryImage ? (
              <TouchableOpacity
                onPress={pickImage}
                style={styles.galleryImageContainer}
              >
                <Image
                  source={{ uri: lastGalleryImage }}
                  style={styles.galleryImage}
                  onError={(e) =>
                    console.warn("Image loading error:", e.nativeEvent.error)
                  }
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                <Ionicons name="image-outline" size={30} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={takePicture}
              style={styles.captureButton}
            >
              <ThemedView style={styles.innerCaptureButton} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleCameraFacing}
              style={styles.iconButton}
            >
              <Ionicons name="camera-reverse-outline" size={30} color="white" />
            </TouchableOpacity>
          </ThemedView>
          <ThemedText style={styles.storyTextOverlay}>STORY</ThemedText>
        </ThemedView>
      )}

      {showTextEditor && (
        <TextStoryEditor
          onGoToCamera={handleGoToCamera}
          onCloseScreen={handleCloseScreen}
          onUploadStory={handleTextStoryUpload}
          userProfilePic={userProfilePic}
        />
      )}
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  message: {
    textAlign: "center",
    paddingBottom: 20,
    fontSize: 16,
  },
  fullScreenContent: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  iconButton: {
    padding: 5,
  },
  aaIcon: {
    color: "white",
    fontSize: 26,
    fontWeight: "500",
  },
  bottomBarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCaptureButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "white",
  },
  galleryImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "white",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  storyTextOverlay: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
});