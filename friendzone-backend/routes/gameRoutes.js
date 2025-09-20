import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as gameController from '../controllers/gameController.js';

const router = Router();

export default (io, userSocketMap) => {
    router.post('/invite', protect, (req, res) => gameController.sendGameInvite(req, res, io, userSocketMap));
    router.post('/:gameSessionId/accept', protect, (req, res) => gameController.acceptGameInvite(req, res, io, userSocketMap));
    router.post('/:gameSessionId/decline', protect, (req, res) => gameController.declineGameInvite(req, res, io, userSocketMap));
    return router;
};