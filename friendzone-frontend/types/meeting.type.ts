export interface MeetingParticipant {
    user: {
        _id: string;
        firstName: string;
        lastName?: string;
        profileImage?: string;
    };
    status: 'pending' | 'accepted' | 'declined';
    joinedAt?: string;
    leftAt?: string;
}

export interface MeetingSettings {
    isRecordingEnabled: boolean;
    waitingRoomEnabled: boolean;
    muteOnEntry: boolean;
    allowScreenShare: boolean;
}

export interface Meeting {
    _id: string;
    title: string;
    description?: string;
    host: {
        _id: string;
        firstName: string;
        lastName?: string;
        profileImage?: string;
    };
    participants: MeetingParticipant[];
    roomId: string;
    startTime: string;
    endTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
    kind?: 'video' | 'in_person';
    audioOnly?: boolean;
    instant?: boolean;
    location?: string;
    status: 'upcoming' | 'live' | 'completed' | 'cancelled';
    maxParticipants: number;
    settings: MeetingSettings;
    recordingUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMeetingInput {
    title: string;
    kind?: 'video' | 'in_person';
    location?: string;
    description?: string;
    startTime: string;
    participants?: string[];
    maxParticipants?: number;
    settings?: Partial<MeetingSettings>;
}

export interface MeetingTokenResponse {
    roomId: string;
    token: string;
    apiKey: string;
    userId: string;
    userName: string;
    isHost: boolean;
}

export interface GetMeetingsResponse {
    meetings: Meeting[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
