import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
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
import { HandleApiError, showToast } from "@/constants/Functions";

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
  //   console.log("yeassss",email, otp)

  const { control, handleSubmit, watch } = useForm<ResetPasswordForm>();

  const passwordValue = watch("password");

  const onSubmit = async (formData: ResetPasswordForm) => {
    const password = formData.password.trim();

    try {
      loadingDialog.show();
      console.log("reset-password payload", {
        email,
        otp,
        newPassword: password,
      });
      const res = await AuthServices.resetPassword({
        email,
        otp,
        newPassword: password,
      });
      showToast("success", res.message);
      router.replace("/(auth)/login");
    } catch (err) {
      HandleApiError(err);
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
            rules={{ required: "Password is required" }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="New Password"
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={colors.textDim}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={value}
                onChangeText={onChange}
              />
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
              <TextInput
                placeholder="Confirm New Password"
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={colors.textDim}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={value}
                onChangeText={onChange}
              />
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
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  resetButton: {
    marginTop: 8,
  },
  backtologin: {
    alignSelf: "center",
    marginTop: 50,
  },
});
