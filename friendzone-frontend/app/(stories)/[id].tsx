import React, { useMemo, useState, useEffect } from "react";
import StoryViewer from "@/components/StoryViewer";
import { useLocalSearchParams, useRouter } from "expo-router";
import { mockStories } from "@/utils/mockStories";
import { StatusBar } from "expo-status-bar";
import ThemedSafeArea from "@/components/ThemedSafeArea"; // Assuming this path is correct

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const initialIndex = useMemo(() => mockStories.findIndex((u) => u.id === id), [id]);
  const [userIndex, setUserIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex === -1 && id) {
      router.back();
    }
  }, [initialIndex, id, router]);

  const user = mockStories[userIndex];
  if (!user) {
    return null;
  }

  return (
    <ThemedSafeArea style={{ flex: 1, backgroundColor: "black" }}>
      <StatusBar hidden />
      <StoryViewer
        key={user.id}
        user={user}
        stories={user.stories}
        onClose={() => router.back()}
        onNextUser={() => {
          if (userIndex < mockStories.length - 1) {
            setUserIndex(userIndex + 1);
          } else {
            router.back();
          }
        }}
        onPrevUser={() => {
          if (userIndex > 0) {
            setUserIndex(userIndex - 1);
          } else {
            router.back();
          }
        }}
      />
    </ThemedSafeArea>
  );
}