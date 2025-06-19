import React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import AppLogo from "@/components/AppLogo";
import Button from "@/components/Button";
import { useForm, Controller } from "react-hook-form";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthFormLayout from "@/components/AuthFormLayout";
import { showToast } from "@/constants/Functions";

interface SignupScreenProps {
  isModal?: boolean;
  onSwitchToLogin?: () => void;
  onCloseModal?: () => void;
}

type TFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignupScreen({
  isModal = false,
  onSwitchToLogin,
  onCloseModal,
}: SignupScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const loadingDialog = useLoadingDialog();

  const { control, handleSubmit, watch } = useForm<TFormData>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (formData: TFormData) => {
    const email = formData.email.trim();
    const password = formData.password.trim();
    try {
      loadingDialog.show();
      await signUp(email, password);
      if (isModal) {
        showToast("success", "Account created! Please verify your email.");
        onCloseModal?.();
      } else {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { email, password, purpose: "signup" },
        });
      }
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message || "Please try again.");
    } finally {
      loadingDialog.hide();
    }
  };

  const signupContent = (
    <ThemedView
      style={[
        styles.container,
        isModal && styles.modalContainer,
      ]}
    >
      <AppLogo
        showText
        text="Create an Account"
        textStyle={styles.logoText}
      />

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
            <TextInput
              placeholder="Password"
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
              placeholder="Confirm Password"
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
          title="Sign Up"
          onPress={handleSubmit(onSubmit)}
          style={styles.signupButton}
        />

        <TouchableOpacity
          onPress={() => {
            if (isModal && onSwitchToLogin) {
              onSwitchToLogin();
            } else {
              router.push("/(auth)/login");
            }
          }}
        >
          <ThemedText style={styles.linkText}>
            Already have an account? Log in
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  return isModal ? signupContent : <AuthFormLayout>{signupContent}</AuthFormLayout>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  modalContainer: {
    marginTop: -100,
    flexGrow: 1,
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
  signupButton: {
    marginTop: 8,
  },
  linkText: {
    marginTop: 20,
    textAlign: "center",
  },
});
