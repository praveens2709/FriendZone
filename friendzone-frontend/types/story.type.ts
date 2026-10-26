import type { StoryMusic, StoryTextStyle } from '@/constants/storyText';
import type { StoryFilterKey, StorySticker, StoryStroke } from '@/constants/storyDecor';

export type StoryPostSnapshot = {
  id: string | null;
  image: string;
  authorName: string;
  authorAvatar: string | null;
  caption?: string;
};

export type StoryContent = {
  id: string;
  type: 'image' | 'video' | 'text' | 'post';
  url?: string | null;
  text?: string;
  duration?: number;
  textColor?: string;
  gradient?: string[];
  textX?: number;
  textY?: number;
  textStyle?: StoryTextStyle | null;
  music?: StoryMusic | null;
  stickers?: Omit<StorySticker, 'id'>[];
  drawing?: StoryStroke[];
  filter?: StoryFilterKey;
  post?: StoryPostSnapshot | null;
  backdrop?: string;
  cardX?: number;
  cardY?: number;
  cardScale?: number;
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
