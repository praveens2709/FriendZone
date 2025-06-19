// app/(tabs)/index.tsx (Updated with CommonHeader and ThemedSafeArea correctly)
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import StoryRingList from "@/components/StoryRingList";
import CommonHeader from "@/components/CommonHeader";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { LinearGradient } from "expo-linear-gradient";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/AuthChoice" />;

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
    <ThemedSafeArea style={styles.container}>
      <CommonHeader
        leftContent={<ThemedText style={styles.title}>FriendZone</ThemedText>}
        rightContent1={
          <TouchableOpacity
            onPress={() => {
            }}
          >
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        }
        rightContent2={
          <TouchableOpacity onPress={() => router.push("/(chat)")}>
            <Feather name="send" size={22} color={colors.text} />
          </TouchableOpacity>
        }
        
        showBottomBorder={true}
      />
      <StoryRingList />
    </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  }
});
