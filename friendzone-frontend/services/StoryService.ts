import httpClient from "../configs/axios.config";
import { StoryContent, StoryViewerEntry, UserStory } from "@/types/story.type";
import { StoryMusic, StoryTextStyle } from "@/constants/storyText";
import { StoryFilterKey, StoryStroke, StorySticker } from "@/constants/storyDecor";

type Audience = "circle" | "close";

export type StoryExtras = {
  textStyle?: StoryTextStyle;
  music?: StoryMusic | null;
  stickers?: Omit<StorySticker, "id">[];
  drawing?: StoryStroke[];
  filter?: StoryFilterKey;
};

const extrasBody = (extras: StoryExtras | undefined, hasText: boolean) => ({
  ...(hasText && extras?.textStyle ? { textStyle: extras.textStyle } : {}),
  ...(extras?.music ? { music: extras.music } : {}),
  ...(extras?.stickers?.length ? { stickers: extras.stickers } : {}),
  ...(extras?.drawing?.length ? { drawing: extras.drawing } : {}),
  ...(extras?.filter && extras.filter !== "none" ? { filter: extras.filter } : {}),
});

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
    style: { gradient: string[]; textColor: string },
    extras?: StoryExtras
  ): Promise<StoryContent> {
    const response = await httpClient.post("stories", {
      type: "text",
      text,
      audience,
      gradient: style.gradient,
      textColor: style.textColor,
      ...extrasBody(extras, true),
    });
    return response.data;
  }

  static async postSharedPost(
    postId: string,
    audience: Audience,
    gradient: string[],
    card: { x: number; y: number; scale: number },
    backdrop: string,
    overlay?: { text: string; textX: number; textY: number },
    extras?: StoryExtras
  ): Promise<StoryContent> {
    const response = await httpClient.post("stories", {
      type: "post",
      postId,
      audience,
      gradient,
      backdrop,
      cardX: card.x,
      cardY: card.y,
      cardScale: card.scale,
      ...(overlay?.text.trim()
        ? { text: overlay.text.trim(), textX: overlay.textX, textY: overlay.textY }
        : {}),
      ...extrasBody(extras, !!overlay?.text.trim()),
    });
    return response.data;
  }

  static async postMedia(
    uri: string,
    mediaType: "image" | "video",
    audience: Audience,
    durationMs?: number,
    overlay?: { text: string; textX: number; textY: number },
    extras?: StoryExtras
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
      if (extras?.textStyle) form.append("textStyle", JSON.stringify(extras.textStyle));
    }
    if (extras?.music) form.append("music", JSON.stringify(extras.music));
    if (extras?.stickers?.length) form.append("stickers", JSON.stringify(extras.stickers));
    if (extras?.drawing?.length) form.append("drawing", JSON.stringify(extras.drawing));
    if (extras?.filter && extras.filter !== "none") form.append("filter", extras.filter);

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
