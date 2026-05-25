import Meeting from '../models/Meeting.js';
import mongoose from 'mongoose';
import Knock from '../models/Knock.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { StreamClient } from '@stream-io/node-sdk';

const streamClient = new StreamClient(process.env.STREAM_API_KEY, process.env.STREAM_SECRET_KEY);
// 100ms logic removed


// Create a new meeting
export const createMeeting = async (req, res, io) => {
    try {
        const { title, description, startTime, endTime, participants, maxParticipants, settings } = req.body;
        const hostId = req.user._id;

        if (!title || !startTime) {
            return res.status(400).json({ message: 'Title and start time are required' });
        }

        const start = new Date(startTime);
        // Default end time to 2 hours after start if not provided
        const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

        if (endTime && start >= end) {
            return res.status(400).json({ message: 'End time must be after start time' });
        }

        if (start < new Date()) {
            return res.status(400).json({ message: 'Start time cannot be in the past' });
        }

        // Generate internal room ID (UUID)
        const roomId = uuidv4();


        // Build participants array from user IDs
        const participantsList = participants?.map(userId => ({
            user: userId,
            status: 'pending',
        })) || [];

        const meeting = new Meeting({
            title,
            description,
            host: hostId,
            participants: participantsList,
            roomId: roomId, // Use internal UUID
            startTime: start,
            endTime: end,
            maxParticipants: maxParticipants || 100, // 100ms supports more participants
            settings: settings || {},
        });

        await meeting.save();

        // Populate host and participants for response
        await meeting.populate([
            { path: 'host', select: 'firstName lastName profileImage' },
            { path: 'participants.user', select: 'firstName lastName profileImage' }
        ]);

        // Send notifications to all participants
        if (participants && participants.length > 0 && io) {
            const hostName = `${meeting.host.firstName} ${meeting.host.lastName || ''}`.trim();
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

        // Emit real-time event to host and participants
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

// Get all meetings for the logged-in user (as host or participant)
export const getUserMeetings = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, page = 1, limit = 20 } = req.query;

        const query = {
            $or: [
                { host: userId },
                { 'participants.user': userId }
            ]
        };

        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const meetings = await Meeting.find(query)
            .populate('host', 'firstName lastName profileImage')
            .populate('participants.user', 'firstName lastName profileImage')
            .sort({ startTime: 1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Meeting.countDocuments(query);

        res.json({
            meetings,
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

// Get a single meeting by ID
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

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user has access to this meeting
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



// Generate Stream Token for joining a meeting
export const generateMeetingToken = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;
        const userName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user has access
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
        // Allow token generation for completed meetings so they can be played back


        // Generate Stream User Token
        // Expiration: 24 hours
        const exp = Math.round(new Date().getTime() / 1000) + 24 * 60 * 60;
        const token = streamClient.createToken(userId.toString(), exp);

        // Optionally upsert user in Stream (not strictly required if client handles it, but good practice)
        await streamClient.upsertUsers([{
            id: userId.toString(),
            role: isHost ? 'admin' : 'user',
            name: userName,
            image: req.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`
        }]);

        res.json({
            roomId: meeting.roomId,
            token: token,
            apiKey: process.env.STREAM_API_KEY, // Send API Key to frontend
            userId: userId.toString(),
            userName,
            isHost,
        });
    } catch (error) {
        console.error('Error generating Stream token:', error);
        res.status(500).json({ message: 'Failed to generate meeting token' });
    }
};


// Update meeting status (start/end meeting)
export const updateMeetingStatus = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only host can update status
        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can update meeting status' });
        }

        const validTransitions = {
            upcoming: ['live', 'cancelled'],
            live: ['completed'],
            completed: [],
            cancelled: [],
        };

        if (!validTransitions[meeting.status].includes(status)) {
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

// Respond to meeting invitation (accept/decline)
export const respondToInvitation = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const { response } = req.body; // 'accepted' or 'declined'
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

        // Get responding user info
        const respondingUser = await User.findById(userId).select('firstName lastName profileImage');
        const userName = respondingUser ? `${respondingUser.firstName} ${respondingUser.lastName || ''}`.trim() : 'Someone';

        // Notify host about the response
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

            // Emit real-time event to host
            io.to(`notifications-${meeting.host._id}`).emit('meetingInviteResponse', {
                meetingId: meeting._id.toString(),
                participantId: userId.toString(),
                participantName: userName,
                response: response
            });
        }

        res.json({ message: `Invitation ${response}` });
    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ message: 'Failed to respond to invitation' });
    }
};

// Add participants to an existing meeting
export const addParticipants = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const { participants } = req.body; // Array of user IDs
        const userId = req.user._id;

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: 'Participants array is required' });
        }

        const meeting = await Meeting.findById(meetingId)
            .populate('host', 'firstName lastName profileImage');

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only host can add participants
        if (meeting.host._id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can add participants' });
        }

        // Can only add to upcoming or live meetings
        if (!['upcoming', 'live'].includes(meeting.status)) {
            return res.status(400).json({ message: 'Cannot add participants to a completed or cancelled meeting' });
        }

        // Filter out already invited participants
        const existingParticipantIds = meeting.participants.map(p => p.user.toString());
        const newParticipants = participants.filter(id =>
            !existingParticipantIds.includes(id.toString()) && id.toString() !== userId.toString()
        );

        if (newParticipants.length === 0) {
            return res.status(400).json({ message: 'All users are already invited' });
        }

        // Check max participants limit
        const totalParticipants = meeting.participants.length + newParticipants.length + 1; // +1 for host
        if (totalParticipants > meeting.maxParticipants) {
            return res.status(400).json({
                message: `Cannot exceed ${meeting.maxParticipants} participants`
            });
        }

        // Add new participants
        const newParticipantsList = newParticipants.map(uid => ({
            user: uid,
            status: 'pending',
        }));
        meeting.participants.push(...newParticipantsList);
        await meeting.save();

        // Send notifications to new participants
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

        // Populate and return updated meeting
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

// Delete/Cancel a meeting
export const deleteMeeting = async (req, res, io) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await Meeting.findById(meetingId);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only host can delete
        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can delete this meeting' });
        }

        // If meeting is live, end it first
        // If meeting is live, end it first
        if (meeting.status === 'live') {
            meeting.status = 'completed';
            meeting.actualEndTime = new Date();
            await meeting.save();
        } else if (meeting.status === 'upcoming') {
            meeting.status = 'cancelled';
            await meeting.save();
        } else if (['completed', 'cancelled'].includes(meeting.status)) {
            // Hard delete for cleanup
            await Meeting.deleteOne({ _id: meeting._id });

            // Emit delete event immediately since it's gone
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

        // Legacy room cleanup removed


        // Emit real-time delete event
        if (io) {
            const recipientIds = [
                meeting.host.toString(),
                ...meeting.participants.map(p => p.user.toString())
            ];
            recipientIds.forEach(id => {
                io.to(`notifications-${id}`).emit('meetingDeleted', { meetingId });
            });
        }

        if (meeting.status === 'cancelled') {
            // Emit status update (cancelled)
            if (io) {
                const recipientIds = [
                    meeting.host.toString(),
                    ...meeting.participants.map(p => p.user.toString())
                ];
                recipientIds.forEach(id => {
                    io.to(`notifications-${id}`).emit('meetingUpdated', meeting);
                });
            }
            res.json({ message: 'Meeting cancelled successfully' });
        } else {
            // Just status update to completed
            if (io) {
                const recipientIds = [
                    meeting.host.toString(),
                    ...meeting.participants.map(p => p.user.toString())
                ];
                recipientIds.forEach(id => {
                    io.to(`notifications-${id}`).emit('meetingUpdated', meeting);
                });
            }
            res.json(meeting);
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ message: 'Failed to delete meeting' });
    }
};

// Record participant join time
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

// Search users for meeting invites with knock-based priority
export const searchUsersForInvite = async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user._id;

        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchQuery = q.trim();

        // Get all knocks involving current user
        const [knocksAsKnocker, knocksAsKnocked] = await Promise.all([
            Knock.find({ knocker: userId }).lean(),
            Knock.find({ knocked: userId }).lean()
        ]);

        // Categorize user IDs by relationship
        const lockedInUserIds = new Set();
        const knockedUserIds = new Set(); // users I knocked
        const knockerUserIds = new Set(); // users who knocked me

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

        // Search users matching query
        const users = await User.find({
            _id: { $ne: userId },
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
            ],
        })
            .select('firstName lastName profileImage')
            .limit(30)
            .lean();

        // Sort users by relationship priority
        const sortedUsers = users.map(user => {
            const id = user._id.toString();
            let priority = 3; // default: no relationship
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

// Delete a specific recording via Stream SDK
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

        // Only host can delete recordings
        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the host can delete recordings' });
        }

        // Call Stream SDK to delete the recording
        // We use meeting._id as the call ID (consistent with frontend usage)
        // Access 'video' namespace for unified SDK
        const call = streamClient.video.call('default', meeting._id.toString());

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
