// AuthFormLayout.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import ThemedSafeArea from "@/components/ThemedSafeArea"; 
import { ThemedView } from "./ThemedView";

type Props = {
  children: React.ReactNode;
};

const AuthFormLayout = ({ children }: Props) => {
  const { colors } = useTheme();

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradient}>
      <ThemedSafeArea style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView
          style={styles.wrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ThemedView style={{ flex: 1}}>{children}</ThemedView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </ThemedSafeArea>
    </LinearGradient>
  );
};

export default AuthFormLayout;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});