import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  View,
  Pressable,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { ColorValue } from "react-native";
import { Colors, AppColors } from "@/constants/Colors";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import StoryTextEditor from "@/components/StoryTextEditor";
import StoryTextOverlay from "@/components/StoryTextOverlay";
import StoryMusicChip from "@/components/StoryMusicChip";
import MusicPickerModal from "@/components/MusicPickerModal";
import { useStoryMusic } from "@/hooks/useStoryMusic";
import { DEFAULT_TEXT_STYLE, StoryMusic, StoryTextStyle } from "@/constants/storyText";
import type { StoryExtras } from "@/services/StoryService";

interface TextStoryEditorProps {
  onGoToCamera: () => void;
  onCloseScreen: () => void;
  onUploadStory: (
    text: string,
    audience: "circle" | "close",
    style: { gradient: string[]; textColor: string },
    extras: StoryExtras
  ) => void;
  userProfilePic: string | null;
}

const toHex = (color: string): string => {
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) return "#" + c.slice(1).split("").map((x) => x + x).join("");
  const rgb = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return "#" + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return "#1F1F1F";
};

const INITIAL_STYLE: StoryTextStyle = { ...DEFAULT_TEXT_STYLE, size: 34, bg: "none" };

export default function TextStoryEditor({
  onGoToCamera,
  onCloseScreen,
  onUploadStory,
  userProfilePic,
}: TextStoryEditorProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const [text, setText] = useState("");
  const [textStyle, setTextStyle] = useState<StoryTextStyle>(INITIAL_STYLE);
  const [editing, setEditing] = useState(true);
  const [music, setMusic] = useState<StoryMusic | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [gradientIndex, setGradientIndex] = useState(0);

  useStoryMusic(music?.previewUrl, !editing && !musicOpen);

  const allThemes = useRef(
    Object.values(Colors) as AppColors[]
  ).current;

  const [activeThemeColors, setActiveThemeColors] = useState<AppColors>(allThemes[0]);

  useEffect(() => {
    setActiveThemeColors(allThemes[gradientIndex] || Colors.dark);
  }, [gradientIndex, allThemes]);

  const currentBackgroundGradient = activeThemeColors.gradient;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const cycleBackgroundGradient = useCallback(() => {
    setGradientIndex((prevIndex) => (prevIndex + 1) % allThemes.length);
  }, [allThemes]);

  const hasText = text.trim().length > 0;

  const handleUpload = (audience: "circle" | "close") => {
    if (!hasText) return;
    onUploadStory(
      text.trim(),
      audience,
      {
        gradient: (activeThemeColors.gradient as readonly string[]).slice(0, 3).map(toHex),
        textColor: toHex(textStyle.color),
      },
      { textStyle, music }
    );
  };

  return (
    <Animated.View
      style={[styles.fullScreenAnimatedContainer, { opacity: fadeAnim }]}
    >
      <ThemedSafeArea style={styles.container}>
        <LinearGradient
          colors={
            currentBackgroundGradient as readonly [
              ColorValue,
              ColorValue,
              ...ColorValue[]
            ]
          }
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={onCloseScreen}>
            <Ionicons name="close" size={28} color={activeThemeColors.textSecondary} />
          </TouchableOpacity>
          <ThemedView style={styles.headerRightButtons}>
            <TouchableOpacity onPress={() => setMusicOpen(true)}>
              <MaterialCommunityIcons name="music-note-plus" size={28} color={activeThemeColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onGoToCamera}>
              <Ionicons
                name="camera-outline"
                size={28}
                color={activeThemeColors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cycleBackgroundGradient}
              style={[
                styles.colorPaletteButton,
                { borderColor: activeThemeColors.textSecondary },
              ]}
            >
              <LinearGradient
                colors={
                  currentBackgroundGradient as readonly [
                    ColorValue,
                    ColorValue,
                    ...ColorValue[]
                  ]
                }
                style={styles.colorPaletteInnerCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <Pressable
          style={styles.canvas}
          onPress={() => setEditing(true)}
          onLayout={(e) =>
            setCanvasSize({
              width: e.nativeEvent.layout.width || 1,
              height: e.nativeEvent.layout.height || 1,
            })
          }
        >
          {hasText ? (
            <StoryTextOverlay
              text={text}
              x={0.5}
              y={0.5}
              containerWidth={canvasSize.width}
              containerHeight={canvasSize.height}
              textStyle={textStyle}
            />
          ) : (
            <ThemedText style={[styles.placeholder, { color: activeThemeColors.textDim }]}>Tap to type</ThemedText>
          )}
        </Pressable>

        {!!music && (
          <View style={styles.musicWrap}>
            <StoryMusicChip music={music} onPress={() => setMusicOpen(true)} onRemove={() => setMusic(null)} />
          </View>
        )}

        <ThemedView style={styles.footer}>
          <TouchableOpacity
            onPress={() => handleUpload("circle")}
            style={[
              styles.footerButton,
              { backgroundColor: activeThemeColors.backgroundSecondary, borderColor: activeThemeColors.border },
              !hasText && styles.disabledButton,
            ]}
            disabled={!hasText}
          >
            {userProfilePic ? (
              <Image
                source={{ uri: userProfilePic }}
                style={[
                  styles.profilePic,
                  { borderColor: activeThemeColors.textSecondary },
                ]}
              />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={30}
                style={{ color: activeThemeColors.textSecondary }}
              />
            )}
            <ThemedText
              style={[
                styles.footerButtonText,
                { color: activeThemeColors.textSecondary }
              ]}
            >
              Your circle
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleUpload("close")}
            style={[
              styles.footerButton,
              { backgroundColor: activeThemeColors.backgroundSecondary, borderColor: activeThemeColors.border },
              !hasText && styles.disabledButton,
            ]}
            disabled={!hasText}
          >
            <Ionicons
              name="people-outline"
              size={24}
              style={{ color: activeThemeColors.textSecondary }}
            />
            <ThemedText
              style={[
                styles.footerButtonText,
                { color: activeThemeColors.textSecondary }
              ]}
            >
              Close friends
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {editing && (
          <StoryTextEditor
            text={text}
            style={textStyle}
            backdropColor="rgba(0,0,0,0.25)"
            onChange={(next, nextStyle) => {
              setText(next);
              setTextStyle(nextStyle);
            }}
            onDone={() => setEditing(false)}
            maxLength={200}
          />
        )}
        <MusicPickerModal
          visible={musicOpen}
          onClose={() => setMusicOpen(false)}
          onSelect={(song) => {
            setMusic(song);
            setMusicOpen(false);
          }}
        />
      </ThemedSafeArea>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreenAnimatedContainer: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    zIndex: 10,
  },
  headerRightButtons: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  colorPaletteButton: {
    width: 30,
    height: 30,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  colorPaletteInnerCircle: {
    width: "100%",
    height: "100%",
  },
  canvas: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { fontSize: 26 },
  musicWrap: { position: "absolute", bottom: 96, left: 0, right: 0, alignItems: "center" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 32,
    position: "absolute",
    bottom: 0,
    zIndex: 10,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 20,
    minWidth: 150,
    borderWidth: 1,
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  profilePic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
});
