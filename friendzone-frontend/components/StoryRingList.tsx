import React from "react";
import {
  FlatList,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import StoryItem from "./StoryItem";
import { ThemedView } from "./ThemedView";

type Story = {
  id: string;
  name: string;
  image: string;
  isOwnStory?: boolean;
  seen?: boolean;
};

const mockStories: Story[] = [
  {
    id: "1",
    name: "Your Story",
    image: "https://i.pravatar.cc/100?img=68",
    isOwnStory: true,
  },
  {
    id: "2",
    name: "Alice",
    image: "https://i.pravatar.cc/100?img=32",
    seen: false,
  },
  {
    id: "3",
    name: "Bob",
    image: "https://i.pravatar.cc/100?img=23",
    seen: true,
  },
  {
    id: "4",
    name: "Charlie",
    image: "https://i.pravatar.cc/100?img=12",
    seen: false,
  },
  {
    id: "5",
    name: "David",
    image: "https://i.pravatar.cc/100?img=45",
    seen: true,
  },
];

export default function StoryRingList() {
  const { colors } = useTheme();
  const router = useRouter();

  const sortedStories = [
    ...mockStories.filter((s) => s.isOwnStory),
    ...mockStories.filter((s) => !s.isOwnStory && !s.seen),
    ...mockStories.filter((s) => !s.isOwnStory && s.seen),
  ];

  return (
    <ThemedView style={styles.listContainer}>
      <FlatList
        data={sortedStories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StoryItem item={item} colors={colors} router={router} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 10,
    paddingLeft: 12,
  },
});
