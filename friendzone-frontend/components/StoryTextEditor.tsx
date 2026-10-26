import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MAX_TEXT_SIZE,
  MIN_TEXT_SIZE,
  STORY_FONTS,
  STORY_TEXT_COLORS,
  StoryTextStyle,
  fontStyleFor,
  nextTextAlign,
  nextTextBg,
  resolveTextColors,
} from "@/constants/storyText";

type Props = {
  text: string;
  style: StoryTextStyle;
  onChange: (text: string, style: StoryTextStyle) => void;
  onDone: () => void;
  maxLength?: number;
  backdropColor?: string;
};

const TRACK_HEIGHT = 220;

// The background button cycles none -> solid -> soft; its icon shows the current mode.
const BG_ICON = {
  none: "format-text",
  solid: "alpha-a-box",
  soft: "alpha-a-box-outline",
} as const;

const ALIGN_ICON = {
  left: "format-align-left",
  center: "format-align-center",
  right: "format-align-right",
} as const;

export default function StoryTextEditor({
  text,
  style,
  onChange,
  onDone,
  maxLength = 150,
  backdropColor = "rgba(0,0,0,0.7)",
}: Props) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const styleRef = useRef(style);
  styleRef.current = style;
  const textRef = useRef(text);
  textRef.current = text;
  const startSize = useRef(style.size);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const update = (patch: Partial<StoryTextStyle>) => onChange(textRef.current, { ...styleRef.current, ...patch });

  const sizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startSize.current = styleRef.current.size;
      },
      onPanResponderMove: (_e, g) => {
        // Dragging up grows the text, like Instagram's size bar.
        const next = startSize.current - (g.dy / TRACK_HEIGHT) * (MAX_TEXT_SIZE - MIN_TEXT_SIZE);
        const size = Math.round(Math.min(Math.max(next, MIN_TEXT_SIZE), MAX_TEXT_SIZE));
        if (size !== styleRef.current.size) update({ size });
      },
    })
  ).current;

  const ratio = (style.size - MIN_TEXT_SIZE) / (MAX_TEXT_SIZE - MIN_TEXT_SIZE);
  const colors = resolveTextColors(style);

  return (
    <View style={[styles.overlay, { backgroundColor: backdropColor }]}>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.topBar}>
            <View style={styles.tools}>
              <Pressable onPress={() => update({ bg: nextTextBg(style.bg) })} style={styles.tool} hitSlop={6}>
                <MaterialCommunityIcons name={BG_ICON[style.bg]} size={22} color="#fff" />
              </Pressable>
              <Pressable onPress={() => update({ align: nextTextAlign(style.align) })} style={styles.tool} hitSlop={6}>
                <MaterialCommunityIcons name={ALIGN_ICON[style.align]} size={22} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => (keyboardVisible ? Keyboard.dismiss() : inputRef.current?.focus())}
                style={styles.tool}
                hitSlop={6}
              >
                <MaterialCommunityIcons name="format-size" size={22} color="#fff" />
              </Pressable>
            </View>
            <Pressable onPress={onDone} hitSlop={10}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.middle}>
            {!keyboardVisible && (
              <View style={styles.sizeColumn}>
                <View style={styles.track} {...sizeResponder.panHandlers}>
                  <View style={styles.rail} />
                  <View style={[styles.thumb, { bottom: ratio * (TRACK_HEIGHT - 20) }]} />
                </View>
              </View>
            )}

            <View style={[styles.inputArea, keyboardVisible && styles.inputAreaFull]}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(next) => onChange(next, styleRef.current)}
                placeholder="Add text"
                placeholderTextColor="rgba(255,255,255,0.6)"
                maxLength={maxLength}
                multiline
                autoFocus
                style={[
                  styles.input,
                  fontStyleFor(style.font),
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    fontSize: style.size,
                    lineHeight: style.size * 1.25,
                    textAlign: style.align,
                    paddingHorizontal: style.bg === "none" ? 0 : style.size * 0.5,
                    paddingVertical: style.bg === "none" ? 0 : style.size * 0.3,
                    borderRadius: style.size * 0.4,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.controls, !keyboardVisible && styles.controlsIdle]}>
            <ScrollView
              horizontal
              style={styles.row}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.chips}
            >
              {STORY_FONTS.map((font) => {
                const active = font.key === style.font;
                return (
                  <Pressable
                    key={font.key}
                    onPress={() => update({ font: font.key })}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, font.style, active && styles.chipTextActive]}>{font.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView
              horizontal
              style={styles.row}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.swatches}
            >
              {STORY_TEXT_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => update({ color })}
                  style={[styles.swatch, { backgroundColor: color }, style.color === color && styles.swatchActive]}
                />
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 },
  tools: { flexDirection: "row", gap: 8 },
  tool: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  done: { color: "#fff", fontSize: 17, fontWeight: "800", paddingHorizontal: 6 },
  middle: { flex: 1, flexDirection: "row", alignItems: "center" },
  sizeColumn: { width: 52, alignItems: "center", justifyContent: "center" },
  track: { width: 44, height: TRACK_HEIGHT, alignItems: "center", justifyContent: "center" },
  rail: { width: 4, height: "100%", borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  inputArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingRight: 24 },
  inputAreaFull: { paddingHorizontal: 24 },
  input: { minWidth: 120, maxWidth: "100%", overflow: "hidden" },
  controls: { paddingTop: 4, paddingBottom: 6 },
  controlsIdle: { paddingBottom: 28 },
  row: { flexGrow: 0 },
  chips: { flexGrow: 1, justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 6, alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  chipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#fff", fontSize: 14 },
  chipTextActive: { color: "#111" },
  swatches: { flexGrow: 1, justifyContent: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  swatchActive: { borderColor: "#fff", borderWidth: 4 },
});
