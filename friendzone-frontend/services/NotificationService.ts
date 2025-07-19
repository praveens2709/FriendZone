import { _get, _put } from "../configs/api-methods.config";

export interface NotificationResponse {
  id: string;
  type: string;
  timestamp: string;
  isRead: boolean;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  content?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  relatedContentPreview?: string;
  metadata?: {
    status?: 'pending' | 'accepted' | 'declined';
    [key: string]: any;
  };
  knockStatus?: 'pending' | 'lockedIn' | 'onesidedlock' | 'declined' | null;
  relatedEntityDetails?: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

export interface GetNotificationsResponse {
  notifications: NotificationResponse[];
  currentPage: number;
  totalPages: number;
  totalNotifications: number;
}

export interface MarkNotificationReadResponse {
  message: string;
  notificationId: string;
}

export interface UnreadNotificationCountResponse {
    count: number;
}

class NotificationService {
  static async getUserNotifications(token: string, page: number = 1, limit: number = 15): Promise<GetNotificationsResponse> {
    return await _get(`notifications?page=${page}&limit=${limit}`, token);
  }

  static async getUnreadNotificationCount(token: string): Promise<UnreadNotificationCountResponse> { // New method
    return await _get(`notifications/unread-count`, token);
  }

  static async markNotificationAsRead(notificationId: string, token: string): Promise<MarkNotificationReadResponse> {
    return await _put(`notifications/${notificationId}/read`, {}, token);
  }

  static async markAllNotificationsAsRead(token: string): Promise<{ message: string }> {
    return await _put(`notifications/read-all`, {}, token);
  }
}

export default NotificationService;