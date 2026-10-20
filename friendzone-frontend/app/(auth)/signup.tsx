import { getApiError } from "@/constants/Functions";
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
import EmailSuggestion from "@/components/EmailSuggestion";
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
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);


  const { control, handleSubmit, watch, formState: { errors }, setError, clearErrors } = useForm<TFormData>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (formData: TFormData) => {
    if (!agreed) {
      setAgreeError(true);
      return;
    }
    const email = formData.email.trim();
    const password = formData.password.trim();
    try {
      loadingDialog.show();
      await signUp(email, password);
      if (isModal) {
        onCloseModal?.();
      } else {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { email, password, purpose: "signup" },
        });
      }
    } catch (err: any) {
      const { message, code } = getApiError(err);
      if (code === "ACCOUNT_EXISTS" || code === "INVALID_EMAIL") {
        setError("email", { type: "server", message });
      } else if (code === "WEAK_PASSWORD") {
        setError("password", { type: "server", message });
      } else {
        setError("email", { type: "server", message });
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
                      backgroundColor: colors.backgroundSecondary,
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
              <EmailSuggestion email={value} onApply={(suggested) => { onChange(suggested); clearErrors("email"); }} />
            </>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters.",
            },
            pattern: {
              value: /^(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.*[0-9]).{8,}$/,
              message: "Password must include a capital letter, a number and a special character.",
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
                  placeholder="Confirm Password"
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

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.agreeRow}
          onPress={() => {
            setAgreed(!agreed);
            setAgreeError(false);
          }}
        >
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={24}
            color={agreeError ? colors.error : colors.primary}
          />
          <ThemedText style={[styles.agreeText, agreeError && { color: colors.error }]}>
            I'm 18 or older and I agree to the{" "}
            <ThemedText
              style={styles.agreeLink}
              onPress={() => router.push("/legal/terms")}
            >
              Terms
            </ThemedText>{" "}
            and{" "}
            <ThemedText
              style={styles.agreeLink}
              onPress={() => router.push("/legal/privacy")}
            >
              Privacy Policy
            </ThemedText>
            .
          </ThemedText>
        </TouchableOpacity>

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
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
  agreeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  agreeLink: { fontSize: 13, lineHeight: 19, fontWeight: "800", textDecorationLine: "underline" },
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