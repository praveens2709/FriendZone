const GameSession = require('../models/GameSession');
const User = require('../models/User');
const snakeLadderEngine = require('../gameLogic/snakeLadderEngine');
const ticTacToeEngine = require('../gameLogic/ticTacToeEngine');

const getUserAvatar = (user) => user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName || ""}`;

module.exports = (io, userSocketMap, socket) => {
    socket.on('joinGameSession', async (gameSessionId) => {
        console.log(`[gameSocketHandlers] 'joinGameSession' event received for session: ${gameSessionId}`);
        if (!socket.userId) {
            console.warn(`[gameSocketHandlers] Attempt to join game session ${gameSessionId} by unauthenticated socket ${socket.id}.`);
            socket.emit('gameError', 'Authentication required to join game session.');
            return;
        }

        const gameSession = await GameSession.findById(gameSessionId);
        if (!gameSession || !gameSession.participants.includes(socket.userId)) {
            console.warn(`[gameSocketHandlers] User ${socket.userId} unauthorized for session ${gameSessionId} or session not found.`);
            socket.emit('gameError', 'Game session not found or unauthorized.');
            return;
        }

        socket.join(gameSessionId);
        console.log(`[gameSocketHandlers] User ${socket.userId} joined game session room: ${gameSessionId}`);

        if (gameSession.status === 'in-progress' && (!gameSession.gameStateData || !gameSession.gameStateData.players)) {
             console.log(`[gameSocketHandlers] Game in-progress but gameStateData empty. Initializing...`);
             const participantsData = await User.find({ _id: { $in: gameSession.participants } }).select('_id firstName lastName profileImage');
             const participantObjects = gameSession.participants.map(pId => {
                 const userDoc = participantsData.find(pd => pd._id.toString() === pId.toString());
                 return {
                     userId: pId.toString(),
                     username: userDoc ? `${userDoc.firstName} ${userDoc.lastName || ''}`.trim() : 'Unknown Player',
                     avatar: userDoc ? getUserAvatar(userDoc) : null,
                     position: 1
                 };
             });

            let gameEngine;
            switch (gameSession.gameId) {
                case 'snake_ladder':
                    gameEngine = snakeLadderEngine;
                    break;
                case 'tic_tac_toe':
                    gameEngine = ticTacToeEngine;
                    break;
                default:
                    console.error(`[gameSocketHandlers] Game engine not found for game ID: ${gameSession.gameId}`);
                    socket.emit('gameError', 'Game engine not found for this game ID.');
                    return;
            }

            gameSession.gameStateData = gameEngine.getInitialGameState(participantObjects, gameSession.initiator.toString());
            gameSession.currentPlayer = gameSession.gameStateData.currentPlayer;
            await gameSession.save();
            console.log(`[gameSocketHandlers] Initial game state set for session ${gameSessionId}.`);
        }
    });

    socket.on('leaveGameSession', (gameSessionId) => {
        console.log(`[gameSocketHandlers] 'leaveGameSession' event received for session: ${gameSessionId}`);
        socket.leave(gameSessionId);
        console.log(`[gameSocketHandlers] User ${socket.userId} left game session room: ${gameSessionId}`);
    });

    socket.on('requestGameState', async (gameSessionId) => {
        console.log(`[gameSocketHandlers] 'requestGameState' event received for session: ${gameSessionId}`);
        if (!socket.userId) {
            console.warn(`[gameSocketHandlers] 'requestGameState' failed: Authentication required.`);
            socket.emit('gameError', 'Authentication required to request game state.');
            return;
        }
        const gameSession = await GameSession.findById(gameSessionId);
        if (!gameSession || !gameSession.participants.includes(socket.userId)) {
            console.warn(`[gameSocketHandlers] 'requestGameState' failed: Game session not found or unauthorized for state request.`);
            socket.emit('gameError', 'Game session not found or unauthorized for state request.');
            return;
        }

        let gameEngine;
        switch (gameSession.gameId) {
            case 'snake_ladder':
                gameEngine = snakeLadderEngine;
                break;
            case 'tic_tac_toe':
                gameEngine = ticTacToeEngine;
                break;
            default:
                console.error(`[gameSocketHandlers] Game engine not found for game ID: ${gameSession.gameId}`);
                socket.emit('gameError', 'Game engine not found for this game ID.');
                return;
        }

        const gameStateForClient = {
            ...gameSession.gameStateData,
            status: gameSession.status,
            winner: gameSession.winner?.toString(),
            message: gameEngine.getMessage(gameSession.gameStateData, socket.userId),
        };

        console.log(`[gameSocketHandlers] Emitting 'gameStateUpdate' to user ${socket.userId} for session ${gameSessionId}. Data:`, JSON.stringify(gameStateForClient));
        socket.emit('gameStateUpdate', gameStateForClient);
    });

    socket.on('startGame', async ({ gameSessionId }) => {
        console.log(`[gameSocketHandlers] 'startGame' event received for session: ${gameSessionId} from user ${socket.userId}.`);
        if (!socket.userId) {
            console.warn(`[gameSocketHandlers] 'startGame' failed: Authentication required.`);
            socket.emit('gameError', 'Authentication required to start game.');
            return;
        }

        const gameSession = await GameSession.findById(gameSessionId);
        if (!gameSession) {
            console.warn(`[gameSocketHandlers] 'startGame' failed: Game session not found.`);
            socket.emit('gameError', 'Game session not found.');
            return;
        }

        if (gameSession.initiator.toString() !== socket.userId) {
            console.warn(`[gameSocketHandlers] 'startGame' failed: User ${socket.userId} is not the initiator. Initiator is ${gameSession.initiator.toString()}.`);
            socket.emit('gameError', 'Only the game initiator can start the game.');
            return;
        }

        if (gameSession.status !== 'pending') {
            console.warn(`[gameSocketHandlers] 'startGame' failed: Game is not in a pending state. Current status: ${gameSession.status}.`);
            socket.emit('gameError', 'Game is not waiting to be started.');
            return;
        }

        const participantsData = await User.find({ _id: { $in: gameSession.participants } }).select('_id firstName lastName profileImage');
        const participantObjects = gameSession.participants.map(pId => {
             const userDoc = participantsData.find(pd => pd._id.toString() === pId.toString());
             return {
                 userId: pId.toString(),
                 username: userDoc ? `${userDoc.firstName} ${userDoc.lastName || ''}`.trim() : 'Unknown Player',
                 avatar: userDoc ? getUserAvatar(userDoc) : null,
             };
        });

        let gameEngine;
        switch (gameSession.gameId) {
            case 'snake_ladder':
                gameEngine = snakeLadderEngine;
                break;
            case 'tic_tac_toe':
                gameEngine = ticTacToeEngine;
                break;
            default:
                console.error(`[gameSocketHandlers] Game engine not found for game ID: ${gameSession.gameId}`);
                socket.emit('gameError', 'Game engine not found for this game ID.');
                return;
        }

        const initialGameState = gameEngine.getInitialGameState(participantObjects, gameSession.initiator.toString());
        
        gameSession.gameStateData = initialGameState;
        gameSession.status = 'in-progress';
        gameSession.currentPlayer = initialGameState.currentPlayer;
        await gameSession.save();

        console.log(`[gameSocketHandlers] Game session ${gameSessionId} started and status updated to 'in-progress'.`);

        const gameStateForClient = {
            ...initialGameState,
            status: gameSession.status,
            message: gameEngine.getMessage(initialGameState, socket.userId),
        };

        console.log(`[gameSocketHandlers] Broadcasting 'gameStateUpdate' to room ${gameSessionId} after game start. Data:`, JSON.stringify(gameStateForClient));
        io.to(gameSessionId).emit('gameStateUpdate', gameStateForClient);
    });

    socket.on('makeMove', async ({ gameSessionId, playerId, move }) => {
        console.log(`[gameSocketHandlers] 'makeMove' event received for session: ${gameSessionId}, player: ${playerId}, move:`, JSON.stringify(move));
        if (playerId !== socket.userId) {
            console.warn(`[gameSocketHandlers] Unauthorized move: Player ID mismatch for user ${socket.userId}.`);
            socket.emit('gameError', 'Unauthorized move: Player ID mismatch.');
            return;
        }

        const gameSession = await GameSession.findById(gameSessionId);
        if (!gameSession || gameSession.status !== 'in-progress' || gameSession.currentPlayer?.toString() !== playerId) {
            console.warn(`[gameSocketHandlers] Invalid move: Game not in progress or not player's turn for session ${gameSessionId}. Current status: ${gameSession?.status}, current player: ${gameSession?.currentPlayer}, requesting player: ${playerId}.`);
            socket.emit('gameError', 'Invalid move: Game not in progress or not your turn.');
            return;
        }

        let gameEngine;
        switch (gameSession.gameId) {
            case 'snake_ladder':
                gameEngine = snakeLadderEngine;
                break;
            case 'tic_tac_toe':
                gameEngine = ticTacToeEngine;
                break;
            default:
                console.error(`[gameSocketHandlers] Game engine not found for game ID: ${gameSession.gameId}`);
                socket.emit('gameError', 'Game engine not found for this game ID.');
            return;
        }

        try {
            console.log(`[gameSocketHandlers] Applying move using ${gameSession.gameId} engine.`);
            const updatedGameStateData = gameEngine.applyMove(gameSession.gameStateData, playerId, move);
            
            const winnerSymbolOrNull = gameEngine.checkWin(updatedGameStateData.board);
            let winnerId = null;
            if (winnerSymbolOrNull) {
                const winnerPlayer = updatedGameStateData.players.find(p => p.symbol === winnerSymbolOrNull);
                winnerId = winnerPlayer?.userId;
            }

            let newStatus = updatedGameStateData.status;
            if (winnerId) {
                newStatus = 'completed';
                console.log(`[gameSocketHandlers] Winner found: ${winnerId}. Setting status to 'completed'.`);
            } else if (gameEngine.isBoardFull && gameEngine.isBoardFull(updatedGameStateData.board) && !winnerId) {
                newStatus = 'draw';
                console.log(`[gameSocketHandlers] Board full, no winner. Setting status to 'draw'.`);
            }

            gameSession.gameStateData = updatedGameStateData;
            gameSession.status = newStatus;
            gameSession.winner = winnerId;
            gameSession.currentPlayer = updatedGameStateData.currentPlayer;

            await gameSession.save();
            console.log(`[gameSocketHandlers] Game session ${gameSessionId} updated and saved.`);

            const gameStateForClient = {
                ...gameSession.gameStateData,
                status: gameSession.status,
                winner: gameSession.winner?.toString(),
                message: gameEngine.getMessage(gameSession.gameStateData, socket.userId),
            };

            console.log(`[gameSocketHandlers] Broadcasting 'gameStateUpdate' to room ${gameSessionId} after move. Data:`, JSON.stringify(gameStateForClient));
            io.to(gameSessionId).emit('gameStateUpdate', gameStateForClient);

        } catch (error) {
            console.error(`[gameSocketHandlers] Error applying move for ${gameSession.gameId}: ${error.message}`);
            socket.emit('gameError', error.message || 'Error making move.');
        }
    });
};