import { User, UserProfileResponse } from "@/types/user.type";
import { _get, _put } from "../configs/api-methods.config";
import httpClient from "../configs/axios.config";

interface IUpdateProfileResponse {
  message: string;
  user: User;
}

interface ITogglePrivacyResponse {
  success: boolean;
  message: string;
  isPrivate: boolean;
}

export interface CloseFriend {
  id: string;
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  isClose: boolean;
}

class ProfileServices {
  static async getProfile(token: string): Promise<User> {
    try {
      const response = await _get<UserProfileResponse>("profile", token);
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

  static async updatePhone(phone: string | null): Promise<{ phone: string | null }> {
    const response = await httpClient.put("profile/phone", { phone });
    return response.data;
  }

  static async getCloseFriends(): Promise<CloseFriend[]> {
    const response = await httpClient.get("profile/close-friends");
    return response.data.friends;
  }

  static async updateCloseFriends(userIds: string[]): Promise<void> {
    await httpClient.put("profile/close-friends", { userIds });
  }

  static async getProfileById(token: string, userId: string): Promise<User> {
    try {
      const response = await _get<UserProfileResponse>(`profile/${userId}`, token);
      return { ...response.user, relationship: response.relationship };
    } catch (error) {
      console.error("Error while fetching profile by ID: ", error);
      throw error;
    }
  }
}

export default ProfileServices;