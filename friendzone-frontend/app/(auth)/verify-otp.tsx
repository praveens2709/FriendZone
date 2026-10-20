import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLoadingDialog } from "@/context/LoadingContext";
import {
  formatOtpTimer,
  getApiError,
  handleBackspace,
  handleInputChange,
  OTP_LENGTH,
} from "@/constants/Functions";
import AuthServices from "@/services/AuthService";
import { ThemedView } from "@/components/ThemedView";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import CodeBox from "@/components/CodeBox";
import { useRouter } from "expo-router";
import AuthFormLayout from "@/components/AuthFormLayout";

import InlineError from "@/components/InlineError";

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
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [timer, setTimer] = useState(OTP_DURATION);

  const inputs = useRef<(TextInput | null)[]>([]);
  const verifying = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence(
      [-12, 12, -9, 9, -5, 5, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 55, useNativeDriver: true })
      )
    ).start();
  };

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
    if (otp.length !== OTP_LENGTH || verifying.current) return;

    verifying.current = true;
    try {
      loading.show();
      setError("");
      const res = await AuthServices.verifyEmail({ email, otp, purpose });

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
      setError(getApiError(err).message);
      runShake();
      setCode(Array(OTP_LENGTH).fill(""));
      setActiveIndex(0);
      inputs.current[0]?.focus();
    } finally {
      verifying.current = false;
      loading.hide();
    }
  };

  useEffect(() => {
    if (code.every((digit) => digit !== "")) handleVerify();
  }, [code]);

  const handleResend = async () => {
    try {
      loading.show();
      setError("");
      if (purpose === "signup" && password) {
        await AuthServices.signUp({ email, password, acceptedTerms: true });
      } else if (purpose === "forgot-password") {
        await AuthServices.forgetPassword({ email });
      }

      setCode(Array(OTP_LENGTH).fill(""));
      setActiveIndex(0);
      setTimer(OTP_DURATION);
      inputs.current[0]?.focus();
    } catch (err) {
      setError(getApiError(err).message);
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
          Enter the {OTP_LENGTH}-digit code sent to your email
        </ThemedText>

        <Animated.View style={[styles.otpBoxes, { transform: [{ translateX: shake }] }]}>
          {code.map((digit, index) => (
            <CodeBox
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              digit={digit}
              index={index}
              activeIndex={activeIndex}
              onChangeText={(text) => {
                if (error) setError("");
                handleInputChange(text, index, code, setCode, inputs);
              }}
              onFocus={() => setActiveIndex(index)}
              onKeyPress={(e) =>
                handleBackspace(e, index, code, setCode, inputs)
              }
            />
          ))}
        </Animated.View>

        <InlineError message={error} />

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
    gap: 8,
  },
  linkText: {
    marginTop: 20,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
});

export default VerifyOtpScreen;
