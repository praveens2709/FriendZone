import React from "react";
import {
  Image,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { AntDesign } from "@expo/vector-icons";
import { ThemedView } from "./ThemedView";

type Story = {
  id: string;
  name: string;
  image: string;
  isOwnStory?: boolean;
  seen?: boolean;
};

export default function StoryItem({
  item,
  colors,
  router,
}: {
  item: Story;
  colors: any;
  router: any;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (item.isOwnStory) {
      router.push(`/(stories)/${item.id}`);
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
                : colors.textSecondary,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image source={{ uri: item.image }} style={styles.image} />

          {item.isOwnStory && (
            <Pressable
              onPress={handleAddStory}
              style={[
                styles.plusIcon,
                { backgroundColor: colors.background },
              ]}
              hitSlop={10}
            >
              <AntDesign
                name="pluscircleo"
                size={18}
                color={colors.text}
              />
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