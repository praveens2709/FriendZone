import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  SafeAreaView,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "./ThemedSafeArea";

export default function AuthScreenWrapper({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <ThemedSafeArea style={[styles.safeArea, style]}>{children}</ThemedSafeArea>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
});
