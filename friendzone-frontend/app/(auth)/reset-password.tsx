import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AuthFormLayout from "@/components/AuthFormLayout";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { Ionicons } from "@expo/vector-icons";

type TRouteProp = RouteProp<
  {
    ResetPassword: {
      email: string;
      otp: string;
    };
  },
  "ResetPassword"
>;

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const loadingDialog = useLoadingDialog();
  const route = useRoute<TRouteProp>();
  const { email, otp } = route?.params;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, watch, formState: { errors }, setError } = useForm<ResetPasswordForm>();

  const passwordValue = watch("password");

  const onSubmit = async (formData: ResetPasswordForm) => {
    const password = formData.password.trim();

    try {
      loadingDialog.show();
      await AuthServices.resetPassword({
        email,
        otp,
        newPassword: password,
      });
      router.replace({ pathname: "/(auth)/login", params: { email } });
    } catch (err) {
        const serverMessage = (err as any)?.response?.data?.message || "An unknown error occurred.";
        setError("password", { type: "server", message: serverMessage });
    } finally {
      loadingDialog.hide();
    }
  };

  return (
    <AuthFormLayout>
      <ThemedView style={styles.container}>
        <AppLogo showText text="Reset Password" textStyle={styles.logoText} />

        <ThemedView style={styles.formContainer}>
          <Controller
            control={control}
            name="password"
            rules={{
              required: "New password is required.",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters.",
              },
              pattern: {
                value: /^(?=.*[A-Z])(?=.*[!$@%])(?=.*[0-9]).{6,}$/,
                message: "Password must include a capital letter, number, and special character.",
              },
            }}
            render={({ field: { onChange, value } }) => (
              <>
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    placeholder="New Password"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.input,
                      { 
                        color: colors.text, 
                        backgroundColor: colors.backgroundSecondary,
                      borderColor: errors.password ? colors.error : colors.border 
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
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
                {errors.password && (
                  <ThemedText style={[styles.errorText, { color: colors.error }]}>
                    {errors.password.message}
                  </ThemedText>
                )}
              </>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: "Confirm password is required",
              validate: (val) =>
                val === passwordValue || "Passwords do not match",
            }}
            render={({ field: { onChange, value } }) => (
              <>
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Confirm New Password"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.input,
                      { 
                        color: colors.text, 
                        backgroundColor: colors.backgroundSecondary,
                      borderColor: errors.confirmPassword ? colors.error : colors.border 
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
                {errors.confirmPassword && (
                  <ThemedText style={[styles.errorText, { color: colors.error }]}>
                    {errors.confirmPassword.message}
                  </ThemedText>
                )}
              </>
            )}
          />

          <Button
            title="Reset Password"
            onPress={handleSubmit(onSubmit)}
            style={styles.resetButton}
          />

          <TouchableOpacity
            style={styles.backtologin}
            onPress={() => router.push("/(auth)/login")}
          >
            <ThemedText
              style={{fontSize: 14, fontWeight: 600 }}
            >
              Back to Login
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    padding: 15,
    borderWidth: 1.5,
    borderRadius: 16,
    fontSize: 16,
    height: 56,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
  },
  resetButton: {
    marginTop: 8,
  },
  backtologin: {
    alignSelf: "center",
    marginTop: 50,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 10,
    marginBottom: 10,
  },
});