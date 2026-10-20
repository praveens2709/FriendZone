import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import ProfileServices from "@/services/ProfileService";
import { getApiError } from "@/constants/Functions";

interface PhoneModalProps {
  visible: boolean;
  onClose: () => void;
  phone: string | undefined;
}

export default function PhoneModal({ visible, onClose, phone }: PhoneModalProps) {
  const { colors } = useTheme();
  const { fetchProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setEditing(false);
      setValue("");
      setError("");
    }
  }, [visible]);

  const save = async (next: string | null) => {
    setError("");
    try {
      setBusy(true);
      await ProfileServices.updatePhone(next);
      await fetchProfile();
      setEditing(false);
      setValue("");
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = () =>
    Alert.alert("Remove your number?", "You can add it again any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => save(null) },
    ]);

  return (
    <ThemedModal visible={visible} onClose={onClose} containerStyle={styles.modalContainer}>
      <ThemedView style={styles.modalHeader}>
        <TouchableOpacity onPress={editing ? () => setEditing(false) : onClose}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.placeholderView} />
      </ThemedView>

      <ThemedText style={[styles.title, { color: colors.text }]}>{phone || "No phone number"}</ThemedText>
      <ThemedText style={[styles.description, { color: colors.textDim }]}>
        {phone
          ? "This number is on your account. Other people can't see it."
          : "Add a number to help recover your account. Other people can't see it."}
      </ThemedText>

      {editing ? (
        <>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
            autoFocus
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          />
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <Button title={busy ? "Saving..." : "Save number"} onPress={() => save(value)} disabled={busy || !value.trim()} />
        </>
      ) : (
        <>
          <Button title={phone ? "Change number" : "Add a number"} onPress={() => setEditing(true)} />
          {!!phone && <Button title="Remove number" variant="outline" onPress={confirmRemove} disabled={busy} />}
          {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </>
      )}
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  placeholderView: { width: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  input: { height: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, marginBottom: 12 },
  error: { fontSize: 13, marginVertical: 8 },
});
