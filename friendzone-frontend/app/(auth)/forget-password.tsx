// app/(auth)/forget-password.tsx
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { HandleApiError, showToast } from "@/constants/Functions";
import AuthFormLayout from "@/components/AuthFormLayout";

type TFormData = {
  email: string;
};

export default function ForgetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const loadingDialog = useLoadingDialog();
  const { control, handleSubmit } = useForm<TFormData>();

  const onSubmit = async (formData: TFormData) => {
    const email = formData.email.trim();
    try {
      loadingDialog.show();
      const res = await AuthServices.forgetPassword({ email });
      showToast("success", res.message);
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email, purpose: "forgot-password" },
      });
    } catch (err) {
      HandleApiError(err);
    } finally {
      loadingDialog.hide();
    }
  };

  return (
    <AuthFormLayout>
      <ThemedView style={styles.container}>
        <AppLogo showText text="Forgot Password?" textStyle={styles.logoText} />

        <ThemedView style={styles.formContainer}>
          <Controller
            control={control}
            name="email"
            rules={{ required: "Email is required" }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
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
            title="Send OTP"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />
          <TouchableOpacity
            style={styles.backtologin}
            onPress={() => router.back()}
          >
            <ThemedText
              style={{ fontSize: 14, fontWeight: 600 }}
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
    gap: 50,
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
  backtologin: {
    alignSelf: "center",
    marginTop: 50,
  },
  submitButton: {
    marginTop: 8,
  },
});
