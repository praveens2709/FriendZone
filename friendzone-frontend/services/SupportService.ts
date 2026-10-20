import httpClient from "../configs/axios.config";

export type FeedbackType = "help" | "bug" | "idea" | "dob_change";

class SupportService {
  static async sendFeedback(type: FeedbackType, message: string, appVersion?: string) {
    const response = await httpClient.post("support/feedback", { type, message, appVersion });
    return response.data as { success: boolean; message: string };
  }
}

export default SupportService;
