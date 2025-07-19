import { _get, _put, _post, _delete } from "../configs/api-methods.config";

export interface KnockRequest {
  id: string;
  knockerId: string;
  knockedId: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  timestamp: string;
  status: 'pending' | 'lockedIn' | 'onesidedlock' | 'declined';
}

export interface UserSearchResult {
  _id: string;
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  isPrivate: boolean;
}

class KnockService {
  static async getKnockers(token: string): Promise<KnockRequest[]> {
    return await _get('knock/knockers', token);
  }

  static async getKnocked(token: string): Promise<KnockRequest[]> {
    return await _get('knock/knocked', token);
  }

  static async getPendingKnockRequests(token: string): Promise<KnockRequest[]> {
    return await _get('knock/pending', token);
  }

  static async knockUser(knockedId: string, token: string): Promise<{ message: string }> {
    return await _post('knock', { knockedId }, token);
  }

  static async knockBack(knockId: string, token: string): Promise<{ message: string }> {
    return await _put(`knock/${knockId}/knockback`, {}, token);
  }

  static async acceptKnock(knockId: string, token: string): Promise<void> {
    return await _put(`knock/${knockId}/accept`, {}, token);
  }

  static async declineKnock(knockId: string, token: string): Promise<{ message: string }> {
    return await _put(`knock/${knockId}/decline`, {}, token);
  }

  static async searchUsers(token: string, query: string): Promise<UserSearchResult[]> {
    return await _get('knock/search', token, { q: query });
  }
}

export default KnockService;