// services/ProfileService.ts
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
  /**
   * Fetches the user's profile details from the backend.
   * @returns Promise<UserProfile>
   */
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

  /**
   * Updates the user's profile details, including image.
   * @param data FormData containing profile fields.
   * @param token The user's access token. // <-- Added param description
   * @returns Promise<IUpdateProfileResponse>
   */
  static async updateProfile(data: FormData, token: string): Promise<IUpdateProfileResponse> { // <-- Ensure token is expected here
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
}

export default ProfileServices;