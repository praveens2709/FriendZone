import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedModal from "@/components/ThemedModal";
import Button from "@/components/Button";
import ThemedScrollView from "../ThemedScrollView";
import AuthServices from "@/services/AuthService";

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onResetPassword: (email: string) => void;
}

type TFormData = {
  email: string;
};

export default function ForgotPasswordModal({
  visible,
  onClose,
  onResetPassword,
}: ForgotPasswordModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TFormData>();

  const onSubmit = async (formData: TFormData) => {
    setLoading(true);
    try {
      await AuthServices.forgetPassword({ email: formData.email });
      onResetPassword(formData.email);
    } catch (err: unknown) {
      const serverMessage = (err as any)?.response?.data?.message || "An unknown error occurred.";
      setError("email", { type: "server", message: serverMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      containerStyle={styles.modalContainer}
    >
      <ThemedView style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: colors.text }]}>
          Forgot Password
        </ThemedText>
        <View style={styles.placeholderView} />
      </ThemedView>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ThemedScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={[styles.description, { color: colors.textDim }]}>
            Enter the email associated with your account and we'll send a code to reset your password.
          </ThemedText>

          <Controller
            control={control}
            name="email"
            rules={{
              required: "Email is required.",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Please enter a valid email address.",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <>
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.buttonBackgroundSecondary,
                        color: colors.text,
                        borderColor: errors.email ? colors.error : colors.border,
                      },
                    ]}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textDim}
                    value={value}
                    onChangeText={onChange}
                  />
                </ThemedView>
                {errors.email && (
                  <ThemedText style={[styles.errorText, { color: colors.error }]}>
                    {errors.email.message}
                  </ThemedText>
                )}
              </>
            )}
          />
        </ThemedScrollView>
      </KeyboardAvoidingView>
      <Button
        title="Send Reset Code"
        onPress={handleSubmit(onSubmit)}
        style={styles.changePasswordButton}
        textStyle={{ color: colors.buttonText }}
        disabled={loading}
      >
        {loading && <ActivityIndicator color={colors.buttonText} />}
      </Button>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholderView: {
    width: 24,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
    gap: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    paddingRight: 50,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 20,
  },
  changePasswordButton: {
    marginBottom: Platform.OS === "ios" ? 20 : 40,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 10,
    marginTop: 10,
  },
});