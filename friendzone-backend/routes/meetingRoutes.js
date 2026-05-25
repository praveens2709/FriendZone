import express from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

export default function meetingRoutes(io, userSocketMap) {
    const router = express.Router();

    // All routes require authentication
    router.use(protect);

    // Create a new meeting (sends notifications to participants)
    router.post('/', (req, res) => meetingController.createMeeting(req, res, io));

    // Get all meetings for the current user
    router.get('/', meetingController.getUserMeetings);

    // Search users for meeting invites (must be before /:meetingId routes)
    router.get('/search-invitees', meetingController.searchUsersForInvite);

    // Get a specific meeting by ID
    router.get('/:meetingId', meetingController.getMeetingById);

    // Generate token for joining a meeting
    router.post('/:meetingId/token', meetingController.generateMeetingToken);

    // Update meeting status (start/end)
    router.patch('/:meetingId/status', meetingController.updateMeetingStatus);

    // Respond to meeting invitation (accept/decline)
    router.post('/:meetingId/respond', (req, res) => meetingController.respondToInvitation(req, res, io));

    // Delete/cancel a meeting
    router.delete('/:meetingId', (req, res) => meetingController.deleteMeeting(req, res, io));

    // Record participant join
    router.post('/:meetingId/join', meetingController.recordParticipantJoin);

    // Add participants to an existing meeting (host only)
    router.post('/:meetingId/participants', (req, res) => meetingController.addParticipants(req, res, io));

    // Delete a specific recording
    router.post('/:meetingId/recordings/delete', meetingController.deleteSpecificRecording);

    return router;
}
