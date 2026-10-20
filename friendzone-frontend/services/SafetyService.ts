import { _get, _post } from "../configs/api-methods.config";
import httpClient from "../configs/axios.config";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "self_harm"
  | "impersonation"
  | "underage"
  | "other";

export type ReportTarget = "user" | "post" | "comment" | "message";

export interface BlockedUser {
  id: string;
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  blockedAt: string;
}

class SafetyService {
  static async blockUser(userId: string, token: string) {
    return await _post(`safety/blocks/${userId}`, {}, token);
  }

  static async unblockUser(userId: string) {
    const response = await httpClient.delete(`safety/blocks/${userId}`);
    return response.data;
  }

  static async getBlockedUsers(token: string): Promise<BlockedUser[]> {
    return await _get<BlockedUser[]>("safety/blocks", token);
  }

  static async report(
    targetType: ReportTarget,
    targetId: string,
    reason: ReportReason,
    token: string,
    details?: string
  ) {
    return await _post(
      "safety/reports",
      { targetType, targetId, reason, details },
      token
    );
  }

  static async deleteAccount(password: string, token: string) {
    return await _post("safety/delete-account", { password }, token);
  }
}

export default SafetyService;
