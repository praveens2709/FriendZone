import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import EmailSuggestion from "@/components/EmailSuggestion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { getApiError } from "@/constants/Functions";
import AuthFormLayout from "@/components/AuthFormLayout";

interface LoginScreenProps {
  isModal?: boolean;
  onSwitchToSignup?: () => void;
  onCloseModal?: () => void;
}

type TFormData = {
  email: string;
  password: string;
};

export default function LoginScreen({
  isModal = false,
  onSwitchToSignup,
  onCloseModal,
}: LoginScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const { control, handleSubmit, setError, clearErrors, getValues, formState: { errors } } = useForm<TFormData>({
    defaultValues: { email: params.email ? String(params.email) : "", password: "" },
  });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const loadingDialog = useLoadingDialog();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (formData: TFormData) => {
    const credentials = { email: formData.email.trim(), password: formData.password };
    setNeedsVerification(false);
    try {
      loadingDialog.show();
      const response = await AuthServices.signIn(credentials);
      if (response) {
        await auth.signIn({
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          theme: response.theme,
        });
        onCloseModal?.();
        router.replace("/home");
      }
    } catch (error) {
      const { message, code } = getApiError(error);
      if (code === "INVALID_CREDENTIALS" || code === "WRONG_PASSWORD") {
        setError("password", { type: "server", message });
      } else if (code === "NOT_VERIFIED") {
        setError("email", { type: "server", message });
        setNeedsVerification(true);
        setLoginEmail(credentials.email);
        setLoginPassword(credentials.password);
      } else if (code === "ACCOUNT_NOT_FOUND" || code === "INVALID_EMAIL") {
        setError("email", { type: "server", message });
      } else {
        setError("password", { type: "server", message });
      }
    } finally {
      loadingDialog.hide();
    }
  };

  const goToVerification = async () => {
    try {
      loadingDialog.show();
      await AuthServices.resendOtp(loginEmail);
    } catch {
    } finally {
      loadingDialog.hide();
    }
    router.push({
      pathname: "/(auth)/verify-otp",
      params: { email: loginEmail, password: loginPassword, purpose: "signup" },
    });
  };

  const loginContent = (
    <ThemedView style={[styles.container, isModal && styles.modalContainer]}>
      <AppLogo showText text="Welcome Back" textStyle={styles.logoText} />

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
              <EmailSuggestion email={value} onApply={(suggested) => { onChange(suggested); clearErrors("email"); }} />
              {needsVerification && (
                <TouchableOpacity onPress={goToVerification}>
                  <ThemedText style={{ fontWeight: "600", textDecorationLine: "underline" }}>
                    Verify my email
                  </ThemedText>
                </TouchableOpacity>
              )}
            </>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: "Password is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <ThemedView style={styles.inputWrapper}>
                <TextInput
                  placeholder="Password"
                  secureTextEntry={!showPassword}
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
                  onChangeText={(text) => {
                    onChange(text);
                    if (errors.password) clearErrors("password");
                  }}
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
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/forget-password",
                    params: { email: getValues("email")?.trim() || "" },
                  })
                }
              >
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        />

        <Button
          title="Login"
          onPress={handleSubmit(onSubmit)}
          style={styles.loginButton}
        />

        <TouchableOpacity
          onPress={() => {
            if (isModal && onSwitchToSignup) {
              onSwitchToSignup();
            } else {
              router.push("/(auth)/signup");
            }
          }}
        >
          <ThemedText style={styles.linkText}>
            Don’t have an account? Sign up
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  return isModal ? (
    loginContent
  ) : (
    <AuthFormLayout>{loginContent}</AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  modalContainer: {
    flexGrow: 1,
    marginTop: -100,
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
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
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
    position: "absolute",
    right: 15,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 12,
  },
  loginButton: {
    marginTop: 8,
  },
  linkText: {
    marginTop: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 10,
    marginBottom: 10,
  },
});