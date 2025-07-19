import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import { StoryContent, UserStory } from "@/types/story.type";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedView } from "./ThemedView";

const { width, height } = Dimensions.get("window");

type Props = {
  user: UserStory;
  stories: StoryContent[];
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
};

export default function StoryViewer({ user, stories, onClose, onNextUser, onPrevUser }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);

  const { user: authUser } = useAuth();
  const story = stories[currentIndex];
  const isImage = story.type === "image";

  const startProgress = (duration: number) => {
    progress.setValue(0);
    animationRef.current?.stop();
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished && !isPaused) handleNext();
    });
  };

  const resumeProgress = () => {
    progress.stopAnimation((value) => {
      const remaining = 1 - value;
      const remainingDuration = (story.duration || 5000) * remaining;
      startProgress(remainingDuration);
    });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onNextUser?.();
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
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
    if (isImage) {
      startProgress(story.duration || 5000);
    } else {
      progress.setValue(0);
    }

    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [currentIndex, isPaused, story.type, story.duration, stories]);

  if (!story) {
    return <ThemedView style={styles.container} />;
  }

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.isLoaded && status.durationMillis && status.positionMillis === 0 && !isPaused) {
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
          setIsPaused(false);
          if (isImage) {
            resumeProgress();
          } else {
            videoRef.current?.playAsync();
          }
        }}
      >
        {isImage ? (
          <Image source={{ uri: story.url }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: story.url! }}
            style={styles.media}
            shouldPlay={!isPaused}
            resizeMode={ResizeMode.COVER}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            isLooping={false}
          />
        )}
      </Pressable>

      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent"]}
        style={styles.vignetteTop}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.vignetteBottom}
      />

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
          <Image source={{ uri: user.profilePic }} style={styles.userAvatar} />
          <ThemedText style={styles.userNameText}>{user.name}</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  mediaContainer: {
    flex: 1,
  },
  media: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  progressBarContainer: {
    flexDirection: "row",
    marginBottom: 10,
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
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "white",
  },
  userNameText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
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
});