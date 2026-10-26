import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import InlineError from "@/components/InlineError";
import StoryTextOverlay from "@/components/StoryTextOverlay";
import StoryTextEditor from "@/components/StoryTextEditor";
import StoryMusicChip from "@/components/StoryMusicChip";
import MusicPickerModal from "@/components/MusicPickerModal";
import StoryFilterOverlay from "@/components/StoryFilterOverlay";
import StoryDrawingLayer from "@/components/StoryDrawingLayer";
import StoryStickerLayer from "@/components/StoryStickerLayer";
import StoryStickerPicker from "@/components/StoryStickerPicker";
import StoryMentionPicker from "@/components/StoryMentionPicker";
import { useStoryMusic } from "@/hooks/useStoryMusic";
import { DEFAULT_TEXT_STYLE, StoryMusic, StoryTextStyle } from "@/constants/storyText";
import {
  DRAW_COLORS,
  DRAW_WIDTHS,
  STORY_FILTERS,
  StoryFilterKey,
  StorySticker,
  StoryStroke,
  mediaExtras,
  newStickerId,
} from "@/constants/storyDecor";
import type { StoryExtras } from "@/services/StoryService";

type Audience = "circle" | "close";

export type StoryShareInput = {
  overlay: { text: string; textX: number; textY: number };
  extras: StoryExtras;
};

export type StoryTool = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

type Props = {
  children: (canvas: { width: number; height: number }) => React.ReactNode;
  onClose: () => void;
  onShare: (audience: Audience, input: StoryShareInput) => void;
  posting: boolean;
  error?: string;
  userProfilePic: string | null;
  extraTools?: StoryTool[];
  // Saves the original media; the message is shown briefly afterwards.
  onDownload?: () => Promise<string>;
  onCanvasChange?: (canvas: { width: number; height: number }) => void;
};

const ToolButton = ({ tool }: { tool: StoryTool }) => (
  <Pressable onPress={tool.onPress} style={styles.toolRow} hitSlop={4}>
    <Text style={styles.toolLabel}>{tool.label}</Text>
    <View style={styles.toolCircle}>{tool.icon}</View>
  </Pressable>
);

export default function StoryEditorChrome({
  children,
  onClose,
  onShare,
  posting,
  error,
  userProfilePic,
  extraTools = [],
  onDownload,
  onCanvasChange,
}: Props) {
  const [canvas, setCanvas] = useState({ width: 1, height: 1 });

  const [text, setText] = useState("");
  const [textStyle, setTextStyle] = useState<StoryTextStyle>(DEFAULT_TEXT_STYLE);
  const [editingText, setEditingText] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0.5, y: 0.5 });

  const [music, setMusic] = useState<StoryMusic | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);

  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);

  const [filter, setFilter] = useState<StoryFilterKey>("none");
  const [effectsOpen, setEffectsOpen] = useState(false);

  const [strokes, setStrokes] = useState<StoryStroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const [liveStroke, setLiveStroke] = useState<StoryStroke | null>(null);

  const [toast, setToast] = useState("");

  useStoryMusic(music?.previewUrl, !editingText && !musicOpen);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;
  const drawStyle = useRef({ color: drawColor, width: drawWidth });
  drawStyle.current = { color: drawColor, width: drawWidth };
  const strokeRef = useRef<StoryStroke | null>(null);

  const drawResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { width, height } = canvasRef.current;
          strokeRef.current = {
            color: drawStyle.current.color,
            width: drawStyle.current.width,
            points: [e.nativeEvent.locationX / width, e.nativeEvent.locationY / height],
          };
          setLiveStroke({ ...strokeRef.current });
        },
        onPanResponderMove: (e) => {
          const current = strokeRef.current;
          if (!current) return;
          const { width, height } = canvasRef.current;
          const x = Math.min(Math.max(e.nativeEvent.locationX / width, 0), 1);
          const y = Math.min(Math.max(e.nativeEvent.locationY / height, 0), 1);
          const n = current.points.length;
          // Skip sub-pixel moves to keep the stroke small enough to upload.
          if (Math.abs(x - current.points[n - 2]) * width + Math.abs(y - current.points[n - 1]) * height < 3) return;
          if (n >= 800) return;
          current.points.push(x, y);
          setLiveStroke({ ...current, points: [...current.points] });
        },
        onPanResponderRelease: () => {
          const finished = strokeRef.current;
          strokeRef.current = null;
          setLiveStroke(null);
          if (finished) setStrokes((prev) => [...prev, finished].slice(-60));
        },
      }),
    []
  );

  const textDrag = useRef({ x: 0.5, y: 0.5 });
  const textPosRef = useRef(textPos);
  textPosRef.current = textPos;
  const overlaySize = useRef({ width: 0, height: 0 });
  const textResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          textDrag.current = textPosRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const { width, height } = canvasRef.current;
          const halfW = overlaySize.current.width / 2 / width;
          const halfH = overlaySize.current.height / 2 / height;
          setTextPos({
            x: Math.min(Math.max(textDrag.current.x + g.dx / width, halfW), 1 - halfW),
            y: Math.min(Math.max(textDrag.current.y + g.dy / height, halfH), 1 - halfH),
          });
        },
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) setEditingText(true);
        },
      }),
    []
  );

  const closeSheets = useCallback(() => {
    setEffectsOpen(false);
  }, []);

  const addSticker = (sticker: Omit<StorySticker, "id" | "x" | "y" | "scale" | "rotation">) => {
    setStickers((prev) =>
      [...prev, { ...sticker, id: newStickerId(), x: 0.5, y: 0.45, scale: 1, rotation: 0 }].slice(-20)
    );
  };

  const download = async () => {
    if (!onDownload) return;
    try {
      setToast(await onDownload());
    } catch {
      setToast("Couldn't save to your photos.");
    }
  };

  const tools: StoryTool[] = [
    {
      key: "text",
      label: "Text",
      icon: <Text style={styles.aa}>Aa</Text>,
      onPress: () => {
        closeSheets();
        setEditingText(true);
      },
    },
    {
      key: "stickers",
      label: "Stickers",
      icon: <MaterialCommunityIcons name="sticker-emoji" size={20} color="#fff" />,
      onPress: () => {
        closeSheets();
        setStickersOpen(true);
      },
    },
    {
      key: "audio",
      label: "Audio",
      icon: <MaterialCommunityIcons name="music-note-plus" size={20} color="#fff" />,
      onPress: () => {
        closeSheets();
        setMusicOpen(true);
      },
    },
    {
      key: "effects",
      label: "Effects",
      icon: <MaterialCommunityIcons name="shimmer" size={20} color="#fff" />,
      onPress: () => setEffectsOpen((open) => !open),
    },
    {
      key: "mention",
      label: "Mention",
      icon: <MaterialCommunityIcons name="at" size={20} color="#fff" />,
      onPress: () => {
        closeSheets();
        setMentionOpen(true);
      },
    },
    {
      key: "draw",
      label: "Draw",
      icon: <MaterialCommunityIcons name="draw" size={20} color="#fff" />,
      onPress: () => {
        closeSheets();
        setDrawing(true);
      },
    },
    ...(onDownload
      ? [
          {
            key: "download",
            label: "Download",
            icon: <MaterialCommunityIcons name="download" size={20} color="#fff" />,
            onPress: download,
          },
        ]
      : []),
    ...extraTools,
  ];

  const share = (audience: Audience) => {
    onShare(audience, {
      overlay: { text, textX: textPos.x, textY: textPos.y },
      extras: { textStyle, music, ...mediaExtras({ stickers, drawing: strokes, filter }) },
    });
  };

  const showRail = !drawing && !editingText;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <InlineError message={error ?? ""} style={styles.error} />
        <View
          style={styles.card}
          onLayout={(e) => {
            const next = {
              width: e.nativeEvent.layout.width || 1,
              height: e.nativeEvent.layout.height || 1,
            };
            setCanvas(next);
            onCanvasChange?.(next);
          }}
        >
          {children(canvas)}
          <StoryFilterOverlay filter={filter} />
          <StoryDrawingLayer
            strokes={liveStroke ? [...strokes, liveStroke] : strokes}
            width={canvas.width}
            height={canvas.height}
          />
          <StoryStickerLayer stickers={stickers} width={canvas.width} height={canvas.height} onChange={setStickers} />

          {!editingText && !!text && (
            <StoryTextOverlay
              text={text}
              x={textPos.x}
              y={textPos.y}
              containerWidth={canvas.width}
              containerHeight={canvas.height}
              textStyle={textStyle}
              handlers={drawing ? undefined : textResponder.panHandlers}
              onMeasure={(width, height) => {
                overlaySize.current = { width, height };
              }}
            />
          )}

          {drawing && <View style={styles.drawCapture} {...drawResponder.panHandlers} />}

          {!drawing && (
            <Pressable onPress={onClose} disabled={posting} style={styles.close}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          )}

          {!!music && !drawing && (
            <View style={styles.musicWrap} pointerEvents="box-none">
              <StoryMusicChip music={music} onPress={() => setMusicOpen(true)} onRemove={() => setMusic(null)} />
            </View>
          )}

          {showRail && (
            <View style={styles.rail} pointerEvents="box-none">
              {tools.map((tool) => (
                <ToolButton key={tool.key} tool={tool} />
              ))}
            </View>
          )}

          {drawing && (
            <>
              <View style={styles.drawTop}>
                <Pressable
                  onPress={() => setStrokes((prev) => prev.slice(0, -1))}
                  disabled={!strokes.length}
                  style={[styles.drawAction, !strokes.length && { opacity: 0.4 }]}
                >
                  <Ionicons name="arrow-undo" size={22} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setDrawing(false)} style={styles.drawAction}>
                  <Text style={styles.drawDone}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.drawBottom}>
                <View style={styles.widths}>
                  {DRAW_WIDTHS.map((width) => (
                    <Pressable
                      key={width}
                      onPress={() => setDrawWidth(width)}
                      style={[styles.widthDot, drawWidth === width && styles.widthDotActive]}
                    >
                      <View
                        style={{
                          width: 6 + width * 400,
                          height: 6 + width * 400,
                          borderRadius: 20,
                          backgroundColor: drawColor,
                        }}
                      />
                    </Pressable>
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
                  {DRAW_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setDrawColor(color)}
                      style={[styles.swatch, { backgroundColor: color }, drawColor === color && styles.swatchActive]}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {effectsOpen && !drawing && !editingText && (
            <View style={styles.effects}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.effectsRow}>
                {STORY_FILTERS.map((item) => (
                  <Pressable key={item.key} onPress={() => setFilter(item.key)} style={styles.effectItem}>
                    <View
                      style={[
                        styles.effectSwatch,
                        { backgroundColor: item.tint ? item.tint[0].replace(/[\d.]+\)$/, "0.9)") : "#888" },
                        filter === item.key && styles.effectSwatchActive,
                      ]}
                    />
                    <Text style={styles.effectLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {!!toast && (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          {posting ? (
            <ActivityIndicator color="#fff" size="large" style={{ flex: 1 }} />
          ) : (
            <>
              <Pressable onPress={() => share("circle")} style={styles.pill}>
                {userProfilePic ? (
                  <Image source={{ uri: userProfilePic }} style={styles.pillAvatar} />
                ) : (
                  <Ionicons name="person-circle-outline" size={34} color="#fff" />
                )}
                <Text style={styles.pillText}>Your story</Text>
              </Pressable>
              <Pressable onPress={() => share("close")} style={styles.pill}>
                <View style={styles.starCircle}>
                  <Ionicons name="star" size={16} color="#fff" />
                </View>
                <Text style={styles.pillText}>Close Friends</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>

      {editingText && (
        <StoryTextEditor
          text={text}
          style={textStyle}
          onChange={(next, nextStyle) => {
            setText(next);
            setTextStyle(nextStyle);
          }}
          onDone={() => setEditingText(false)}
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
      <StoryStickerPicker
        visible={stickersOpen}
        onClose={() => setStickersOpen(false)}
        onEmoji={(emoji) => {
          addSticker({ kind: "emoji", text: emoji });
          setStickersOpen(false);
        }}
        onTime={(time) => {
          addSticker({ kind: "time", text: time });
          setStickersOpen(false);
        }}
      />
      <StoryMentionPicker
        visible={mentionOpen}
        onClose={() => setMentionOpen(false)}
        onSelect={(person) => {
          addSticker({ kind: "mention", text: person.username, userId: person.id });
          setMentionOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  flex: { flex: 1 },
  error: { position: "absolute", top: 70, left: 16, right: 16, zIndex: 40 },
  card: { flex: 1, marginHorizontal: 0, marginTop: 4, borderRadius: 28, overflow: "hidden", backgroundColor: "#000" },
  close: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
  },
  musicWrap: { position: "absolute", top: 14, left: 64, right: 16, alignItems: "center", zIndex: 9 },
  rail: { position: "absolute", top: 12, right: 10, gap: 10, alignItems: "flex-end", zIndex: 9 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  toolCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(30,30,30,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  aa: { color: "#fff", fontSize: 19, lineHeight: 22, fontWeight: "700", includeFontPadding: false, textAlignVertical: "center" },
  drawCapture: { ...StyleSheet.absoluteFillObject, zIndex: 8 },
  drawTop: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  drawAction: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawDone: { color: "#fff", fontSize: 16, fontWeight: "800" },
  drawBottom: { position: "absolute", bottom: 14, left: 0, right: 0, gap: 12, zIndex: 10 },
  widths: { flexDirection: "row", justifyContent: "center", gap: 14 },
  widthDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  widthDotActive: { borderWidth: 2, borderColor: "#fff" },
  swatches: { flexGrow: 1, justifyContent: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 6, alignItems: "center" },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" },
  swatchActive: { borderColor: "#fff", borderWidth: 4 },
  effects: { position: "absolute", bottom: 14, left: 0, right: 0, zIndex: 10 },
  effectsRow: { gap: 14, paddingHorizontal: 16 },
  effectItem: { alignItems: "center", gap: 4 },
  effectSwatch: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  effectSwatchActive: { borderColor: "#fff", borderWidth: 3 },
  effectLabel: { color: "#fff", fontSize: 11, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  toast: { position: "absolute", bottom: 70, left: 0, right: 0, alignItems: "center", zIndex: 12 },
  toastText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  bottom: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 76 },
  pill: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(40,40,42,0.95)",
  },
  pillAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: "#fff" },
  starCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#2ecc40", alignItems: "center", justifyContent: "center" },
  pillText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
