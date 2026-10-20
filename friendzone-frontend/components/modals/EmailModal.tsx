import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import AuthServices from "@/services/AuthService";
import { getApiError } from "@/constants/Functions";

interface EmailModalProps {
  visible: boolean;
  onClose: () => void;
  email: string | undefined;
}

type Step = "view" | "form" | "code";

export default function EmailModal({ visible, onClose, email }: EmailModalProps) {
  const { colors } = useTheme();
  const { fetchProfile } = useAuth();
  const [step, setStep] = useState<Step>("view");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setStep("view");
      setNewEmail("");
      setPassword("");
      setCode("");
      setError("");
    }
  }, [visible]);

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
  ];

  const requestChange = async () => {
    setError("");
    if (!newEmail.trim() || !password) {
      setError("Enter the new email and your password.");
      return;
    }
    try {
      setBusy(true);
      await AuthServices.requestEmailChange({ newEmail: newEmail.trim(), password });
      setStep("code");
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = async () => {
    setError("");
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    try {
      setBusy(true);
      await AuthServices.confirmEmailChange(code.trim());
      await fetchProfile();

      onClose();
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedModal visible={visible} onClose={onClose} containerStyle={styles.modalContainer}>
      <ThemedView style={styles.modalHeader}>
        <TouchableOpacity onPress={step === "view" ? onClose : () => setStep("view")}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.placeholderView} />
      </ThemedView>

      <ThemedText style={[styles.title, { color: colors.text }]}>{email || "No email"}</ThemedText>

      {step === "view" && (
        <>
          <View style={[styles.verified, { backgroundColor: colors.success + "22" }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.verifiedText, { color: colors.text }]}>Verified</Text>
          </View>
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            This is the email you sign in with and where we send verification codes. Other people can't see it.
          </ThemedText>
          <Button title="Change email address" onPress={() => setStep("form")} />
        </>
      )}

      {step === "form" && (
        <>
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            We'll send a code to your new email to make sure it's yours.
          </ThemedText>
          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="New email address"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            autoCapitalize="none"
            style={inputStyle}
          />
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <Button title={busy ? "Sending..." : "Send code"} onPress={requestChange} disabled={busy} />
        </>
      )}

      {step === "code" && (
        <>
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            Enter the 6-digit code we sent to {newEmail.trim()}.
          </ThemedText>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={6}
            style={[inputStyle, styles.codeInput]}
          />
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <Button title={busy ? "Checking..." : "Confirm"} onPress={confirmChange} disabled={busy} />
        </>
      )}
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  placeholderView: { width: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  verified: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  verifiedText: { fontSize: 12, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  input: { height: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, marginBottom: 12 },
  codeInput: { textAlign: "center", fontSize: 24, letterSpacing: 6, fontWeight: "800" },
  error: { fontSize: 13, marginBottom: 10 },
});
