import { getAuthSession, storeAuthSession } from "../utils/auth-storage";
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
    acceptedTerms?: boolean;
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

  static async changePassword(
    accessToken: string,
    data: { currentPassword: string; newPassword: string }
  ) {
    try {
      return await _put("auth/change-password", data, accessToken);
    } catch (error) {
      console.error("Error while changing password: ", error);
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
    const storedSession = await getAuthSession();

    if (!storedSession) {
      throw new Error("No auth session found");
    }

    const session: AuthSession = JSON.parse(storedSession);

    const response = await _post<{ accessToken: string }>(
      "auth/refresh-token",
      { token: session.refreshToken },
      undefined
    );

    const updatedSession: AuthSession = {
      ...session,
      accessToken: response.accessToken,
    };

    await storeAuthSession(updatedSession);

    return response.accessToken;
  }

  static async acceptTerms(): Promise<void> {
    await _post("auth/accept-terms", {});
  }

  static async requestEmailChange(data: { newEmail: string; password: string }) {
    return await _post<{ message: string }>("auth/email-change/request", data);
  }

  static async confirmEmailChange(otp: string) {
    return await _post<{ message: string; email: string }>("auth/email-change/confirm", { otp });
  }

  static async logout(): Promise<void> {
    try {
      await _post("auth/logout", {});
    } catch {
      return;
    }
  }
}

export default AuthServices;
