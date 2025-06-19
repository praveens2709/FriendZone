import { Stack } from "expo-router";

export default function StoriesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen
        name="camera"
      />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}