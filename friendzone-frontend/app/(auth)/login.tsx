import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { HandleApiError } from "@/constants/Functions";
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
  const { control, handleSubmit, formState: { errors } } = useForm<TFormData>();
  const loadingDialog = useLoadingDialog();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (formData: TFormData) => {
    try {
      loadingDialog.show();
      const response = await AuthServices.signIn(formData);
      if (response) {
        await auth.signIn({
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          theme: response.theme,
        });
        if (response.message) console.log("success", response.message);
        onCloseModal?.();
        router.replace("/home");
      }
    } catch (error) {
      HandleApiError(error);
    } finally {
      loadingDialog.hide();
    }
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
                      borderColor: errors.email ? colors.error : colors.border 
                    },
                  ]}
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
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push("/(auth)/forget-password")}
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
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    height: 50,
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