import React, { memo, useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";

interface PostImage {
  url: string;
  public_id: string;
}

interface PostImageCarouselProps {
  images: PostImage[];
}

const PostImageCarousel = ({ images }: PostImageCarouselProps) => {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  const onPageScroll = useCallback((e: { nativeEvent: { position: number; offset: number } }) => {
    const next = Math.round(e.nativeEvent.position + e.nativeEvent.offset);
    setIndex((current) => (current === next ? current : next));
  }, []);

  if (images.length <= 1) {
    return (
      <Image
        source={{ uri: images[0]?.url }}
        style={styles.fill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
    );
  }

  return (
    <View style={styles.fill}>
      <PagerView
        style={styles.fill}
        initialPage={0}
        offscreenPageLimit={2}
        overScrollMode="never"
        onPageScroll={onPageScroll}
      >
        {images.map((image) => (
          <View key={image.public_id} collapsable={false} style={styles.fill}>
            <Image
              source={{ uri: image.url }}
              style={styles.fill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>
        ))}
      </PagerView>
      <View style={styles.dotsRow} pointerEvents="none">
        {images.map((image, i) => (
          <View
            key={image.public_id}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.primary : "rgba(255,255,255,0.7)" },
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.counter} pointerEvents="none">
        <ThemedText style={styles.counterText}>
          {index + 1}/{images.length}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 8, height: 8, borderRadius: 4 },
  counter: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  counterText: { fontSize: 12, lineHeight: 16, fontWeight: "bold", color: "#fff" },
});

export default memo(PostImageCarousel);
