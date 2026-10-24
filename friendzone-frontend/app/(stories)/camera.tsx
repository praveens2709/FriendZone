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
  TextInput,
  PanResponder,
  KeyboardAvoidingView,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import StoryService from "@/services/StoryService";
import { getApiError } from "@/constants/Functions";
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
import InlineError from "@/components/InlineError";
import StoryTextOverlay from "@/components/StoryTextOverlay";
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
  const [captured, setCaptured] = useState<{ uri: string; type: "image" | "video"; duration?: number } | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [editingOverlay, setEditingOverlay] = useState(false);
  const [textX, setTextX] = useState(0.5);
  const [textY, setTextY] = useState(0.5);
  const [previewHeight, setPreviewHeight] = useState(1);
  const [previewWidth, setPreviewWidth] = useState(1);
  const dragStart = useRef({ x: 0.5, y: 0.5 });
  const textPos = useRef({ x: 0.5, y: 0.5 });
  textPos.current = { x: textX, y: textY };
  const previewSize = useRef({ width: 1, height: 1 });
  previewSize.current = { width: previewWidth, height: previewHeight };
  const overlaySize = useRef({ width: 0, height: 0 });

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = textPos.current;
      },
      onPanResponderMove: (_e, g) => {
        const { width, height } = previewSize.current;
        const halfW = overlaySize.current.width / 2 / width;
        const halfH = overlaySize.current.height / 2 / height;
        const nextX = dragStart.current.x + g.dx / width;
        const nextY = dragStart.current.y + g.dy / height;
        setTextX(Math.min(Math.max(nextX, halfW), 1 - halfW));
        setTextY(Math.min(Math.max(nextY, halfH), 1 - halfH));
      },
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) setEditingOverlay(true);
      },
    })
  ).current;

  const closePreview = () => {
    setCaptured(null);
    setOverlayText("");
    setEditingOverlay(false);
    setTextX(0.5);
    setTextY(0.5);
  };

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
      setCaptured({ uri: photo.uri, type: "image" });
    } else {
      console.log("Camera ref not available to take picture.");
    }
  };

  const handleTextStoryUpload = async (
    text: string,
    audience: "circle" | "close",
    style: { gradient: string[]; textColor: string }
  ) => {
    try {
      setPosting(true);
      setPostError("");
      await StoryService.postText(text, audience, style);
      router.back();
    } catch (error) {
      setPostError(getApiError(error).message);
    } finally {
      setPosting(false);
    }
  };

  const shareCaptured = async (audience: "circle" | "close") => {
    if (!captured) return;
    try {
      setPosting(true);
      setPostError("");
      await StoryService.postMedia(captured.uri, captured.type, audience, captured.duration, {
        text: overlayText,
        textX,
        textY,
      });
      router.back();
    } catch (error) {
      setPostError(getApiError(error).message);
    } finally {
      setPosting(false);
    }
  };

  const handleGoToCamera = () => {
    setShowTextEditor(false);
  };

  const handleCloseScreen = () => {
    router.back();
  };

  if (captured) {
    return (
      <ThemedSafeArea style={styles.container}>
        <InlineError message={postError} style={styles.postError} />
        <View
          style={{ flex: 1, backgroundColor: "black" }}
          onLayout={(e) => {
            setPreviewHeight(e.nativeEvent.layout.height || 1);
            setPreviewWidth(e.nativeEvent.layout.width || 1);
          }}
        >
          {captured.type === "image" ? (
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Video
              source={{ uri: captured.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
            />
          )}
          <TouchableOpacity onPress={closePreview} style={styles.previewClose} disabled={posting}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {!editingOverlay && (
            <TouchableOpacity onPress={() => setEditingOverlay(true)} style={styles.previewText} disabled={posting}>
              <Text style={styles.previewAa}>Aa</Text>
            </TouchableOpacity>
          )}

          {!editingOverlay && !!overlayText && (
            <StoryTextOverlay
              text={overlayText}
              x={textX}
              y={textY}
              containerWidth={previewWidth}
              containerHeight={previewHeight}
              handlers={dragResponder.panHandlers}
              onMeasure={(width, height) => {
                overlaySize.current = { width, height };
              }}
            />
          )}

          {editingOverlay && (
            <KeyboardAvoidingView
              behavior={"padding"}
              style={styles.editOverlay}
            >
              <TextInput
                value={overlayText}
                onChangeText={setOverlayText}
                placeholder="Add text"
                placeholderTextColor="rgba(255,255,255,0.6)"
                maxLength={120}
                multiline
                autoFocus
                style={styles.overlayInput}
              />
              <TouchableOpacity onPress={() => setEditingOverlay(false)} style={styles.editDone}>
                <Text style={styles.editDoneText}>Done</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          <View style={styles.previewActions}>
            {posting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => shareCaptured("circle")}
                  style={[styles.shareButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                >
                  {userProfilePic ? (
                    <Image source={{ uri: userProfilePic }} style={[styles.sharePic, { borderColor: colors.textSecondary }]} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={30} style={{ color: colors.textSecondary }} />
                  )}
                  <Text style={[styles.shareText, { color: colors.textSecondary }]}>Your circle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => shareCaptured("close")}
                  style={[styles.shareButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                >
                  <Ionicons name="people-outline" size={24} style={{ color: colors.textSecondary }} />
                  <Text style={[styles.shareText, { color: colors.textSecondary }]}>Close friends</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ThemedSafeArea>
    );
  }

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
  previewClose: { position: "absolute", top: 12, left: 16, padding: 6 },
  previewText: { position: "absolute", top: 12, right: 16, paddingHorizontal: 10, paddingVertical: 4 },
  previewAa: { color: "#fff", fontSize: 26, fontWeight: "800" },
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