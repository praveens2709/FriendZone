import { KnockStatus } from "./knock.type";

export interface NotifyingUser {
  id: string;
  username: string;
  avatar: string;
}

export interface BaseNotification {
  id: string;
  type: string;
  timestamp: string;
  isRead: boolean;
}

export interface FriendRequestNotification extends BaseNotification {
  type: 'friend_request';
  user: NotifyingUser;
  metadata?: {
    status?: KnockStatus;
    [key: string]: any;
  };
}

export interface AcceptedRequestNotification extends BaseNotification {
  type: 'accepted_request';
  user: NotifyingUser;
}

export interface ActivityNotification extends BaseNotification {
  type: 'activity';
  user: NotifyingUser;
  action: string;
  relatedContentPreview?: string;
}

export interface MessageNotification extends BaseNotification {
  type: 'message';
  user: NotifyingUser;
  message: string;
  relatedEntityId: string;
}

export interface MeetingInviteNotification extends BaseNotification {
  type: 'meeting_invite';
  user: NotifyingUser;
  relatedEntityId: string;
  metadata?: {
    meetingId: string;
    meetingTitle: string;
    startTime: string;
    status: 'pending' | 'accepted' | 'declined';
    [key: string]: any;
  };
}

export type Notification =
  | FriendRequestNotification
  | AcceptedRequestNotification
  | ActivityNotification
  | MessageNotification
  | MeetingInviteNotification;

