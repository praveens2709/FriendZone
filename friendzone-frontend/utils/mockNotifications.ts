// utils/mockNotifications.ts
type NotifyingUser = {
  id: string;
  username: string;
  avatar: string;
};

type BaseNotification = {
  id: string;
  type: string;
  timestamp: string;
  isRead: boolean;
};

export type FriendRequestNotification = BaseNotification & {
  type: 'friend_request';
  sender: NotifyingUser;
};

export type AcceptedRequestNotification = BaseNotification & {
  type: 'accepted_request';
  user: NotifyingUser;
};

export type ActivityNotification = BaseNotification & {
  type: 'activity';
  user: NotifyingUser;
  action: string;
  relatedContentId?: string;
  relatedContentPreview?: string;
};

export type Notification = FriendRequestNotification | AcceptedRequestNotification | ActivityNotification;

export type PendingFriendRequest = FriendRequestNotification & {
  status: 'pending';
};

export const mockNotifications: Notification[] = [
  {
    id: 'fr1', type: 'friend_request', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), isRead: false,
    sender: { id: 'u101', username: 'LiamG', avatar: 'https://i.pravatar.cc/100?img=59' },
  },
  {
    id: 'fr2', type: 'friend_request', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), isRead: false,
    sender: { id: 'u102', username: 'OliviaM', avatar: 'https://i.pravatar.cc/100?img=28' },
  },
  {
    id: 'fr3', type: 'friend_request', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isRead: false,
    sender: { id: 'u103', username: 'NoahT', avatar: 'https://i.pravatar.cc/100?img=40' },
  },
  {
    id: 'n1', type: 'accepted_request', timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(), isRead: false,
    user: { id: 'u104', username: 'SophiaW', avatar: 'https://i.pravatar.cc/100?img=25' },
  },
  {
    id: 'n2', type: 'activity', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), isRead: false,
    user: { id: 'u105', username: 'JacksonP', avatar: 'https://i.pravatar.cc/100?img=60' },
    action: 'reacted to your recent status.',
  },
  {
    id: 'n3', type: 'activity', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u106', username: 'AvaR', avatar: 'https://i.pravatar.cc/100?img=33' },
    action: 'commented on your new photo.',
    relatedContentPreview: 'https://picsum.photos/id/237/50/50',
  },
  {
    id: 'n4', type: 'accepted_request', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u107', username: 'LucasH', avatar: 'https://i.pravatar.cc/100?img=62' },
  },
  {
    id: 'n5', type: 'activity', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(), isRead: false,
    user: { id: 'u108', username: 'MiaK', avatar: 'https://i.pravatar.cc/100?img=35' },
    action: 'sent you a friend request.',
  },
  {
    id: 'n6', type: 'activity', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u109', username: 'ElijahC', avatar: 'https://i.pravatar.cc/100?img=65' },
    action: 'reacted to your story.',
  },
  {
    id: 'n7', type: 'accepted_request', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u110', username: 'CharlotteF', avatar: 'https://i.pravatar.cc/100?img=38' },
  },
  {
    id: 'n8', type: 'activity', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u111', username: 'HenryD', avatar: 'https://i.pravatar.cc/100?img=67' },
    action: 'commented on your photo.',
    relatedContentPreview: 'https://picsum.photos/id/238/50/50',
  },
  {
    id: 'n9', type: 'activity', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), isRead: true,
    user: { id: 'u112', username: 'AmeliaB', avatar: 'https://i.pravatar.cc/100?img=41' },
    action: 'joined your zone!',
  },
  {
    id: 'n10', type: 'activity', timestamp: new Date('2024-05-01T10:00:00Z').toISOString(), isRead: true,
    user: { id: 'u113', username: 'JamesS', avatar: 'https://i.pravatar.cc/100?img=71' },
    action: 'sent you a message for the first time.',
  },
];

export const mockPendingFriendRequests: PendingFriendRequest[] = [
  {
    id: 'req1', type: 'friend_request', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), isRead: false,
    sender: { id: 'u201', username: 'AlexZ', avatar: 'https://i.pravatar.cc/100?img=5' },
    status: 'pending',
  },
  {
    id: 'req2', type: 'friend_request', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), isRead: false,
    sender: { id: 'u202', username: 'BrendaV', avatar: 'https://i.pravatar.cc/100?img=17' },
    status: 'pending',
  },
  {
    id: 'req3', type: 'friend_request', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), isRead: true,
    sender: { id: 'u203', username: 'ChrisU', avatar: 'https://i.pravatar.cc/100?img=49' },
    status: 'pending',
  },
  {
    id: 'req4', type: 'friend_request', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), isRead: true,
    sender: { id: 'u204', username: 'DianaQ', avatar: 'https://i.pravatar.cc/100?img=20' },
    status: 'pending',
  },
];