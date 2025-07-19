import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LoadingDialogProvider } from "@/context/LoadingContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { StyleSheet, ActivityIndicator } from "react-native";
import React from "react";
import Toast from "react-native-toast-message";
import CustomToast from "@/components/CustomToast";
import { ThemedView } from "@/components/ThemedView";

function RootLayoutContent() {
  const { colors } = useTheme();
  const { authLoading } = useAuth();

  if (authLoading) {
    return (
      <ThemedView style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(stories)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(chat)" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar
        style={colors.isDark ? "light" : "dark"}
        translucent={true}
        backgroundColor="transparent"
      />
      <Toast
        config={{
          success: (props) => <CustomToast {...props} />,
          error: (props) => <CustomToast {...props} />,
          info: (props) => <CustomToast {...props} />,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    console.log("Fonts not loaded yet.");
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <LoadingDialogProvider>
          <AuthProvider>
            {/* Wrap RootLayoutContent with SocketProvider */}
            <SocketProvider>
              <RootLayoutContent />
            </SocketProvider>
          </AuthProvider>
        </LoadingDialogProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});