import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { ColorValue } from "react-native";
import { Colors, AppColors } from "@/constants/Colors";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface TextStoryEditorProps {
  onGoToCamera: () => void;
  onCloseScreen: () => void;
  onUploadStory: (text: string, privacy: "public" | "friends") => void;
  userProfilePic: string | null;
}

export default function TextStoryEditor({
  onGoToCamera,
  onCloseScreen,
  onUploadStory,
  userProfilePic,
}: TextStoryEditorProps) {

  const [text, setText] = useState("");
  const [gradientIndex, setGradientIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const allThemes = useRef(
    Object.values(Colors) as AppColors[]
  ).current;

  const allThemeNames = useRef(Object.keys(Colors)).current;

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

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [fadeAnim]);

  const cycleBackgroundGradient = useCallback(() => {
    setGradientIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % allThemes.length;
      // const selectedThemeName = allThemeNames[newIndex];
      // console.log(`Current Gradient Theme: ${selectedThemeName}`, allThemes[newIndex].gradient);
      return newIndex;
    });
  }, [allThemes, allThemeNames]);

  const handleUpload = (privacy: "public" | "friends") => {
    if (text.trim().length > 0) {
      Keyboard.dismiss();
      onUploadStory(text.trim(), privacy);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

//   const currentFontStyle = { fontFamily: "System", fontSize: 36, fontWeight: "normal" };

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
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -keyboardHeight}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <ThemedView style={styles.textInputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  { color: activeThemeColors.text }
                ]}
                placeholder="Tap to type"
                placeholderTextColor={activeThemeColors.textDim}
                multiline
                autoFocus
                value={text}
                onChangeText={setText}
                textAlign={"center"}
              />
            </ThemedView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <ThemedView style={styles.footer}>
          <TouchableOpacity
            onPress={() => handleUpload("public")}
            style={[
              styles.footerButton,
              { backgroundColor: activeThemeColors.backgroundSecondary, borderColor: activeThemeColors.border },
              text.trim().length === 0 && styles.disabledButton,
            ]}
            disabled={text.trim().length === 0}
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
              Your Story
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleUpload("friends")}
            style={[
              styles.footerButton,
              { backgroundColor: activeThemeColors.backgroundSecondary, borderColor: activeThemeColors.border },
              text.trim().length === 0 && styles.disabledButton,
            ]}
            disabled={text.trim().length === 0}
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
              Friends Only
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
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
    gap: 15,
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
  keyboardAvoidingContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  textInputWrapper: {
    flex: 1,
    justifyContent: "center",
    width: "90%",
  },
  textInput: {
    minHeight: 50,
    textAlign: "center",
    fontSize: 26,
    lineHeight: 26,
  },
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