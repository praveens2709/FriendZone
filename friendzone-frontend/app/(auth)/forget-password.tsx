import React from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { getApiError } from "@/constants/Functions";
import AuthFormLayout from "@/components/AuthFormLayout";

type TFormData = {
  email: string;
};

export default function ForgetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const loadingDialog = useLoadingDialog();
  const params = useLocalSearchParams<{ email?: string }>();
  const { control, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<TFormData>({
    defaultValues: { email: params.email ? String(params.email) : "" },
  });

  const onSubmit = async (formData: TFormData) => {
    const email = formData.email.trim();
    try {
      loadingDialog.show();
      await AuthServices.forgetPassword({ email });
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email, purpose: "forgot-password" },
      });
    } catch (err) {
      setError("email", { type: "server", message: getApiError(err).message });
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
              <>
                <ThemedView style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.input,
                      { 
                        color: colors.text, 
                        backgroundColor: colors.backgroundSecondary,
                      borderColor: errors.email ? colors.error : colors.border 
                      },
                    ]}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (errors.email) clearErrors("email");
                    }}
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
              style={{ fontSize: 14, fontWeight: 500 }}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1.5,
    borderRadius: 16,
    fontSize: 16,
    height: 56,
  },
  backtologin: {
    alignSelf: "center",
    marginTop: 50,
  },
  submitButton: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 10,
    marginBottom: 10,
  },
});