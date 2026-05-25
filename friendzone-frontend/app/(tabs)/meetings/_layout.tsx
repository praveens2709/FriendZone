import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function MeetingsLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false, // We'll use custom headers or screen headers
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="create" options={{ headerShown: false }} />
        </Stack>
    );
}
