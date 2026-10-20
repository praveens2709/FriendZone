import Meeting from '../models/Meeting.js';
import mongoose from 'mongoose';
import Knock from '../models/Knock.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotification } from './notificationController.js';
import { v4 as uuidv4 } from 'uuid';
import { toIdList, escapeRegex, cleanString } from '../utils/validate.js';
import { getBlockedIds } from '../services/privacyService.js';
import { StreamClient } from '@stream-io/node-sdk';

let streamClient = null;

const getStreamClient = () => {
    if (!streamClient) {
        if (!process.env.STREAM_API_KEY || !process.env.STREAM_SECRET_KEY) {
            throw new Error('Stream credentials are not configured');
        }
        streamClient = new StreamClient(process.env.STREAM_API_KEY, process.env.STREAM_SECRET_KEY);
    }
    return streamClient;
};

const POPULATE_FIELDS = [
    { path: 'host', select: 'firstName lastName profileImage' },
    { path: 'participants.user', select: 'firstName lastName profileImage' },
];

const emitMeetingUpdate = async (io, meeting) => {
    if (!io) return;
    try {
        const populated = await Meeting.findById(meeting._id).populate(POPULATE_FIELDS).lean();
        if (!populated || !populated.host) return;
        const clean = { ...populated, participants: populated.participants.filter((p) => p.user) };
        const recipients = [
            populated.host._id.toString(),
            ...clean.participants.map((p) => p.user._id.toString()),
        ];
        recipients.forEach((id) => io.to(`notifications-${id}`).emit('meetingUpdated', clean));
    } catch (error) {
        console.error('Error emitting meeting update:', error.message);
    }
};

export const removeMeetingNotifications = async (meeting, io) => {
    const meetingId = meeting._id.toString();
    const recipients = await Notification.distinct('recipient', {
        $or: [{ relatedEntityId: meeting._id }, { 'metadata.meetingId': meetingId }]
    });
    await Notification.deleteMany({
        $or: [{ relatedEntityId: meeting._id }, { 'metadata.meetingId': meetingId }]
    });
    if (io) {
        recipients.forEach((id) => {
            io.to(`notifications-${id}`).emit('meetingNotificationsRemoved', { meetingId });
        });
    }
};

export const expireStaleMeetings = async () => {
    const now = new Date();
    await Meeting.updateMany(
        { status: 'upcoming', endTime: { $lt: now } },
        { $set: { status: 'completed', actualEndTime: now } }
    );
    await Meeting.updateMany(
        { status: 'live', endTime: { $lt: new Date(now.getTime() - 3 * 60 * 60 * 1000) } },
        { $set: { status: 'completed', actualEndTime: now } }
    );
};

const SETTING_KEYS = ['isRecordingEnabled', 'waitingRoomEnabled', 'muteOnEntry', 'allowScreenShare'];

const sanitizeSettings = (settings) => {
    const clean = {};
    if (settings && typeof settings === 'object') {
        for (const key of SETTING_KEYS) {
            if (typeof settings[key] === 'boolean') clean[key] = settings[key];
        }
    }
    return clean;
};

const filterInvitableUsers = async (hostId, ids) => {
    const candidates = ids.filter((id) => id !== hostId);
    if (!candidates.length) return [];
    const blocked = await getBlockedIds(hostId);
    const users = await User.find({
        _id: { $in: candidates.filter((id) => !blocked.has(id)) },
        isVerified: true,
    })
        .select('_id')
        .lean();
    return users.map((u) => u._id.toString());
};

export const createMeeting = async (req, res, io) => {
    try {
        const { startTime, endTime, maxParticipants, settings } = req.body;
        const title = cleanString(req.body.title, 100);
        const description = cleanString(req.body.description, 500);
        const kind = req.body.kind === 'in_person' ? 'in_person' : 'video';
        const location = cleanString(req.body.location, 200);
        const hostId = req.user._id;

        if (kind === 'in_person' && !location) {
            return res.status(400).json({ message: 'A place is required for in-person plans' });
        }

        if (!title || !startTime) {
            return res.status(400).json({ message: 'Title and start time are required' });
        }

        const start = new Date(startTime);
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid start time' });
        }
        const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        if (Number.isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid end time' });
        }

        if (endTime && start >= end) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        if (start < new Date()) {
            return res.status(400).json({ message: 'Start time cannot be in the past' });
        }

        const requested = req.body.participants === undefined ? [] : toIdList(req.body.participants, 100);
        if (!requested) {
            return res.status(400).json({ message: 'Invalid participants' });
        }

        const participants = await filterInvitableUsers(hostId.toString(), requested);

        const roomId = uuidv4();

        const participantsList = participants.map(userId => ({
            user: userId,
            status: 'pending',
        }));

        const meeting = new Meeting({
            title,
            description,
            kind,
            location,
            host: hostId,
            participants: participantsList,
            roomId: roomId,
            startTime: start,
            endTime: end,
            maxParticipants: Math.min(Math.max(parseInt(maxParticipants, 10) || 100, 2), 100),
            settings: sanitizeSettings(settings),
        });

        await meeting.save();

        await meeting.populate([
            { path: 'host', select: 'firstName lastName profileImage' },
            { path: 'participants.user', select: 'firstName lastName profileImage' }
        ]);

        if (participants.length > 0 && io) {
            const formattedTime = start.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });

            for (const participantId of participants) {
                try {
                    await createNotification({
                        recipientId: participantId,
                        senderId: hostId,
                        type: 'meeting_invite',
                        content: `invited you to "${title}" on ${formattedTime}`,
                        relatedEntityId: meeting._id,
                        relatedEntityType: 'Meeting',
                        metadata: {
                            meetingId: meeting._id.toString(),
                            meetingTitle: title,
                            startTime: start.toISOString(),
                            status: 'pending'
                        },
                        io
                    });
                } catch (notifError) {
                    console.error(`Error sending notification to ${participantId}:`, notifError);
                }
            }
        }

        if (io) {
            const recipientIds = [...participants, hostId.toString()];
            recipientIds.forEach(id => {
                io.to(`notifications-${id}`).emit('meetingCreated', meeting);
            });
        }

        res.status(201).json(meeting);
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ message: 'Failed to create meeting' });
    }
};

export const getUserMeetings = async (req, res) => {
    try {
        const userId = req.user._id;
        await expireStaleMeetings();
        const { status } = req.query;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

        const query = {
            $or: [
                { host: userId },
                { 'participants.user': userId }
            ]
        };

        if (status === 'past') {
            query.status = { $in: ['completed', 'cancelled'] };
        } else if (typeof status === 'string' && ['upcoming', 'live', 'completed', 'cancelled'].includes(status)) {
            query.status = status;
        }

        const from = req.query.from ? new Date(req.query.from) : null;
        const to = req.query.to ? new Date(req.query.to) : null;
        if (from && !Number.isNaN(from.getTime())) query.startTime = { ...query.startTime, $gte: from };
        if (to && !Number.isNaN(to.getTime())) query.startTime = { ...query.startTime, $lte: to };

        const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
        if (q) query.title = { $regex: escapeRegex(q), $options: 'i' };

        if (req.query.includeInstant !== 'true') {
            query.instant = { $ne: true };
        }

        const skip = (page - 1) * limit;

        const meetings = await Meeting.find(query)
            .populate('host', 'firstName lastName profileImage')
            .populate('participants.user', 'firstName lastName profileImage')
            .sort({ startTime: ['completed', 'cancelled', 'past'].includes(String(status)) ? -1 : 1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Meeting.countDocuments(query);

        const cleanMeetings = meetings
            .filter((m) => m.host)
            .map((m) => ({ ...m, participants: m.participants.filter((p) => p.user) }));

        res.json({
            meetings: cleanMeetings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Failed to fetch meetings' });
    }
};

export const getMeetingById = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(meetingId)) {
            return res.status(400).json({ message: 'Invalid meeting ID' });
        }

        const meeting = await Meeting.findById(meetingId)
            .populate('host', 'firstName lastName profileImage')
            .populate('participants.user', 'firstName lastName profileImage');

        if (!meeting || !meeting.host) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        meeting.participants = meeting.participants.filter((p) => p.user);

        const isHost = meeting.host._id.toString() === userId.toString();
        const isParticipant = meeting.participants.some(
            p => p.user._id.toString() === userId.toString()
        );

        if (!isHost && !isParticipant) {
            return res.status(403).json({ message: 'You do not have access to this meeting' });
        }

        res.json(meeting);
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({ message: 'Failed to fetch meeting' });
    }
};



export const generateMeetingToken = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;
        const userName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (meeting.kind === 'in_person') {
            return res.status(400).json({ message: 'This plan is in person' });
        }

        const isHost = meeting.host.toString() === userId.toString();
        const isParticipant = meeting.participants.some(
            p => p.user.toString() === userId.toString()
        );

        if (!isHost && !isParticipant) {
            return res.status(403).json({ message: 'You are not invited to this meeting' });
        }

        if (meeting.status === 'cancelled') {
            return res.status(400).json({ message: 'This meeting has been cancelled' });
        }


        const exp = Math.round(new Date().getTime() / 1000) + 6 * 60 * 60;
        const token = getStreamClient().createToken(userId.toString(), exp);

        await getStreamClient().upsertUsers([{
            id: userId.toString(),
            role: isHost ? 'admin' : 'user',
            name: userName,
            image: req.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`
        }]);

        res.json({
            roomId: meeting.roomId,
            token: token,
            apiKey: process.env.STREAM_API_KEY,
            userId: userId.toString(),
            userName,
            isHost,
        });
    } catch (error) {
        console.error('Error generating Stream token:', error);
        res.status(500).json({ message: 'Failed to generate meeting token' });
    }
};


export const updateMeetingStatus = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (meeting.kind === 'in_person' && status === 'live') {
            return res.status(400).json({ message: 'In-person plans have nothing to start.' });
        }

        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can update meeting status' });
        }

        const validTransitions = {
            upcoming: ['live', 'cancelled'],
            live: ['completed'],
            completed: [],
            cancelled: [],
        };

        if (!validTransitions[meeting.status]?.includes(status)) {
            return res.status(400).json({
                message: `Cannot transition from ${meeting.status} to ${status}`
            });
        }

        meeting.status = status;

        if (status === 'live') {
            meeting.actualStartTime = new Date();
        } else if (status === 'completed') {
            meeting.actualEndTime = new Date();
        }

        await meeting.save();
        if (status === 'cancelled') {
            await removeMeetingNotifications(meeting, req.app.get('socketio'));
        }
        await emitMeetingUpdate(req.app.get('socketio'), meeting);
        await meeting.populate([
            { path: 'host', select: 'firstName lastName profileImage' },
            { path: 'participants.user', select: 'firstName lastName profileImage' }
        ]);

        res.json(meeting);
    } catch (error) {
        console.error('Error updating meeting status:', error);
        res.status(500).json({ message: 'Failed to update meeting status' });
    }
};

export const respondToInvitation = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const { response } = req.body;
        const userId = req.user._id;

        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ message: 'Invalid response. Must be "accepted" or "declined"' });
        }

        const meeting = await Meeting.findById(meetingId)
            .populate('host', 'firstName lastName profileImage');

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        const participantIndex = meeting.participants.findIndex(
            p => p.user.toString() === userId.toString()
        );

        if (participantIndex === -1) {
            return res.status(403).json({ message: 'You are not invited to this meeting' });
        }

        meeting.participants[participantIndex].status = response;
        await meeting.save();

        try {
            await Notification.updateMany(
                {
                    recipient: userId,
                    $or: [
                        { relatedEntityId: meeting._id },
                        { 'metadata.meetingId': meeting._id.toString() }
                    ]
                },
                {
                    $set: {
                        'metadata.status': response
                    }
                }
            );
        } catch (notifUpdateErr) {
            console.error('Error updating invitee notification status:', notifUpdateErr);
        }

        const respondingUser = await User.findById(userId).select('firstName lastName profileImage');
        const userName = respondingUser ? `${respondingUser.firstName} ${respondingUser.lastName || ''}`.trim() : 'Someone';

        if (io && meeting.host._id.toString() !== userId.toString()) {
            await createNotification({
                recipientId: meeting.host._id,
                senderId: userId,
                type: 'activity',
                content: `${response} your meeting invite "${meeting.title}"`,
                relatedEntityId: meeting._id,
                relatedEntityType: 'Meeting',
                metadata: {
                    meetingId: meeting._id.toString(),
                    response: response
                },
                io
            });

            io.to(`notifications-${meeting.host._id}`).emit('meetingInviteResponse', {
                meetingId: meeting._id.toString(),
                participantId: userId.toString(),
                participantName: userName,
                response: response
            });
        }

        if (io) {
            io.to(`notifications-${userId}`).emit('meetingInviteStatusUpdated', {
                meetingId: meeting._id.toString(),
                status: response
            });
        }

        await emitMeetingUpdate(io, meeting);

        res.json({ message: `Invitation ${response}` });
    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ message: 'Failed to respond to invitation' });
    }
};

export const addParticipants = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const requestedIds = toIdList(req.body.participants, 100);
        const userId = req.user._id;

        if (!requestedIds || requestedIds.length === 0) {
            return res.status(400).json({ message: 'Participants array is required' });
        }

        const participants = await filterInvitableUsers(userId.toString(), requestedIds);

        const meeting = await Meeting.findById(meetingId)
            .populate('host', 'firstName lastName profileImage');

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (meeting.host._id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can add participants' });
        }

        if (!['upcoming', 'live'].includes(meeting.status)) {
            return res.status(400).json({ message: 'Cannot add participants to a completed or cancelled meeting' });
        }

        const existingParticipantIds = meeting.participants.map(p => p.user.toString());
        const newParticipants = participants.filter(id =>
            !existingParticipantIds.includes(id.toString()) && id.toString() !== userId.toString()
        );

        if (newParticipants.length === 0) {
            return res.status(400).json({ message: 'All users are already invited' });
        }

        const totalParticipants = meeting.participants.length + newParticipants.length + 1;
        if (totalParticipants > meeting.maxParticipants) {
            return res.status(400).json({
                message: `Cannot exceed ${meeting.maxParticipants} participants`
            });
        }

        const newParticipantsList = newParticipants.map(uid => ({
            user: uid,
            status: 'pending',
        }));
        meeting.participants.push(...newParticipantsList);
        await meeting.save();

        if (io) {
            const hostName = `${meeting.host.firstName} ${meeting.host.lastName || ''}`.trim();
            const formattedTime = new Date(meeting.startTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });

            for (const participantId of newParticipants) {
                try {
                    await createNotification({
                        recipientId: participantId,
                        senderId: userId,
                        type: 'meeting_invite',
                        content: `invited you to "${meeting.title}" on ${formattedTime}`,
                        relatedEntityId: meeting._id,
                        relatedEntityType: 'Meeting',
                        metadata: {
                            meetingId: meeting._id.toString(),
                            meetingTitle: meeting.title,
                            startTime: meeting.startTime.toISOString(),
                            status: 'pending'
                        },
                        io
                    });
                } catch (notifError) {
                    console.error(`Error sending notification to ${participantId}:`, notifError);
                }
            }
        }

        await meeting.populate('participants.user', 'firstName lastName profileImage');

        res.json({
            message: `Added ${newParticipants.length} participant(s)`,
            meeting
        });

        if (io) {
            const recipientIds = [
                meeting.host._id.toString(),
                ...meeting.participants.map(p => p.user._id.toString())
            ];
            recipientIds.forEach(id => {
                io.to(`notifications-${id}`).emit('meetingUpdated', meeting);
            });
        }
    } catch (error) {
        console.error('Error adding participants:', error);
        res.status(500).json({ message: 'Failed to add participants' });
    }
};

export const deleteMeeting = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can delete this meeting' });
        }

        if (meeting.status === 'live') {
            meeting.status = 'completed';
            meeting.actualEndTime = new Date();
            await meeting.save();
        } else if (meeting.status === 'upcoming') {
            meeting.status = 'cancelled';
            await meeting.save();
            await removeMeetingNotifications(meeting, io);
        } else if (['completed', 'cancelled'].includes(meeting.status)) {
            await Meeting.deleteOne({ _id: meeting._id });
            await removeMeetingNotifications(meeting, io);

            if (io) {
                const recipientIds = [
                    meeting.host.toString(),
                    ...meeting.participants.map(p => p.user.toString())
                ];
                recipientIds.forEach(id => {
                    io.to(`notifications-${id}`).emit('meetingDeleted', { meetingId });
                });
            }

            return res.json({ message: 'Meeting deleted permanently' });
        }

        await emitMeetingUpdate(io, meeting);

        if (meeting.status === 'cancelled') {
            res.json({ message: 'Meeting cancelled successfully' });
        } else {
            res.json(meeting);
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ message: 'Failed to delete meeting' });
    }
};

export const recordParticipantJoin = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        const isHost = meeting.host.toString() === userId.toString();
        const participantIndex = meeting.participants.findIndex(
            p => p.user.toString() === userId.toString()
        );

        if (!isHost && participantIndex === -1) {
            return res.status(403).json({ message: 'You are not part of this meeting' });
        }

        if (participantIndex !== -1) {
            meeting.participants[participantIndex].joinedAt = new Date();
            await meeting.save();
        }

        res.json({ message: 'Join recorded' });
    } catch (error) {
        console.error('Error recording join:', error);
        res.status(500).json({ message: 'Failed to record join' });
    }
};

export const searchUsersForInvite = async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user._id;

        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchQuery = escapeRegex(String(q).trim().slice(0, 50));
        const blockedIds = await getBlockedIds(userId);

        const [knocksAsKnocker, knocksAsKnocked] = await Promise.all([
            Knock.find({ knocker: userId }).lean(),
            Knock.find({ knocked: userId }).lean()
        ]);

        const lockedInUserIds = new Set();
        const knockedUserIds = new Set();
        const knockerUserIds = new Set();

        knocksAsKnocker.forEach(k => {
            if (k.status === 'lockedIn') {
                lockedInUserIds.add(k.knocked.toString());
            } else if (k.status === 'onesidedlock' || k.status === 'pending') {
                knockedUserIds.add(k.knocked.toString());
            }
        });

        knocksAsKnocked.forEach(k => {
            if (k.status === 'lockedIn') {
                lockedInUserIds.add(k.knocker.toString());
            } else if (k.status === 'onesidedlock' || k.status === 'pending') {
                knockerUserIds.add(k.knocker.toString());
            }
        });

        const users = await User.find({
            _id: { $ne: userId, $nin: [...blockedIds] },
            isVerified: true,
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
            ],
        })
            .select('firstName lastName profileImage')
            .limit(30)
            .lean();

        const sortedUsers = users.map(user => {
            const id = user._id.toString();
            let priority = 3;
            let relationship = 'none';

            if (lockedInUserIds.has(id)) {
                priority = 0;
                relationship = 'lockedIn';
            } else if (knockerUserIds.has(id)) {
                priority = 1;
                relationship = 'knocker';
            } else if (knockedUserIds.has(id)) {
                priority = 2;
                relationship = 'knocked';
            }

            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImage: user.profileImage,
                relationship,
                priority
            };
        }).sort((a, b) => a.priority - b.priority);

        res.json(sortedUsers);
    } catch (error) {
        console.error('Error searching users for invite:', error);
        res.status(500).json({ message: 'Failed to search users' });
    }
};

export const deleteSpecificRecording = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { recordingName, sessionId } = req.body;
        const userId = req.user._id;

        if (!recordingName || !sessionId) {
            return res.status(400).json({ message: 'Recording name and session ID are required' });
        }

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can delete recordings' });
        }

        const call = getStreamClient().video.call('default', meeting._id.toString());

        await call.deleteRecording({
            session: sessionId,
            filename: recordingName
        });

        res.json({ message: 'Recording deleted successfully' });
    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({ message: 'Failed to delete recording' });
    }
};
