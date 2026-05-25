import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending',
    },
    joinedAt: {
        type: Date,
        default: null,
    },
    leftAt: {
        type: Date,
        default: null,
    },
});

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: [participantSchema],
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        // Optional - if not provided, defaults to startTime + 2 hours
    },
    actualStartTime: {
        type: Date,
        default: null,
    },
    actualEndTime: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['upcoming', 'live', 'completed', 'cancelled'],
        default: 'upcoming',
    },
    maxParticipants: {
        type: Number,
        default: 15,
        min: 2,
        max: 100, // 100ms supports up to 100 participants
    },
    settings: {
        isRecordingEnabled: {
            type: Boolean,
            default: false,
        },
        waitingRoomEnabled: {
            type: Boolean,
            default: false,
        },
        muteOnEntry: {
            type: Boolean,
            default: true,
        },
        allowScreenShare: {
            type: Boolean,
            default: true,
        },
    },
    recordingUrl: {
        type: String,
        default: null,
    },
}, { timestamps: true });

// Generate unique roomId before saving
meetingSchema.pre('save', function (next) {
    if (this.isNew && !this.roomId) {
        // Generate a unique room ID: combination of timestamp + random string
        this.roomId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    next();
});

// Indexes for efficient queries
meetingSchema.index({ host: 1, status: 1 });
meetingSchema.index({ 'participants.user': 1, status: 1 });
meetingSchema.index({ startTime: 1 });
// Note: roomId index is already created by unique: true on the field

export default mongoose.model('Meeting', meetingSchema);
