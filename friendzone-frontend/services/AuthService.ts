import AsyncStorage from "@react-native-async-storage/async-storage";
import { _post, _put } from "../configs/api-methods.config";
import {
  IForgotPasswordResponse,
  ILoginResponse,
  IRegisterResponse,
  IResetPasswordResponse,
  IVerifyEmailResponse,
  IUpdateThemeResponse,
} from "../types/auth-api.type";
import { AuthSession } from "@/types/auth-session.type";

class AuthServices {
  static async signIn(data: {
    email: string;
    password: string;
  }): Promise<ILoginResponse> {
    try {
      return await _post("auth/login", data);
    } catch (error) {
      console.error("Error while login: ", error);
      throw error;
    }
  }

  static async signUp(data: {
    email: string;
    password: string;
  }): Promise<IRegisterResponse> {
    try {
      return await _post("auth/signup", data);
    } catch (error) {
      console.error("Error while register: ", error);
      throw error;
    }
  }

  static async verifyEmail(data: {
    email: string;
    otp: string;
    purpose: "signup" | "forgot-password";
  }): Promise<IVerifyEmailResponse> {
    try {
      return await _post("auth/verify-otp", data);
    } catch (error) {
      console.error("Error while verifying email: ", error);
      throw error;
    }
  }

  static async resendOtp(email: string) {
    return await _post("auth/resend-otp", { email });
  }

  static async forgetPassword(data: {
    email: string;
  }): Promise<IForgotPasswordResponse> {
    try {
      return await _post("auth/forget-password", data);
    } catch (error) {
      console.error("Error while verifying email for reset: ", error);
      throw error;
    }
  }

  static async resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<IResetPasswordResponse> {
    try {
      return await _post("auth/reset-password", data);
    } catch (error) {
      console.error("Error while resetting password: ", error);
      throw error;
    }
  }

  static async updateTheme(
    accessToken: string,
    theme: string
  ): Promise<IUpdateThemeResponse> {
    try {
      return await _put("auth/update-theme", { theme }, accessToken);
    } catch (error) {
      console.error("Error while updating theme: ", error);
      throw error;
    }
  }

  static async refreshAccessToken(): Promise<string> {
    const storedSession = await AsyncStorage.getItem("AuthSession");
    console.log("[RefreshAccessToken] Stored session:", storedSession);

    if (!storedSession) {
      console.error("[RefreshAccessToken] No session found in AsyncStorage.");
      throw new Error("No auth session found");
    }

    const session: AuthSession = JSON.parse(storedSession);

    const response = await _post<{ accessToken: string }>(
      "auth/refresh-token",
      { token: session.refreshToken },
      undefined
    );

    const newAccessToken = response.accessToken;
    const updatedSession: AuthSession = {
      ...session,
      accessToken: newAccessToken,
    };

    console.log("[RefreshAccessToken] Updated session:", updatedSession);

    await AsyncStorage.setItem("AuthSession", JSON.stringify(updatedSession));

    return newAccessToken;
  }
}

export default AuthServices;
