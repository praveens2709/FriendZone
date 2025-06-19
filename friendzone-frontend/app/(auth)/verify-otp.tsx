import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import {
  formatOtpTimer,
  HandleApiError,
  handleBackspace,
  handleInputChange,
  OTP_LENGTH,
  showToast,
} from "@/constants/Functions";
import AuthServices from "@/services/AuthService";
import { ThemedView } from "@/components/ThemedView";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import CodeBox from "@/components/CodeBox";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import AuthFormLayout from "@/components/AuthFormLayout";

type TRouteProp = RouteProp<
  {
    VerifyOtp: {
      email: string;
      password?: string;
      purpose: "signup" | "forgot-password";
    };
  },
  "VerifyOtp"
>;

const OTP_DURATION = 180;

const VerifyOtpScreen = () => {
  const route = useRoute<TRouteProp>();
  const { email, password, purpose } = route.params;
  const { colors } = useTheme();
  const auth = useAuth();
  const loading = useLoadingDialog();
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const [timer, setTimer] = useState(OTP_DURATION);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleVerify = async () => {
    const otp = code.join("");
    if (otp.length !== OTP_LENGTH) return;

    try {
      loading.show();
      const res = await AuthServices.verifyEmail({ email, otp, purpose });
      showToast("success", res.message);

      if (purpose === "signup") {
        if (res?.tokens) await auth.signIn(res.tokens);
        router.replace("/(onboarding)/profile-details");
      } else if (purpose === "forgot-password") {
        router.replace({
          pathname: "/(auth)/reset-password",
          params: { email, otp },
        });
      }
    } catch (err) {
      HandleApiError(err);
    } finally {
      loading.hide();
    }
  };

  const handleResend = async () => {
    try {
      loading.show();
      if (purpose === "signup" && password) {
        await AuthServices.signUp({ email, password });
      } else if (purpose === "forgot-password") {
        await AuthServices.forgetPassword({ email });
      }

      setCode(Array(OTP_LENGTH).fill(""));
      setActiveIndex(0);
      setTimer(OTP_DURATION);
      showToast("success", "OTP resent successfully.");
      inputs.current[0]?.focus();
    } catch (err) {
      HandleApiError(err);
    } finally {
      loading.hide();
    }
  };

  return (
    <AuthFormLayout>
      <ThemedView style={styles.backButton}>
        <BackButton />
      </ThemedView>

      <ThemedView style={styles.centeredContent}>
        <ThemedText style={styles.timer}>
          {formatOtpTimer(timer)}
        </ThemedText>

        <ThemedText style={styles.instruction}>
          Enter the 4-digit code sent to your email
        </ThemedText>

        <ThemedView style={styles.otpBoxes}>
          {code.map((digit, index) => (
            <CodeBox
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              digit={digit}
              index={index}
              activeIndex={activeIndex}
              onChangeText={(text) =>
                handleInputChange(text, index, code, setCode, inputs)
              }
              onFocus={() => setActiveIndex(index)}
              onKeyPress={(e) =>
                handleBackspace(e, index, code, setCode, inputs)
              }
            />
          ))}
        </ThemedView>

        <Button title="Verify OTP" onPress={handleVerify} />

        <TouchableOpacity onPress={handleResend}>
          <ThemedText style={styles.linkText}>
            Didn’t receive the code? Send again
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </AuthFormLayout>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backButton: {
    marginTop: 32,
    marginLeft: 24,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 24,
    marginTop: -40,
  },
  timer: {
    fontSize: 30,
    lineHeight: 30,
  },
  instruction: {
    fontSize: 16,
    textAlign: "center",
  },
  otpBoxes: {
    flexDirection: "row",
    gap: 12,
  },
  linkText: {
    marginTop: 20,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
});

export default VerifyOtpScreen;
