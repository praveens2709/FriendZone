import { User, UserProfileResponse } from "@/types/user.type";
import { _get, _put } from "../configs/api-methods.config";

interface IUpdateProfileResponse {
  message: string;
  user: User;
}

interface ITogglePrivacyResponse {
  success: boolean;
  message: string;
  isPrivate: boolean;
}

class ProfileServices {
  static async getProfile(token: string): Promise<User> {
    try {
      const response = await _get<UserProfileResponse>("profile", token);
      console.log("response", response);
      return response.user;
    } catch (error) {
      console.error("Error while fetching profile: ", error);
      throw error;
    }
  }

  static async updateProfile(data: FormData, token: string): Promise<IUpdateProfileResponse> {
    try {
      const response = await _put<IUpdateProfileResponse>("profile", data, token);
      return response;
    } catch (error) {
      console.error("Error while updating profile: ", error);
      throw error;
    }
  }

  static async togglePrivacy(isPrivate: boolean, token: string): Promise<ITogglePrivacyResponse> {
    try {
      const response = await _put<ITogglePrivacyResponse>("profile/privacy", { isPrivate }, token);
      return response;
    } catch (error) {
      console.error("Error while toggling privacy: ", error);
      throw error;
    }
  }

  static async getProfileById(token: string, userId: string): Promise<User> {
    try {
      const response = await _get<UserProfileResponse>(`profile/${userId}`, token);
      return response.user;
    } catch (error) {
      console.error("Error while fetching profile by ID: ", error);
      throw error;
    }
  }
}

export default ProfileServices;