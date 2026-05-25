import { _get, _post, _patch, _delete } from "../configs/api-methods.config";
import {
    Meeting,
    CreateMeetingInput,
    MeetingTokenResponse,
    GetMeetingsResponse,
} from "@/types/meeting.type";

class MeetingService {
    /**
     * Create a new meeting
     */
    static async createMeeting(data: CreateMeetingInput, token: string): Promise<Meeting> {
        try {
            const response = await _post<Meeting>("meetings", data, token);
            return response;
        } catch (error) {
            console.error("Error creating meeting:", error);
            throw error;
        }
    }

    /**
     * Get all meetings for the current user
     */
    static async getMeetings(
        token: string,
        params?: { status?: string; page?: number; limit?: number }
    ): Promise<GetMeetingsResponse> {
        try {
            const response = await _get<GetMeetingsResponse>("meetings", token, params);
            return response;
        } catch (error) {
            console.error("Error fetching meetings:", error);
            throw error;
        }
    }

    /**
     * Get a single meeting by ID
     */
    static async getMeetingById(meetingId: string, token: string): Promise<Meeting> {
        try {
            const response = await _get<Meeting>(`meetings/${meetingId}`, token);
            return response;
        } catch (error) {
            console.error("Error fetching meeting:", error);
            throw error;
        }
    }

    /**
     * Get token/credentials for joining a meeting
     */
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

    /**
     * Update meeting status (start/end meeting)
     */
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

    /**
     * Respond to meeting invitation
     */
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

    /**
     * Delete/Cancel a meeting
     */
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

    /**
     * Record participant join
     */
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

    /**
     * Add participants to an existing meeting
     */
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

    /**
     * Delete a specific recording
     */
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
