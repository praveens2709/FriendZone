import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Button,
  Image,
  Alert,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import StoryService from "@/services/StoryService";
import { getApiError } from "@/constants/Functions";
import { useTheme } from "@/context/ThemeContext";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import * as MediaLibrary from "expo-media-library";
import TextStoryEditor from "@/components/TextStoryEditor";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import InlineError from "@/components/InlineError";
import { ThemedText } from "@/components/ThemedText";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import StoryEditorChrome, { StoryShareInput } from "@/components/StoryEditorChrome";
import type { StoryExtras } from "@/services/StoryService";

export default function CameraScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);

  const [lastGalleryImage, setLastGalleryImage] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [captured, setCaptured] = useState<{ uri: string; type: "image" | "video"; duration?: number } | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<"off" | "on">("off");
  const pinchStart = useRef(0);

  const closePreview = () => setCaptured(null);

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
    setZoom(0);
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      pinchStart.current = zoom;
    })
    .onUpdate((event) => {
      // Scale 1 is no change; doubling the pinch spreads over roughly a third of the zoom range.
      setZoom(Math.min(Math.max(pinchStart.current + (event.scale - 1) * 0.35, 0), 1));
    });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to pick something for your story.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      videoMaxDuration: 30,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCaptured({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        duration: asset.duration ?? undefined,
      });
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setZoom(0);
      setCaptured({ uri: photo.uri, type: "image" });
    } else {
      console.log("Camera ref not available to take picture.");
    }
  };

  const handleTextStoryUpload = async (
    text: string,
    audience: "circle" | "close",
    style: { gradient: string[]; textColor: string },
    extras: StoryExtras
  ) => {
    try {
      setPosting(true);
      setPostError("");
      await StoryService.postText(text, audience, style, extras);
      router.back();
    } catch (error) {
      setPostError(getApiError(error).message);
    } finally {
      setPosting(false);
    }
  };

  const shareCaptured = async (audience: "circle" | "close", input: StoryShareInput) => {
    if (!captured) return;
    try {
      setPosting(true);
      setPostError("");
      await StoryService.postMedia(captured.uri, captured.type, audience, captured.duration, input.overlay, input.extras);
      router.back();
    } catch (error) {
      setPostError(getApiError(error).message);
    } finally {
      setPosting(false);
    }
  };

  const downloadCaptured = async () => {
    if (!captured) throw new Error("Nothing to save");
    await MediaLibrary.saveToLibraryAsync(captured.uri);
    return captured.type === "video" ? "Saved the original video" : "Saved the original photo";
  };

  const handleGoToCamera = () => {
    setShowTextEditor(false);
  };

  const handleCloseScreen = () => {
    router.back();
  };

  if (captured) {
    return (
      <StoryEditorChrome
        onClose={closePreview}
        onShare={shareCaptured}
        posting={posting}
        error={postError}
        userProfilePic={userProfilePic}
        onDownload={downloadCaptured}
      >
        {() =>
          captured.type === "image" ? (
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Video
              source={{ uri: captured.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
            />
          )
        }
      </StoryEditorChrome>
    );
  }

  return (
    <ThemedSafeArea style={styles.container}>
      {!showTextEditor && (
        <ThemedView style={styles.fullScreenContent}>
          <GestureDetector gesture={pinch}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef} zoom={zoom} flash={flash} />
          </GestureDetector>
          <ThemedView style={styles.topBarOverlay}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <ThemedView style={styles.topRightTools}>
              <TouchableOpacity
                onPress={() => setFlash((current) => (current === "on" ? "off" : "on"))}
                style={styles.iconButton}
              >
                <Ionicons name={flash === "on" ? "flash" : "flash-off"} size={26} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTextEditor(true)}
                style={styles.iconButton}
              >
                <ThemedText style={styles.aaIcon}>Aa</ThemedText>
              </TouchableOpacity>
            </ThemedView>
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

      <InlineError message={showTextEditor ? postError : ""} style={styles.postError} />
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
  postError: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  previewClose: { position: "absolute", top: 12, left: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  previewTools: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  previewTool: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  previewMusic: { position: "absolute", top: 58, left: 0, right: 0, alignItems: "center" },
  topRightTools: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "transparent" },
  previewText: { position: "absolute", top: 12, right: 16, paddingHorizontal: 10, paddingVertical: 4 },
  previewAa: { color: "#fff", fontSize: 26, lineHeight: 30, fontWeight: "800", includeFontPadding: false, textAlignVertical: "center" },
  overlayHolder: { position: "absolute", left: 24, right: 24, alignItems: "center" },
  overlayText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  overlayInput: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center", minWidth: 200 },
  editDone: { position: "absolute", top: 14, right: 18, paddingHorizontal: 12, paddingVertical: 6 },
  editDoneText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  previewActions: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 20,
    minWidth: 150,
    borderWidth: 1,
  },
  sharePic: { width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1 },
  shareText: { fontSize: 14, fontWeight: "bold", marginLeft: 5 },
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  aaIcon: {
    color: "white",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "500",
    includeFontPadding: false,
    textAlignVertical: "center",
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