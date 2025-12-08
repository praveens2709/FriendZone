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

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onCloseAll: () => void;
  email: string;
}

type TFormData = {
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
};

export default function ResetPasswordModal({
  visible,
  onClose,
  onCloseAll,
  email,
}: ResetPasswordModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<TFormData>();

  const onSubmit = async (formData: TFormData) => {
    setLoading(true);
    try {
      await AuthServices.resetPassword({
        email,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });

      reset();
      onCloseAll();
    } catch (err: unknown) {
      const serverMessage = (err as any)?.response?.data?.message || "An unknown error occurred.";
      if (serverMessage.includes("Invalid or expired OTP")) {
        setError("otp", { type: "server", message: serverMessage });
      } else {
        setError("newPassword", { type: "server", message: serverMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordValidationRules = {
    required: "Password is required.",
    minLength: {
      value: 6,
      message: "Password must be at least 6 characters.",
    },
    pattern: {
      value: /^(?=.*[A-Z])(?=.*[!$@%])(?=.*[0-9]).{6,}$/,
      message: "Password must include a capital letter, number, and special character.",
    },
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
          Reset Password
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
            Enter the code sent to your email and your new password.
          </ThemedText>

          <ThemedView style={styles.inputContainer}>
            <Controller
              control={control}
              name="otp"
              rules={{ required: "OTP is required." }}
              render={({ field: { onChange, value } }) => (
                <>
                  <ThemedView style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.buttonBackgroundSecondary,
                          color: colors.text,
                          borderColor: errors.otp ? colors.error : colors.border,
                        },
                      ]}
                      placeholder="Verification Code"
                      placeholderTextColor={colors.textDim}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                    />
                  </ThemedView>
                  {errors.otp && (
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      {errors.otp.message}
                    </ThemedText>
                  )}
                </>
              )}
            />

            <Controller
              control={control}
              name="newPassword"
              rules={passwordValidationRules}
              render={({ field: { onChange, value } }) => (
                <>
                  <ThemedView style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.buttonBackgroundSecondary,
                          color: colors.text,
                          borderColor: errors.newPassword ? colors.error : colors.border,
                        },
                      ]}
                      placeholder="New password"
                      placeholderTextColor={colors.textDim}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.textDim}
                      />
                    </TouchableOpacity>
                  </ThemedView>
                  {errors.newPassword && (
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      {errors.newPassword.message}
                    </ThemedText>
                  )}
                </>
              )}
            />

            <Controller
              control={control}
              name="confirmNewPassword"
              rules={{
                required: "Please confirm your new password.",
                validate: (value) =>
                  value === control._formValues.newPassword || "Passwords do not match.",
              }}
              render={({ field: { onChange, value } }) => (
                <>
                  <ThemedView style={styles.inputWrapper}>
                    <TextInput
                      placeholder="Confirm new password"
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor={colors.textDim}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.buttonBackgroundSecondary,
                          color: colors.text,
                          borderColor: errors.confirmNewPassword ? colors.error : colors.border,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.textDim}
                      />
                    </TouchableOpacity>
                  </ThemedView>
                  {errors.confirmNewPassword && (
                    <ThemedText style={[styles.errorText, { color: colors.error }]}>
                      {errors.confirmNewPassword.message}
                    </ThemedText>
                  )}
                </>
              )}
            />
          </ThemedView>
        </ThemedScrollView>
      </KeyboardAvoidingView>
      <Button
        title="Reset Password"
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
  eyeIcon: {
    position: 'absolute',
    right: 15,
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
    marginBottom: 10,
  },
});
