import { _get, _put } from "../configs/api-methods.config";
import httpClient from "../configs/axios.config";
import { VibeKind } from "@/constants/vibes";

export interface Vibe {
  id: string;
  kind: VibeKind;
  note: string;
  expiresAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName?: string;
    profileImage: string | null;
    theme: string;
  };
}

export interface VibesResponse {
  mine: Vibe | null;
  circle: Vibe[];
}

class VibeService {
  static async getVibes(token: string): Promise<VibesResponse> {
    return await _get<VibesResponse>("vibes", token);
  }

  static async setVibe(
    data: { kind: VibeKind; note?: string; hours?: number },
    token: string
  ): Promise<Vibe> {
    return await _put<Vibe>("vibes", data, token);
  }

  static async clearVibe(): Promise<void> {
    await httpClient.delete("vibes");
  }
}

export default VibeService;
