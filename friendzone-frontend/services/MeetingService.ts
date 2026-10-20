import httpClient from "../configs/axios.config";
import { _get, _post, _patch, _delete } from "../configs/api-methods.config";
import {
    Meeting,
    CreateMeetingInput,
    MeetingTokenResponse,
    GetMeetingsResponse,
} from "@/types/meeting.type";

class MeetingService {
    static async createMeeting(data: CreateMeetingInput, token: string): Promise<Meeting> {
        try {
            const response = await _post<Meeting>("meetings", data, token);
            return response;
        } catch (error) {
            console.error("Error creating meeting:", error);
            throw error;
        }
    }

    static async startCall(chatId: string, audioOnly: boolean): Promise<{ meetingId: string; audioOnly: boolean }> {
        const response = await httpClient.post("calls", { chatId, audioOnly });
        return response.data;
    }

    static async cancelCall(meetingId: string): Promise<void> {
        await httpClient.post(`calls/${meetingId}/cancel`, {});
    }

    static async declineCall(meetingId: string): Promise<void> {
        await httpClient.post(`calls/${meetingId}/decline`, {});
    }

    static async getMeetings(
        token: string,
        params?: { status?: string; page?: number; limit?: number; includeInstant?: boolean }
    ): Promise<GetMeetingsResponse> {
        try {
            const response = await _get<GetMeetingsResponse>("meetings", token, params);
            return response;
        } catch (error) {
            console.error("Error fetching meetings:", error);
            throw error;
        }
    }

    static async getMeetingById(meetingId: string, token: string): Promise<Meeting> {
        try {
            const response = await _get<Meeting>(`meetings/${meetingId}`, token);
            return response;
        } catch (error) {
            console.error("Error fetching meeting:", error);
            throw error;
        }
    }

    static async getMeetingToken(meetingId: string, token: string): Promise<MeetingTokenResponse> {
        try {
            const response = await _post<MeetingTokenResponse>(
                `meetings/${meetingId}/token`,
                {},
                token
            );
            return response;
        } catch (error) {
            console.error("Error getting meeting token:", error);
            throw error;
        }
    }

    static async updateMeetingStatus(
        meetingId: string,
        status: "live" | "completed",
        token: string
    ): Promise<Meeting> {
        try {
            const response = await _patch<Meeting>(
                `meetings/${meetingId}/status`,
                { status },
                token
            );
            return response;
        } catch (error) {
            console.error("Error updating meeting status:", error);
            throw error;
        }
    }

    static async respondToInvitation(
        meetingId: string,
        response: "accepted" | "declined",
        token: string
    ): Promise<{ message: string }> {
        try {
            const result = await _post<{ message: string }>(
                `meetings/${meetingId}/respond`,
                { response },
                token
            );
            return result;
        } catch (error) {
            console.error("Error responding to invitation:", error);
            throw error;
        }
    }

    static async deleteMeeting(meetingId: string, token: string): Promise<{ message: string }> {
        try {
            const response = await _delete<{ message: string }>(
                `meetings/${meetingId}`,
                undefined,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response;
        } catch (error) {
            console.error("Error deleting meeting:", error);
            throw error;
        }
    }

    static async recordJoin(meetingId: string, token: string): Promise<{ message: string }> {
        try {
            const response = await _post<{ message: string }>(
                `meetings/${meetingId}/join`,
                {},
                token
            );
            return response;
        } catch (error) {
            console.error("Error recording join:", error);
            throw error;
        }
    }

    static async addParticipants(
        meetingId: string,
        participants: string[],
        token: string
    ): Promise<{ message: string; meeting: Meeting }> {
        try {
            const response = await _post<{ message: string; meeting: Meeting }>(
                `meetings/${meetingId}/participants`,
                { participants },
                token
            );
            return response;
        } catch (error) {
            console.error("Error adding participants:", error);
            throw error;
        }
    }

    static async deleteRecording(
        meetingId: string,
        recordingName: string,
        sessionId: string,
        token: string
    ): Promise<{ message: string }> {
        try {
            const response = await _post<{ message: string }>(
                `meetings/${meetingId}/recordings/delete`,
                { recordingName, sessionId },
                token
            );
            return response;
        } catch (error) {
            console.error("Error deleting recording:", error);
            throw error;
        }
    }
}

export default MeetingService;
