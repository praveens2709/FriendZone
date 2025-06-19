export type StoryContent = {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
  duration?: number;
  textColor?: string;
  backgroundColor?: string;
};

export type UserStory = {
  id: string;
  name: string;
  profilePic: string;
  isOwnStory?: boolean;
  seen?: boolean;
  stories: StoryContent[];
};

export type StoryRingItem = {
  id: string;
  name: string;
  image: string;
  isOwnStory?: boolean;
  seen?: boolean;
};