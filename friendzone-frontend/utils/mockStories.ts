import { UserStory } from "@/types/story.type";

export const mockStories: UserStory[] = [
  {
    id: "1",
    name: "Your Story",
    profilePic: "https://i.pravatar.cc/100?img=68",
    isOwnStory: true,
    seen: true,
    stories: [
      {
        id: "1_1",
        type: "image",
        url: "https://picsum.photos/seed/picsum1/700/1200",
        duration: 5000,
      },
      {
        id: "1_2",
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration: 15000,
      },
    ],
  },
  {
    id: "2",
    name: "Alice",
    profilePic: "https://i.pravatar.cc/100?img=32",
    seen: false,
    stories: [
      {
        id: "2_1",
        type: "image",
        url: "https://picsum.photos/seed/picsum2/700/1200",
        duration: 7000,
      },
      {
        id: "2_2",
        type: "image",
        url: "https://picsum.photos/seed/picsum3/700/1200",
        duration: 4000,
      },
    ],
  },
  {
    id: "3",
    name: "Bob",
    profilePic: "https://i.pravatar.cc/100?img=23",
    seen: true,
    stories: [
      {
        id: "3_1",
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        duration: 10000,
      },
    ],
  },
  {
    id: "4",
    name: "Charlie",
    profilePic: "https://i.pravatar.cc/100?img=12",
    seen: false,
    stories: [
      {
        id: "4_1",
        type: "image",
        url: "https://picsum.photos/seed/picsum4/700/1200",
        duration: 6000,
      },
      {
        id: "4_2",
        type: "image",
        url: "https://picsum.photos/seed/picsum5/700/1200",
        duration: 5000,
      },
      {
        id: "4_3",
        type: "image",
        url: "https://picsum.photos/seed/picsum6/700/1200",
        duration: 8000,
      },
    ],
  },
  {
    id: "5",
    name: "David",
    profilePic: "https://i.pravatar.cc/100?img=45",
    seen: true,
    stories: [
      {
        id: "5_1",
        type: "image",
        url: "https://picsum.photos/seed/picsum7/700/1200",
        duration: 5000,
      },
    ],
  },
];
