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
    kind: {
        type: String,
        enum: ['video', 'in_person'],
        default: 'video',
    },
    audioOnly: {
        type: Boolean,
        default: false,
    },
    instant: {
        type: Boolean,
        default: false,
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        default: null,
    },
    location: {
        type: String,
        trim: true,
        maxlength: 200,
        default: '',
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
        max: 100,
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

meetingSchema.pre('save', function (next) {
    if (this.isNew && !this.roomId) {
        this.roomId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    next();
});

meetingSchema.index({ host: 1, status: 1 });
meetingSchema.index({ 'participants.user': 1, status: 1 });
meetingSchema.index({ startTime: 1 });

export default mongoose.model('Meeting', meetingSchema);
