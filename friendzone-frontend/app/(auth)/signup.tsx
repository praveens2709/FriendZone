import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { Ionicons } from "@expo/vector-icons";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const { control, handleSubmit, watch, formState: { errors }, setError } = useForm<TFormData>({
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
        console.log("success", "Account created! Please verify your email.");
        onCloseModal?.();
      } else {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { email, password, purpose: "signup" },
        });
      }
    } catch (err: any) {
      if (err.message) {
        if (err.message.includes("Password must contain at least one uppercase letter")) {
          setError("password", { type: "manual", message: "Password must include a capital letter." });
        } else if (err.message.includes("Password must contain at least one special character")) {
          setError("password", { type: "manual", message: "Password must include a special character (!$@%)." });
        } else if (err.message.includes("Password must contain at least one number")) {
          setError("password", { type: "manual", message: "Password must include a number." });
        } else {
          setError("password", { type: "manual", message: err.message });
        }
      } else {
        console.log("Signup Failed", err.message || "Please try again.");
      }
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
          rules={{
            required: "Password is required.",
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
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  placeholderTextColor={colors.textDim}
                  style={[
                    styles.input,
                    { 
                      color: colors.text, 
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
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
    position: 'absolute',
    right: 15,
  },
  signupButton: {
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