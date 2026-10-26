import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  STICKER_BASE_SIZE,
  STICKER_REFERENCE_WIDTH,
  StorySticker,
} from "@/constants/storyDecor";

type Props = {
  stickers: StorySticker[];
  width: number;
  height: number;
  // Present only while editing; viewers get a read-only layer.
  onChange?: (stickers: StorySticker[]) => void;
  onMentionPress?: (userId: string) => void;
};

function StickerBody({ sticker, unit }: { sticker: StorySticker; unit: number }) {
  if (sticker.kind === "emoji") {
    return <Text style={{ fontSize: unit * STICKER_BASE_SIZE, lineHeight: unit * STICKER_BASE_SIZE * 1.2 }}>{sticker.text}</Text>;
  }
  const size = unit * 20;
  return (
    <View style={[styles.pill, { paddingHorizontal: size * 0.7, paddingVertical: size * 0.35, borderRadius: size }]}>
      <Text style={[styles.pillText, { fontSize: size }]}>
        {sticker.kind === "mention" ? `@${sticker.text}` : sticker.text}
      </Text>
    </View>
  );
}

function EditableSticker({
  sticker,
  width,
  height,
  selected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  sticker: StorySticker;
  width: number;
  height: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<StorySticker>) => void;
  onRemove: () => void;
}) {
  const unit = (width / STICKER_REFERENCE_WIDTH) * sticker.scale;
  const [box, setBox] = useState({ width: 0, height: 0 });
  const start = useRef({ x: sticker.x, y: sticker.y, scale: sticker.scale, rotation: sticker.rotation });
  const latest = useRef(sticker);
  latest.current = sticker;

  const begin = () => {
    start.current = {
      x: latest.current.x,
      y: latest.current.y,
      scale: latest.current.scale,
      rotation: latest.current.rotation,
    };
    onSelect();
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => {
      onUpdate({
        x: Math.min(Math.max(start.current.x + e.translationX / width, 0.02), 0.98),
        y: Math.min(Math.max(start.current.y + e.translationY / height, 0.02), 0.98),
      });
    });
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => onUpdate({ scale: Math.min(Math.max(start.current.scale * e.scale, 0.3), 6) }));
  const rotate = Gesture.Rotation()
    .runOnJS(true)
    .onBegin(begin)
    .onUpdate((e) => onUpdate({ rotation: start.current.rotation + (e.rotation * 180) / Math.PI }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch, rotate)}>
      <View
        onLayout={(e) => setBox(e.nativeEvent.layout)}
        style={[
          styles.holder,
          {
            left: sticker.x * width - box.width / 2,
            top: sticker.y * height - box.height / 2,
            opacity: box.width ? 1 : 0,
            transform: [{ rotate: `${sticker.rotation}deg` }],
            zIndex: selected ? 6 : 5,
          },
        ]}
      >
        <StickerBody sticker={sticker} unit={unit} />
        {selected && (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.remove}>
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        )}
      </View>
    </GestureDetector>
  );
}

function StaticSticker({
  sticker,
  width,
  height,
  onMentionPress,
}: {
  sticker: StorySticker;
  width: number;
  height: number;
  onMentionPress?: (userId: string) => void;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const unit = (width / STICKER_REFERENCE_WIDTH) * sticker.scale;
  const tappable = sticker.kind === "mention" && !!sticker.userId && !!onMentionPress;
  return (
    <Pressable
      disabled={!tappable}
      onPress={() => onMentionPress?.(sticker.userId as string)}
      onLayout={(e) => setBox(e.nativeEvent.layout)}
      pointerEvents={tappable ? "auto" : "none"}
      style={[
        styles.holder,
        {
          left: sticker.x * width - box.width / 2,
          top: sticker.y * height - box.height / 2,
          opacity: box.width ? 1 : 0,
          transform: [{ rotate: `${sticker.rotation}deg` }],
        },
      ]}
    >
      <StickerBody sticker={sticker} unit={unit} />
    </Pressable>
  );
}

export default function StoryStickerLayer({ stickers, width, height, onChange, onMentionPress }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => setSelectedId(null), 2500);
    return () => clearTimeout(timer);
  }, [selectedId, stickers]);

  if (!stickers.length) return null;

  if (!onChange) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {stickers.map((sticker) => (
          <StaticSticker
            key={sticker.id}
            sticker={sticker}
            width={width}
            height={height}
            onMentionPress={onMentionPress}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {stickers.map((sticker) => (
        <EditableSticker
          key={sticker.id}
          sticker={sticker}
          width={width}
          height={height}
          selected={selectedId === sticker.id}
          onSelect={() => setSelectedId(sticker.id)}
          onUpdate={(patch) => onChange(stickers.map((item) => (item.id === sticker.id ? { ...item, ...patch } : item)))}
          onRemove={() => {
            setSelectedId(null);
            onChange(stickers.filter((item) => item.id !== sticker.id));
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { position: "absolute" },
  pill: { backgroundColor: "rgba(255,255,255,0.92)" },
  pillText: { color: "#111", fontWeight: "800" },
  remove: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
});
