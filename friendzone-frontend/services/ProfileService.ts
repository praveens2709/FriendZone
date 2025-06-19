// services/ProfileService.ts
import { User, UserProfileResponse } from "@/types/user.type";
import { _get, _post, _put } from "../configs/api-methods.config";

interface IUpdateProfileResponse {
  message: string;
  user: User;
}

class ProfileServices {
  /**
   * Fetches the user's profile details from the backend.
   * @returns Promise<UserProfile>
   */
  static async getProfile(): Promise<User> {
    try {
      const response = await _get<UserProfileResponse>("profile");
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
   * @returns Promise<IUpdateProfileResponse>
   */
  static async updateProfile(data: FormData): Promise<IUpdateProfileResponse> {
    try {
      const response = await _put<IUpdateProfileResponse>("profile", data);
      return response;
    } catch (error) {
      console.error("Error while updating profile: ", error);
      throw error;
    }
  }
}

export default ProfileServices;