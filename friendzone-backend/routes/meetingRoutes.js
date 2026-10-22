import express from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isObjectId } from '../utils/validate.js';

export default function meetingRoutes(io, userSocketMap) {
    const router = express.Router();

    router.use(protect);

    router.param('meetingId', (req, res, next, id) => {
        if (!isObjectId(id)) {
            return res.status(400).json({ message: 'Invalid meeting ID' });
        }
        next();
    });

    router.post('/', (req, res) => meetingController.createMeeting(req, res, io));

    router.get('/', meetingController.getUserMeetings);

    router.get('/search-invitees', meetingController.searchUsersForInvite);

    router.get('/:meetingId', meetingController.getMeetingById);

    router.post('/:meetingId/token', meetingController.generateMeetingToken);

    router.patch('/:meetingId/status', meetingController.updateMeetingStatus);

    router.patch('/:meetingId', (req, res) => meetingController.updateMeeting(req, res, io));

    router.post('/:meetingId/respond', (req, res) => meetingController.respondToInvitation(req, res, io));

    router.delete('/:meetingId', (req, res) => meetingController.deleteMeeting(req, res, io));

    router.post('/:meetingId/join', meetingController.recordParticipantJoin);

    router.post('/:meetingId/participants', (req, res) => meetingController.addParticipants(req, res, io));

    router.post('/:meetingId/recordings/delete', meetingController.deleteSpecificRecording);

    return router;
}
