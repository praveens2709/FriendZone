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
import { useAuth } from "@/context/AuthContext";
import AuthServices from "@/services/AuthService";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onCloseAll: () => void;
  onForgotPassword: () => void;
}

type TFormData = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export default function ChangePasswordModal({
  visible,
  onClose,
  onCloseAll,
  onForgotPassword,
}: ChangePasswordModalProps) {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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
      if (!accessToken) {
        setError("currentPassword", {
          type: "manual",
          message: "User not authenticated.",
        });
        return;
      }
      
      await AuthServices.changePassword(accessToken, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      reset();
      onCloseAll();

    } catch (err: unknown) {
      const serverMessage = (err as any)?.response?.data?.message || "An unknown error occurred.";

      if (serverMessage.includes("Invalid current password")) {
        setError("currentPassword", {
          type: "server",
          message: serverMessage,
        });
      } else {
        setError("newPassword", {
            type: "server",
            message: serverMessage,
        });
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
          Change password
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
            Your password must be at least 6 characters and should include a
            combination of numbers, letters and special characters (!$@%), at least one capital letter, at least one special character, at least one number.
          </ThemedText>

          <ThemedView style={styles.inputContainer}>
            <Controller
              control={control}
              name="currentPassword"
              rules={{ required: "Current password is required." }}
              render={({ field: { onChange, value } }) => (
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.buttonBackgroundSecondary,
                        color: colors.text,
                        borderColor: errors.currentPassword ? colors.error : colors.border,
                      },
                    ]}
                    placeholder="Current password"
                    placeholderTextColor={colors.textDim}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textDim}
                    />
                  </TouchableOpacity>
                </ThemedView>
              )}
            />
            {errors.currentPassword && (
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {errors.currentPassword.message}
              </ThemedText>
            )}

            <Controller
              control={control}
              name="newPassword"
              rules={passwordValidationRules}
              render={({ field: { onChange, value } }) => (
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
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textDim}
                    />
                  </TouchableOpacity>
                </ThemedView>
              )}
            />
            {errors.newPassword && (
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {errors.newPassword.message}
              </ThemedText>
            )}

            <Controller
              control={control}
              name="confirmNewPassword"
              rules={{
                required: "Please confirm your new password.",
                validate: (value) =>
                  value === control._formValues.newPassword || "Passwords do not match.",
              }}
              render={({ field: { onChange, value } }) => (
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.buttonBackgroundSecondary,
                        color: colors.text,
                        borderColor: errors.confirmNewPassword ? colors.error : colors.border,
                      },
                    ]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textDim}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!showConfirmPassword}
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
              )}
            />
            {errors.confirmNewPassword && (
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {errors.confirmNewPassword.message}
              </ThemedText>
            )}
          </ThemedView>
          <TouchableOpacity onPress={onForgotPassword}>
            <ThemedText
              style={[styles.forgotPassword, { color: colors.accent }]}
            >
              Forgotten your password?
            </ThemedText>
          </TouchableOpacity>
        </ThemedScrollView>
      </KeyboardAvoidingView>
      <Button
        title="Change Password"
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
