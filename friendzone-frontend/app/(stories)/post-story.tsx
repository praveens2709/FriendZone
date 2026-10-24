import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import StoryPostCard from "@/components/StoryPostCard";
import StoryTextOverlay from "@/components/StoryTextOverlay";
import InlineError from "@/components/InlineError";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import PostService from "@/services/PostService";
import StoryService from "@/services/StoryService";
import { getApiError } from "@/constants/Functions";
import { Post } from "@/types/post.type";
import ArtBackground from "@/components/ui/ArtBackground";
import { STORY_BACKDROPS } from "@/constants/artPalettes";



const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

export default function PostStoryScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const backdrop = STORY_BACKDROPS[backgroundIndex];
  const [canvas, setCanvas] = useState({ width: 1, height: 1 });

  const [overlayText, setOverlayText] = useState("");
  const [editingOverlay, setEditingOverlay] = useState(false);
  const [textX, setTextX] = useState(0.5);
  const [textY, setTextY] = useState(0.5);
  const dragStart = useRef({ x: 0.5, y: 0.5 });
  const textPos = useRef({ x: 0.5, y: 0.5 });
  textPos.current = { x: textX, y: textY };
  const canvasRef = useRef({ width: 1, height: 1 });
  canvasRef.current = canvas;
  const overlaySize = useRef({ width: 0, height: 0 });

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = textPos.current;
      },
      onPanResponderMove: (_e, g) => {
        const { width, height } = canvasRef.current;
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

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const limitX = useSharedValue(0);
  const limitY = useSharedValue(0);

  useEffect(() => {
    limitX.value = canvas.width * 0.45;
    limitY.value = canvas.height * 0.45;
  }, [canvas, limitX, limitY]);

  useEffect(() => {
    if (!accessToken || typeof postId !== "string") return;
    PostService.getPostById(accessToken, postId)
      .then(setPost)
      .catch(() => setError("That post is no longer available."))
      .finally(() => setLoading(false));
  }, [accessToken, postId]);

  const pan = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.max(-limitX.value, Math.min(limitX.value, savedX.value + event.translationX));
      translateY.value = Math.max(-limitY.value, Math.min(limitY.value, savedY.value + event.translationY));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * event.scale));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
    });

  const gesture = Gesture.Simultaneous(pan, pinch, doubleTap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const share = async (audience: "circle" | "close") => {
    if (!post || posting) return;
    setPosting(true);
    setError("");
    try {
      await StoryService.postSharedPost(
        post._id,
        audience,
        backdrop.theme.palette,
        {
          x: 0.5 + translateX.value / canvas.width,
          y: 0.5 + translateY.value / canvas.height,
          scale: scale.value,
        },
        backdrop.theme.glyph,
        { text: overlayText, textX, textY }
      );
      router.back();
    } catch (err) {
      setError(getApiError(err).message);
      setPosting(false);
    }
  };

  const cardWidth = canvas.width * 0.78;
  const authorName = post ? `${post.user.firstName} ${post.user.lastName || ""}`.trim() : "";
  const profilePic = user?.profileImage || null;

  return (
    <ThemedSafeArea style={styles.container}>
      <GestureHandlerRootView style={styles.flex}>
        <View
          style={styles.flex}
          onLayout={(e) =>
            setCanvas({
              width: e.nativeEvent.layout.width || 1,
              height: e.nativeEvent.layout.height || 1,
            })
          }
        >
          <ArtBackground palette={backdrop.theme.palette} glyph={backdrop.theme.glyph} watermark={280} />
          {loading ? (
            <ActivityIndicator color="#fff" size="large" style={styles.centered} />
          ) : post ? (
            <View style={styles.centered} pointerEvents="box-none">
              <GestureDetector gesture={gesture}>
                <Animated.View style={cardStyle}>
                  <StoryPostCard
                    post={{
                      image: post.images[0]?.url,
                      authorName,
                      authorAvatar: post.user.profileImage || null,
                      caption: post.caption,
                    }}
                    width={cardWidth}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          ) : null}

          <TouchableOpacity onPress={() => router.back()} style={styles.close} disabled={posting}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {!editingOverlay && !!overlayText && (
            <StoryTextOverlay
              text={overlayText}
              x={textX}
              y={textY}
              containerWidth={canvas.width}
              containerHeight={canvas.height}
              handlers={dragResponder.panHandlers}
              onMeasure={(width, height) => {
                overlaySize.current = { width, height };
              }}
            />
          )}
          {!editingOverlay && (
            <View style={styles.topRight}>
              <TouchableOpacity
                onPress={() => setBackgroundIndex((index) => (index + 1) % STORY_BACKDROPS.length)}
                style={styles.paletteButton}
                disabled={posting}
              >
                <LinearGradient
                  colors={backdrop.theme.palette}
                  style={styles.paletteInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingOverlay(true)} style={styles.textButton} disabled={posting}>
                <Text style={styles.textButtonLabel}>Aa</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottom}>
            <InlineError message={error} style={styles.error} />
            <View style={styles.actions}>
              {posting ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => share("circle")}
                    disabled={!post}
                    style={[styles.shareButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, opacity: post ? 1 : 0.5 }]}
                  >
                    {profilePic ? (
                      <Image source={{ uri: profilePic }} style={[styles.sharePic, { borderColor: colors.textSecondary }]} />
                    ) : (
                      <Ionicons name="person-circle-outline" size={30} style={{ color: colors.textSecondary }} />
                    )}
                    <Text style={[styles.shareText, { color: colors.textSecondary }]}>Your circle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => share("close")}
                    disabled={!post}
                    style={[styles.shareButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, opacity: post ? 1 : 0.5 }]}
                  >
                    <Ionicons name="people-outline" size={24} style={{ color: colors.textSecondary }} />
                    <Text style={[styles.shareText, { color: colors.textSecondary }]}>Close friends</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
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
        </View>
      </GestureHandlerRootView>
    </ThemedSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  flex: { flex: 1 },
  centered: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  close: { position: "absolute", top: 14, left: 14, padding: 6, zIndex: 5 },
  topRight: { position: "absolute", top: 12, right: 16, flexDirection: "row", alignItems: "center", gap: 6, zIndex: 5 },
  paletteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    padding: 2,
  },
  paletteInner: { flex: 1, borderRadius: 12 },
  textButton: { paddingHorizontal: 10, paddingVertical: 4 },
  textButtonLabel: { color: "#fff", fontSize: 26, fontWeight: "800" },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    zIndex: 10,
  },
  overlayInput: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center", minWidth: 200 },
  editDone: { position: "absolute", top: 14, right: 18, paddingHorizontal: 12, paddingVertical: 6 },
  editDoneText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  bottom: { position: "absolute", bottom: 28, left: 0, right: 0, gap: 14, zIndex: 5 },
  error: { paddingHorizontal: 20, color: "#fff" },
  actions: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 20 },
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
});
