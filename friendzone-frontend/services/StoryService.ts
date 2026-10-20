import httpClient from "../configs/axios.config";
import { StoryContent, StoryViewerEntry, UserStory } from "@/types/story.type";

type Audience = "circle" | "close";

interface RawGroup {
  user: { id: string; name: string; profileImage: string | null };
  isOwn: boolean;
  hasUnseen: boolean;
  stories: StoryContent[];
}

class StoryService {
  static async getStories(): Promise<UserStory[]> {
    const response = await httpClient.get<RawGroup[]>("stories");
    return response.data.map((group) => ({
      id: group.user.id,
      name: group.isOwn ? "Your story" : group.user.name,
      profilePic: group.user.profileImage,
      isOwnStory: group.isOwn,
      seen: !group.hasUnseen,
      stories: group.stories,
    }));
  }

  static async postText(
    text: string,
    audience: Audience,
    style: { gradient: string[]; textColor: string }
  ): Promise<StoryContent> {
    const response = await httpClient.post("stories", {
      type: "text",
      text,
      audience,
      gradient: style.gradient,
      textColor: style.textColor,
    });
    return response.data;
  }

  static async postMedia(
    uri: string,
    mediaType: "image" | "video",
    audience: Audience,
    durationMs?: number,
    overlay?: { text: string; textX: number; textY: number }
  ): Promise<StoryContent> {
    const rawExt = (uri.split(".").pop() || "").toLowerCase().split("?")[0];
    const ext = rawExt || (mediaType === "video" ? "mp4" : "jpg");
    const mime =
      mediaType === "video"
        ? ext === "mov"
          ? "video/quicktime"
          : "video/mp4"
        : `image/${ext === "jpg" ? "jpeg" : ext}`;

    const form = new FormData();
    form.append("media", { uri, name: `story.${ext}`, type: mime } as any);
    form.append("audience", audience);
    if (durationMs) form.append("duration", String(Math.round(durationMs)));
    if (overlay?.text.trim()) {
      form.append("text", overlay.text.trim());
      form.append("textX", String(overlay.textX));
      form.append("textY", String(overlay.textY));
    }

    const response = await httpClient.post("stories", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return response.data;
  }

  static async markViewed(storyId: string): Promise<void> {
    await httpClient.post(`stories/${storyId}/view`, {});
  }

  static async getViewers(storyId: string): Promise<StoryViewerEntry[]> {
    const response = await httpClient.get(`stories/${storyId}/viewers`);
    return response.data;
  }

  static async deleteStory(storyId: string): Promise<void> {
    await httpClient.delete(`stories/${storyId}`);
  }
}

export default StoryService;
