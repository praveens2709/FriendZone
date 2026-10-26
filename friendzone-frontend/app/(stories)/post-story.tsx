import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import StoryPostCard from "@/components/StoryPostCard";
import StoryEditorChrome, { StoryShareInput, StoryTool } from "@/components/StoryEditorChrome";
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
  const { accessToken, user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const backdrop = STORY_BACKDROPS[backgroundIndex];
  const [canvas, setCanvas] = useState({ width: 1, height: 1 });

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

  const share = async (audience: "circle" | "close", input: StoryShareInput) => {
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
        input.overlay,
        input.extras
      );
      router.back();
    } catch (err) {
      setError(getApiError(err).message);
      setPosting(false);
    }
  };

  const backdropTool: StoryTool = {
    key: "backdrop",
    label: "Backdrop",
    icon: <Ionicons name="color-palette" size={20} color="#fff" />,
    onPress: () => setBackgroundIndex((index) => (index + 1) % STORY_BACKDROPS.length),
  };

  const authorName = post ? `${post.user.firstName} ${post.user.lastName || ""}`.trim() : "";

  return (
    <GestureHandlerRootView style={styles.flex}>
      <StoryEditorChrome
        onClose={() => router.back()}
        onShare={share}
        posting={posting}
        error={error}
        userProfilePic={user?.profileImage || null}
        extraTools={[backdropTool]}
        onCanvasChange={setCanvas}
      >
        {(size) => (
          <>
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
                      width={size.width * 0.78}
                    />
                  </Animated.View>
                </GestureDetector>
              </View>
            ) : null}
          </>
        )}
      </StoryEditorChrome>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "black" },
  centered: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
});
