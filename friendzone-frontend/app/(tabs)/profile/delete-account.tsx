import { useConfirm } from "@/components/ConfirmProvider";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import CommonHeader from "@/components/CommonHeader";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import InlineError from "@/components/InlineError";
import SafetyService from "@/services/SafetyService";
import { removeAuthSession } from "@/utils/auth-storage";

export default function DeleteAccountScreen() {
  const confirm = useConfirm();
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = () => {
    if (!password || !accessToken) return;

    confirm({ title: "Delete your account?", message: "Your profile, posts, messages you sent, knocks and meetings will be permanently deleted. This cannot be undone.", confirmLabel: "Delete forever", onConfirm: async () => {
            try {
              setSubmitting(true);
              setDeleteError("");
              await SafetyService.deleteAccount(password, accessToken);
              await removeAuthSession();
              await signOut();
              router.replace("/(auth)/AuthChoice");
            } catch (error: any) {
              setDeleteError(error?.response?.data?.message || "Couldn't delete your account. Try again.");
            } finally {
              setSubmitting(false);
            }
          } });
  };

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.container}>
        <CommonHeader title="Delete account" leftContent={<BackButton color={colors.text} />} />
        <ThemedView style={styles.content}>
          <ThemedText style={styles.copy}>
            Deleting your account permanently removes your profile, posts, knocks,
            meetings and the messages you sent. Enter your password to confirm.
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setDeleteError("");
            }}
          />
          <InlineError message={deleteError} style={{ textAlign: "left" }} />
          <Button
            title={submitting ? "Deleting..." : "Delete my account"}
            onPress={confirmDelete}
            disabled={submitting || !password}
          />
        </ThemedView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  copy: { lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
