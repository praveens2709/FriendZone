import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "./ThemedView";

interface AudioPlayerProps {
  audioUrl: string;
  isMyMessage: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isMyMessage }) => {
  const { colors } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const positionUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    preloadAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (positionUpdateRef.current) {
        clearInterval(positionUpdateRef.current);
      }
    };
  }, [audioUrl]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const stopPositionUpdates = () => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
  };

  const handleAudioFinish = async () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    console.log("Audio finished playing");
    stopPositionUpdates();
    setIsPlaying(false);

    if (sound) {
      try {
        await sound.pauseAsync();
        await sound.setPositionAsync(0);
      } catch (error) {
        console.error("Error pausing/resetting audio:", error);
      }
    }
    setPosition(0);

    setTimeout(() => {
      hasFinishedRef.current = false;
    }, 300);
  };

  const preloadAudio = async () => {
    try {
      setIsLoading(true);
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isLooping: false,
          progressUpdateIntervalMillis: 100,
        },
        (status) => {
          if (status.isLoaded) {
            if (!hasFinishedRef.current) {
              setPosition(status.positionMillis || 0);
            }

            if (status.didJustFinish && !hasFinishedRef.current) {
              handleAudioFinish();
            }
          }
        }
      );

      if (status.isLoaded) {
        setSound(newSound);
        setDuration(status.durationMillis || 0);
        setIsLoaded(true);
      }
    } catch (error) {
      console.error("Error preloading audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPositionUpdates = () => {
    stopPositionUpdates();

    positionUpdateRef.current = setInterval(async () => {
      if (sound && isPlaying) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            const currentPosition = status.positionMillis || 0;
            setPosition(currentPosition);

            if (Platform.OS === "android" && duration > 0) {
              const threshold = duration - 150;
              if (currentPosition >= threshold && !hasFinishedRef.current) {
                handleAudioFinish();
                return;
              }
            }

            if (
              Platform.OS === "android" &&
              status.didJustFinish &&
              !hasFinishedRef.current
            ) {
              handleAudioFinish();
              return;
            }

            if (
              Platform.OS === "ios" &&
              status.didJustFinish &&
              !hasFinishedRef.current
            ) {
              handleAudioFinish();
              return;
            }
          }
        } catch (error) {
          console.error("Error getting audio status:", error);
        }
      }
    }, 100);
  };

  const togglePlayPause = async () => {
    try {
      if (!isLoaded || !sound) {
        return;
      }

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopPositionUpdates();
      } else {
        hasFinishedRef.current = false;

        const currentStatus = await sound.getStatusAsync();
        if (currentStatus.isLoaded) {
          const currentPos = currentStatus.positionMillis || 0;
          if (currentPos >= duration - 1000 && duration > 0) {
            await sound.setPositionAsync(0);
            setPosition(0);
          }
        }

        await sound.setIsLoopingAsync(false);

        await sound.playAsync();
        setIsPlaying(true);
        startPositionUpdates();
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const handleProgressPress = async (event: any) => {
    if (!sound || !isLoaded || duration === 0) return;

    const { locationX } = event.nativeEvent;
    const progressBarWidth = 120;
    const newPosition = Math.max(
      0,
      Math.min((locationX / progressBarWidth) * duration, duration)
    );

    try {
      hasFinishedRef.current = false;
      await sound.setPositionAsync(newPosition);
      setPosition(newPosition);
    } catch (error) {
      console.error("Error seeking audio:", error);
    }
  };

  const progressPercentage =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <ThemedView
      style={[
        styles.audioContainer,
        {
          backgroundColor: isMyMessage
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <TouchableOpacity
        onPress={togglePlayPause}
        style={[
          styles.playButton,
          { backgroundColor: isMyMessage ? colors.buttonText : colors.primary },
        ]}
        disabled={isLoading || !isLoaded}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isMyMessage ? colors.primary : colors.buttonText}
          />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={16}
            color={isMyMessage ? colors.primary : colors.buttonText}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        )}
      </TouchableOpacity>
      <ThemedText
        style={[
          styles.timeText,
          { color: isMyMessage ? colors.buttonText : colors.text },
        ]}
      >
        {formatTime(position)}
      </ThemedText>
      <TouchableOpacity
        style={styles.progressContainer}
        onPress={handleProgressPress}
        activeOpacity={0.7}
      >
        <ThemedView
          style={[
            styles.progressBackground,
            {
              backgroundColor: isMyMessage
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.15)",
            },
          ]}
        >
          <ThemedView
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: isMyMessage
                  ? colors.buttonText
                  : colors.primary,
              },
            ]}
          />
        </ThemedView>
      </TouchableOpacity>
      <ThemedText
        style={[
          styles.timeText,
          { color: isMyMessage ? colors.buttonText : colors.text },
        ]}
      >
        {duration > 0 ? formatTime(duration) : "--:--"}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 15,
    minWidth: 260,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    minWidth: 35,
    textAlign: "center",
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 2,
    justifyContent: "center",
  },
  progressBackground: {
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
});

export default AudioPlayer;
