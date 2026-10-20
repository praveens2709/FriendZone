export type StoryContent = {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string | null;
  text?: string;
  duration?: number;
  textColor?: string;
  gradient?: string[];
  textX?: number;
  textY?: number;
  audience?: 'circle' | 'close';
  viewed?: boolean;
  viewCount?: number;
  createdAt?: string;
};

export type UserStory = {
  id: string;
  name: string;
  profilePic: string | null;
  isOwnStory?: boolean;
  seen?: boolean;
  stories: StoryContent[];
};

export type StoryRingItem = {
  id: string;
  name: string;
  image: string | null;
  isOwnStory?: boolean;
  seen?: boolean;
  empty?: boolean;
};

export type StoryViewerEntry = {
  id: string;
  name: string;
  profileImage: string | null;
  at: string;
};
