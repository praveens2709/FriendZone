import StoryTextOverlay from "@/components/StoryTextOverlay";
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Animated,
  Text,
  View,
} from "react-native";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import { StoryContent, UserStory } from "@/types/story.type";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedView } from "./ThemedView";
import { formatDistanceToNowStrict } from "date-fns";

const { width, height } = Dimensions.get("window");

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "just now";
  return formatDistanceToNowStrict(new Date(iso))
    .replace(" seconds", "s").replace(" second", "s")
    .replace(" minutes", "m").replace(" minute", "m")
    .replace(" hours", "h").replace(" hour", "h")
    .replace(" days", "d").replace(" day", "d");
};

type Props = {
  user: UserStory;
  stories: StoryContent[];
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
  onView?: (storyId: string) => void;
  onDelete?: (storyId: string) => void;
  onShowViewers?: (storyId: string) => void;
  holdProgress?: boolean;
};

export default function StoryViewer({
  user,
  stories,
  onClose,
  onNextUser,
  onPrevUser,
  onView,
  onDelete,
  onShowViewers,
  holdProgress = false,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);

  const story = stories[currentIndex];
  const isTimed = story?.type !== "video";
  const paused = isPaused || holdProgress;

  const startProgress = (duration: number) => {
    progress.setValue(0);
    animationRef.current?.stop();
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const resumeProgress = () => {
    progress.stopAnimation((value) => {
      const remaining = 1 - value;
      const remainingDuration = (story.duration || 5000) * remaining;
      startProgress(Math.max(remainingDuration, 300));
    });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onNextUser?.();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onPrevUser?.();
    }
  };

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      handlePrev();
    } else if (x > (2 * width) / 3) {
      handleNext();
    }
  };

  useEffect(() => {
    if (story) onView?.(story.id);
  }, [story?.id]);

  useEffect(() => {
    if (!story) return;
    if (isTimed) {
      if (paused) {
        animationRef.current?.stop();
      } else {
        progress.setValue(0);
        startProgress(story.duration || 5000);
      }
    } else {
      progress.setValue(0);
    }

    if (videoRef.current) {
      if (paused) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [currentIndex, paused, story?.type, story?.duration]);

  if (!story) {
    return <ThemedView style={styles.container} />;
  }

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.durationMillis && status.positionMillis === 0 && !paused) {
      startProgress(status.durationMillis);
    }

    if (status.didJustFinish && !status.isLooping) {
      handleNext();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable
        style={styles.mediaContainer}
        onPress={handlePress}
        onLongPress={() => {
          setIsPaused(true);
          animationRef.current?.stop();
          videoRef.current?.pauseAsync();
        }}
        onPressOut={() => {
          if (!isPaused) return;
          setIsPaused(false);
          if (isTimed) {
            resumeProgress();
          } else {
            videoRef.current?.playAsync();
          }
        }}
      >
        {story.type === "text" ? (
          <LinearGradient
            colors={((story.gradient && story.gradient.length >= 2 ? story.gradient : ["#1F1F1F", "#3A3A3A"]) as unknown) as readonly [string, string, ...string[]]}
            style={[styles.media, styles.textStory]}
          >
            <Text style={[styles.storyText, { color: story.textColor || "#FFFFFF" }]}>{story.text}</Text>
          </LinearGradient>
        ) : story.type === "image" ? (
          <Image source={{ uri: story.url! }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: story.url! }}
            style={styles.media}
            shouldPlay={!paused}
            resizeMode={ResizeMode.COVER}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            isLooping={false}
          />
        )}
      </Pressable>

      {story.type !== "text" && !!story.text && (
        <StoryTextOverlay
          text={story.text}
          x={story.textX ?? 0.5}
          y={story.textY ?? 0.5}
          containerWidth={width}
          containerHeight={height}
        />
      )}

      <LinearGradient colors={["rgba(0,0,0,0.8)", "transparent"]} style={styles.vignetteTop} pointerEvents="none" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.vignetteBottom} pointerEvents="none" />

      <ThemedView style={styles.headerWrapper}>
        <ThemedView style={styles.progressBarContainer}>
          {stories.map((_, idx) => {
            const isActive = idx === currentIndex;
            const barWidth = isActive
              ? progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                })
              : idx < currentIndex
              ? "100%"
              : "0%";

            return (
              <ThemedView key={idx} style={styles.progressBarBackground}>
                <Animated.View style={[styles.progressBar, { width: barWidth }]} />
              </ThemedView>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.userInfoContainer}>
          {user.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
          )}
          <View style={styles.nameAndTime}>
            <Text style={styles.userNameText} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.timeText}>{timeAgo(story.createdAt)}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </ThemedView>
      </ThemedView>

      {user.isOwnStory && (
        <View style={styles.ownBar}>
          <Pressable style={styles.ownAction} onPress={() => onShowViewers?.(story.id)}>
            <Ionicons name="eye-outline" size={22} color="#fff" />
            <Text style={styles.ownText}>{story.viewCount ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.ownAction} onPress={() => onDelete?.(story.id)}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.ownText}>Delete</Text>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: "black",
  },
  mediaContainer: {
    flex: 1,
  },
  media: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlayWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 4,
  },
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
  textStory: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  storyText: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  progressBarContainer: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: "#fff",
    height: "100%",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "white",
  },
  avatarFallback: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameAndTime: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: 8,
    gap: 8,
    backgroundColor: "transparent",
  },
  userNameText: {
    color: "#fff",
    fontWeight: "600",
    flexShrink: 1,
  },
  timeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: height * 0.2,
    zIndex: 5,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: height * 0.25,
    zIndex: 5,
  },
  ownBar: {
    position: "absolute",
    bottom: 28,
    left: 24,
    right: 24,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ownAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ownText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
