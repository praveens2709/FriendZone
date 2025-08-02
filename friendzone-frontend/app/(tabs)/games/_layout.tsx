import { Stack } from "expo-router";

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Add other tabbed screens like InviteFriendsToGameScreen here if needed */}
    </Stack>
  );
}
