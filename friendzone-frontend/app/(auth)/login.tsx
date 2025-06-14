import React from "react";
import { StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthServices from "@/services/AuthService";
import { HandleApiError, showToast } from "@/constants/Functions";
import AuthFormLayout from "@/components/AuthFormLayout";

type TFormData = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const { control, handleSubmit } = useForm<TFormData>();
  const loadingDialog = useLoadingDialog();

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
        if (response.message) showToast("success", response.message);
        router.replace("/(tabs)");
      }
    } catch (error) {
      HandleApiError(error);
    } finally {
      loadingDialog.hide();
    }
  };

  return (
    <AuthFormLayout>
      <ThemedView style={styles.container}>
        <AppLogo showText text="Welcome Back" textStyle={styles.logoText} />

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

          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required" }}
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  placeholderTextColor={colors.textDim}
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={value}
                  onChangeText={onChange}
                />
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => router.push("/(auth)/forget-password")}
                >
                  <ThemedText style={{ color: colors.text, fontSize: 14, fontWeight: 600 }}>
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

          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <ThemedText style={[styles.linkText, { color: colors.text }]}>
              Don’t have an account? Sign up
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "95%",
    margin: "auto",
    paddingHorizontal: 20,
  },
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
});
