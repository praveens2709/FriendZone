// controllers/gameController.js (Modified)
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const notificationController = require('./notificationController');
const snakeLadderEngine = require('../gameLogic/snakeLadderEngine');
const ticTacToeEngine = require('../gameLogic/ticTacToeEngine'); // NEW: Import Tic-Tac-Toe engine

const getUserAvatar = (user) => user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName || ""}`;

exports.sendGameInvite = async (req, res, io, userSocketMap) => {
    console.log('[gameController] sendGameInvite called');
    const { gameId, invitedUserIds } = req.body;
    const initiatorId = req.user.id;
    console.log(`[gameController] Initiator: ${initiatorId}, Game: ${gameId}, Invited: ${invitedUserIds}`);

    try {
        if (!gameId || !invitedUserIds || invitedUserIds.length === 0) {
            console.warn('[gameController] Validation Error: Game ID or invited users missing.');
            return res.status(400).json({ message: "Game ID and invited users are required." });
        }

        if (gameId === 'tic_tac_toe' && invitedUserIds.length !== 1) {
            console.warn('[gameController] Validation Error: Tic-Tac-Toe requires exactly one invited user.');
            return res.status(400).json({ message: "Tic-Tac-Toe requires exactly one invited user." });
        }
        if (gameId === 'snake_ladder' && invitedUserIds.length < 1) { // Assuming Snake & Ladder supports 2+ players
            console.warn('[gameController] Validation Error: Snake & Ladder requires at least one invited user.');
            return res.status(400).json({ message: "Snake & Ladder requires at least one invited user." });
        }

        const initiator = await User.findById(initiatorId).select('firstName lastName profileImage');
        if (!initiator) {
            console.error('[gameController] Error: Initiator user not found.');
            return res.status(404).json({ message: "Initiator user not found." });
        }

        const participantsUserIds = [initiatorId, ...invitedUserIds];
        const participantsData = await User.find({ _id: { $in: participantsUserIds } }).select('_id firstName lastName profileImage');
        console.log(`[gameController] Participants found: ${participantsData.length}`);

        const participantObjectsForGame = participantsUserIds.map(pId => {
            const userDoc = participantsData.find(pd => pd._id.toString() === pId.toString());
            return {
                userId: pId.toString(),
                username: userDoc ? `${userDoc.firstName} ${userDoc.lastName || ''}`.trim() : 'Unknown Player',
                avatar: userDoc ? getUserAvatar(userDoc) : null,
                position: 1 // Snake & Ladder specific, can be ignored for Tic-Tac-Toe initial state
            };
        });

        let initialGameStateForPending;
        let gameNameForNotification = '';

        switch (gameId) {
            case 'snake_ladder':
                initialGameStateForPending = snakeLadderEngine.getPendingGameState(participantObjectsForGame, initiatorId);
                gameNameForNotification = 'Snake & Ladder';
                break;
            case 'tic_tac_toe': // NEW: Tic-Tac-Toe
                initialGameStateForPending = ticTacToeEngine.getPendingGameState(participantObjectsForGame, initiatorId);
                gameNameForNotification = 'Tic-Tac-Toe';
                break;
            default:
                console.error(`[gameController] Error: Unsupported game ID: ${gameId}`);
                return res.status(400).json({ message: "Unsupported game ID." });
        }
        console.log('[gameController] Initial game state for pending session generated.');

        const gameSession = new GameSession({
            gameId,
            initiator: initiatorId,
            participants: participantsUserIds,
            acceptedBy: [initiatorId],
            gameStateData: initialGameStateForPending,
            currentPlayer: initialGameStateForPending.currentPlayer,
            status: 'pending'
        });
        await gameSession.save();
        console.log(`[gameController] GameSession created with ID: ${gameSession._id}`);

        const gameSessionId = gameSession._id.toString();
        const initiatorUsername = `${initiator.firstName} ${initiator.lastName || ''}`.trim();
        const initiatorAvatar = getUserAvatar(initiator);

        for (const userId of invitedUserIds) {
            console.log(`[gameController] Sending notification to invited user: ${userId}`);
            await notificationController.createNotification({
                recipientId: userId,
                senderId: initiatorId,
                type: 'game_invite',
                content: `${initiatorUsername} invited you to play ${gameNameForNotification}!`,
                relatedEntityId: gameSessionId,
                relatedEntityType: 'GameSession',
                metadata: {
                    gameId: gameId,
                    gameName: gameNameForNotification,
                    initiatorUsername: initiatorUsername,
                    initiatorAvatar: initiatorAvatar,
                    status: 'pending'
                },
                io: io
            });
        }

        res.status(201).json({ message: "Game invite sent successfully.", gameSessionId });
        console.log('[gameController] sendGameInvite finished successfully.');

    } catch (error) {
        console.error("[gameController] Error sending game invite:", error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.acceptGameInvite = async (req, res, io, userSocketMap) => {
    console.log('[gameController] acceptGameInvite called');
    const { gameSessionId } = req.params;
    const userId = req.user.id;
    console.log(`[gameController] User ${userId} attempting to accept invite for session: ${gameSessionId}`);
console.log('[acceptGameInvite] Current userSocketMap:', Array.from(userSocketMap.entries()));

    try {
        const gameSession = await GameSession.findById(gameSessionId);

        if (!gameSession) {
            console.warn('[gameController] Accept Error: Game invite not found.');
            return res.status(404).json({ message: "Game invite not found." });
        }
        if (!gameSession.participants.includes(userId)) {
            console.warn(`[gameController] Accept Error: User ${userId} not a participant.`);
            return res.status(403).json({ message: "You are not a participant in this game invite." });
        }
        if (gameSession.acceptedBy.includes(userId)) {
            console.warn(`[gameController] Accept Error: User ${userId} already accepted.`);
            return res.status(400).json({ message: "You have already accepted this invite." });
        }
        if (gameSession.status !== 'pending') {
            console.warn(`[gameController] Accept Error: Game session status is ${gameSession.status}, not pending.`);
            return res.status(400).json({ message: "Game session is no longer pending." });
        }

        gameSession.acceptedBy.push(userId);
        console.log(`[gameController] User ${userId} added to acceptedBy list. Accepted count: ${gameSession.acceptedBy.length}`);

        const allAccepted = gameSession.participants.every(p => gameSession.acceptedBy.includes(p));
        console.log(`[gameController] All participants accepted: ${allAccepted}`);

        if (allAccepted) {
            gameSession.status = 'in-progress';
            gameSession.gameStartTime = new Date();
            console.log('[gameController] All accepted, setting game status to in-progress.');

            const participantsData = await User.find({ _id: { $in: gameSession.participants } }).select('_id firstName lastName profileImage');
            const participantObjectsForGame = gameSession.participants.map(pId => {
                const userDoc = participantsData.find(pd => pd._id.toString() === pId.toString());
                return {
                    userId: pId.toString(),
                    username: userDoc ? `${userDoc.firstName} ${userDoc.lastName || ''}`.trim() : 'Unknown Player',
                    avatar: userDoc ? getUserAvatar(userDoc) : null,
                    position: 1 // Snake & Ladder specific, can be ignored for other games
                };
            });

            // NEW: Use appropriate engine for initial game state
            let gameEngine;
            switch (gameSession.gameId) {
                case 'snake_ladder':
                    gameEngine = snakeLadderEngine;
                    break;
                case 'tic_tac_toe':
                    gameEngine = ticTacToeEngine;
                    break;
                default:
                    console.error(`[gameController] Error: Game engine not found for game ID: ${gameSession.gameId}`);
                    return res.status(400).json({ message: "Unsupported game ID." });
            }

            gameSession.gameStateData = gameEngine.getInitialGameState(participantObjectsForGame, gameSession.initiator.toString());
            gameSession.currentPlayer = gameSession.gameStateData.currentPlayer;
            console.log('[gameController] Game state re-initialized for in-progress status.');
        }
        await gameSession.save();
        console.log(`[gameController] GameSession ${gameSession._id} saved.`);

        const eventData = {
            gameSessionId: gameSession._id.toString(),
            gameId: gameSession.gameId,
            initiatorId: gameSession.initiator.toString(),
            participants: gameSession.participants.map(p => p.toString())
        };

        for (const participantId of gameSession.participants) {
            console.log(`[gameController] Creating activity notification for participant: ${participantId}`);
            let gameNameForNotification = '';
            switch (gameSession.gameId) {
                case 'snake_ladder': gameNameForNotification = 'Snake & Ladder'; break;
                case 'tic_tac_toe': gameNameForNotification = 'Tic-Tac-Toe'; break;
                default: gameNameForNotification = gameSession.gameId;
            }

            let startMessage = `Game "${gameNameForNotification}" is starting!`;
            if (allAccepted) {
                const acceptedUsers = await User.find({ _id: { $in: gameSession.acceptedBy } }).select('firstName lastName');
                const otherUsers = acceptedUsers.filter(u => u._id.toString() !== participantId.toString());
                let names = otherUsers.map(u => `${u.firstName} ${u.lastName || ''}`.trim());
                if (names.length === 1) {
                    startMessage = `Game "${gameNameForNotification}" starting with ${names[0]}`;
                } else if (names.length > 1) {
                    startMessage = `Game "${gameNameForNotification}" starting with ${names[0]} +${names.length - 1}`;
                }
            }
            await notificationController.createNotification({
                recipientId: participantId,
                senderId: userId,
                type: 'game_activity',
                content: allAccepted ? startMessage : `${(await User.findById(userId)).firstName} accepted the invite for "${gameNameForNotification}".`,
                relatedEntityId: gameSessionId,
                relatedEntityType: 'GameSession',
                metadata: { status: allAccepted ? 'in-progress' : 'accepted', gameId: gameSession.gameId, gameName: gameNameForNotification },
                io: io
            });
            console.log(`[gameController] Marking original notification as read for participant: ${participantId}`);
            await notificationController.markNotificationAsReadAndProcessGameInvite(gameSessionId, participantId, allAccepted ? 'in-progress' : 'accepted');

            if (allAccepted) {
                const participantSocketId = userSocketMap.get(participantId.toString());
                if (participantSocketId) {
                    console.log(`[gameController] Emitting 'gameSessionStarted' directly to socket ${participantSocketId} for user ${participantId}`);
                    io.to(participantSocketId).emit('gameSessionStarted', eventData);
                } else {
                    console.warn(`[gameController] User ${participantId} is not online (no socketId found in map) for 'gameSessionStarted' direct emit.`);
                }
            }
        }
        res.status(200).json({ message: "Game invite accepted.", gameSessionStatus: gameSession.status });
        console.log('[gameController] acceptGameInvite finished successfully.');

    } catch (error) {
        console.error("[gameController] Error accepting game invite:", error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.declineGameInvite = async (req, res, io, userSocketMap) => {
    console.log('[gameController] declineGameInvite called');
    const { gameSessionId } = req.params;
    const userId = req.user.id;
    console.log(`[gameController] User ${userId} attempting to decline invite for session: ${gameSessionId}`);

    try {
        const gameSession = await GameSession.findById(gameSessionId);

        if (!gameSession) {
            console.warn('[gameController] Decline Error: Game invite not found.');
            return res.status(404).json({ message: "Game invite not found." });
        }
        if (!gameSession.participants.includes(userId)) {
            console.warn(`[gameController] Decline Error: User ${userId} not a participant.`);
            return res.status(403).json({ message: "You are not a participant in this game invite." });
        }
        if (gameSession.declinedBy.includes(userId)) {
            console.warn(`[gameController] Decline Error: User ${userId} already declined.`);
            return res.status(400).json({ message: "You have already declined this invite." });
        }
        if (gameSession.status !== 'pending') {
            console.warn(`[gameController] Decline Error: Game session status is ${gameSession.status}, not pending.`);
            return res.status(400).json({ message: "Game session is no longer pending." });
        }

        gameSession.declinedBy.push(userId);
        gameSession.status = 'declined';
        await gameSession.save();
        console.log(`[gameController] GameSession ${gameSession._id} declined by ${userId}.`);

        for (const participantId of gameSession.participants) {
            console.log(`[gameController] Creating activity notification for participant: ${participantId}`);
            let gameNameForNotification = '';
            switch (gameSession.gameId) {
                case 'snake_ladder': gameNameForNotification = 'Snake & Ladder'; break;
                case 'tic_tac_toe': gameNameForNotification = 'Tic-Tac-Toe'; break;
                default: gameNameForNotification = gameSession.gameId;
            }

            await notificationController.createNotification({
                recipientId: participantId,
                senderId: userId,
                type: 'game_activity',
                content: `${(await User.findById(userId)).firstName} declined the invite for "${gameNameForNotification}".`,
                relatedEntityId: gameSessionId,
                relatedEntityType: 'GameSession',
                metadata: { status: 'declined', gameId: gameSession.gameId, gameName: gameNameForNotification },
                io: io
            });
            console.log(`[gameController] Marking original notification as read for participant: ${participantId}`);
            await notificationController.markNotificationAsReadAndProcessGameInvite(gameSessionId, participantId, 'declined');
        }

        res.status(200).json({ message: "Game invite declined." });
        console.log('[gameController] declineGameInvite finished successfully.');

    } catch (error) {
        console.error("[gameController] Error declining game invite:", error);
        res.status(500).json({ message: "Server error." });
    }
};