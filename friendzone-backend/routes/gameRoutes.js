// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const gameController = require('../controllers/gameController');

module.exports = (io, userSocketMap) => {
    router.post('/invite', protect, (req, res) => gameController.sendGameInvite(req, res, io, userSocketMap));
    router.post('/:gameSessionId/accept', protect, (req, res) => gameController.acceptGameInvite(req, res, io, userSocketMap));
    router.post('/:gameSessionId/decline', protect, (req, res) => gameController.declineGameInvite(req, res, io, userSocketMap));
    return router;
};