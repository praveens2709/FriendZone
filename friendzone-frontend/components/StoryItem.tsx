import React from "react";
import {
  Image,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "./ThemedView";
import { StoryRingItem } from "@/types/story.type";


export default function StoryItem({
  item,
  colors,
  router,
}: {
  item: StoryRingItem;
  colors: any;
  router: any;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const unseenRing = !item.isOwnStory && !item.seen && !item.empty;

  const handlePress = () => {
    if (item.empty) {
      router.push("/(stories)/camera");
    } else {
      router.push(`/(stories)/${item.id}`);
    }
  };

  const handleAddStory = () => {
    router.push('/(stories)/camera');
  };

  return (
    <Pressable
      onPressIn={() => {
        Animated.spring(scaleAnim, {
          toValue: 0.92,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }}
      onPress={handlePress}
    >
      <ThemedView style={styles.itemContainer}>
        <Animated.View
          style={[
            styles.storyRing,
            {
              borderColor: item.isOwnStory
                ? colors.border
                : item.seen
                ? colors.border
                : "transparent",
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {unseenRing && (
            <LinearGradient
              pointerEvents="none"
              colors={["#F9CE34", "#EE2A7B", "#6228D7"]}
              start={{ x: 0.1, y: 1 }}
              end={{ x: 0.9, y: 0 }}
              style={styles.ring}
            />
          )}
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={[styles.image, unseenRing && { borderWidth: 3, borderColor: colors.background }]}
            />
          ) : (
            <ThemedView style={[styles.image, { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="person" size={34} color={colors.textDim} />
            </ThemedView>
          )}

          {item.isOwnStory && (
            <Pressable
              onPress={handleAddStory}
              style={[
                styles.plusIcon,
                { backgroundColor: colors.background },
              ]}
              hitSlop={10}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.text} />
            </Pressable>
          )}
        </Animated.View>
        <ThemedText style={styles.nameText} numberOfLines={1}>
          {item.name}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    alignItems: "center",
    marginRight: 14,
    width: 80,
  },
  storyRing: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 50,
  },
  image: {
    width: 73,
    height: 73,
    borderRadius: 50,
  },
  plusIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 999,
  },
  nameText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});