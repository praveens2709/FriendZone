// app/_layout.tsx
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LoadingDialogProvider } from "@/context/LoadingContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import React from "react";
import Toast from "react-native-toast-message";
import CustomToast from "@/components/CustomToast";

function RootLayoutContent() {
  const { colors } = useTheme();
  const { authLoading } = useAuth();

  if (authLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Slot />
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

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <LoadingDialogProvider>
          <AuthProvider>
            <RootLayoutContent />
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
