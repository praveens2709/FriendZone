export const getInitialGameState = (participants, initiatorId) => {
    console.log('[ticTacToeEngine] Generating initial game state for active game.');
    const playerX = participants.find(p => p.userId === initiatorId);
    const playerO = participants.find(p => p.userId !== initiatorId);

    if (!playerX || !playerO) {
        console.error('[ticTacToeEngine] Error: Not enough players to start Tic-Tac-Toe.');
        throw new Error("Not enough players to start Tic-Tac-Toe.");
    }

    const gameState = {
        board: Array(9).fill(null),
        players: [
            { userId: playerX.userId, username: playerX.username, avatar: playerX.avatar, symbol: 'X' },
            { userId: playerO.userId, username: playerO.username, avatar: playerO.avatar, symbol: 'O' }
        ],
        currentPlayer: playerX.userId,
        status: 'playing',
        winner: null,
        message: `${playerX.username}'s turn (X)`,
        lastMove: null,
        initiatorId: initiatorId,
    };
    console.log('[ticTacToeEngine] Generated initial game state:', JSON.stringify(gameState));
    return gameState;
};

export const getPendingGameState = (participants, initiatorId) => {
    console.log('[ticTacToeEngine] Generating pending game state.');
    const initiator = participants.find(p => p.userId === initiatorId);
    const gameState = {
        board: Array(9).fill(null),
        players: participants.map(p => ({ userId: p.userId, username: p.username, avatar: p.avatar, symbol: null })),
        currentPlayer: null,
        status: 'pending',
        winner: null,
        message: `${initiator?.username || 'Someone'} is inviting you to Tic-Tac-Toe!`,
        lastMove: null,
        initiatorId: initiatorId,
    };
    console.log('[ticTacToeEngine] Generated pending game state:', JSON.stringify(gameState));
    return gameState;
};

export const checkWin = (board) => {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let i = 0; i < winPatterns.length; i++) {
        const [a, b, c] = winPatterns[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};

export const isBoardFull = (board) => {
    return board.every(cell => cell !== null);
};

export const applyMove = (gameState, playerId, move) => {
    console.log(`[ticTacToeEngine] Applying move for player ${playerId} at position ${move.position}.`);
    if (move.type !== 'placeSymbol' || typeof move.position !== 'number' || move.position < 0 || move.position > 8) {
        console.error('[ticTacToeEngine] Invalid move: Missing or invalid position.');
        throw new Error("Invalid Tic-Tac-Toe move: missing or invalid position.");
    }

    const { board, players, currentPlayer, status } = gameState;
    const { position } = move;

    if (status !== 'playing') {
        console.warn('[ticTacToeEngine] Invalid move: Game is not in progress.');
        throw new Error("Game is not in progress.");
    }
    if (currentPlayer !== playerId) {
        console.warn('[ticTacToeEngine] Invalid move: It\'s not your turn.');
        throw new Error("It's not your turn.");
    }
    if (board[position] !== null) {
        console.warn('[ticTacToeEngine] Invalid move: Cell already taken.');
        throw new Error("Cell already taken.");
    }

    const playerMakingMove = players.find(p => p.userId === playerId);
    if (!playerMakingMove) {
        console.error('[ticTacToeEngine] Invalid move: Player not found.');
        throw new Error("Player not found in game state.");
    }

    const newBoard = [...board];
    newBoard[position] = playerMakingMove.symbol;

    const winnerSymbol = checkWin(newBoard);
    const newStatus = winnerSymbol ? 'completed' : (isBoardFull(newBoard) ? 'draw' : 'playing');

    let nextPlayer = currentPlayer;
    let message = '';
    let winnerId = null;

    if (newStatus === 'completed') {
        const winnerPlayer = players.find(p => p.symbol === winnerSymbol);
        winnerId = winnerPlayer?.userId;
        message = `${winnerPlayer?.username || winnerSymbol} wins!`;
        console.log(`[ticTacToeEngine] Game finished, winner is ${winnerPlayer?.username}.`);
    } else if (newStatus === 'draw') {
        message = "It's a draw!";
        console.log('[ticTacToeEngine] Game is a draw.');
    } else {
        const nextPlayerObj = players.find(p => p.userId !== currentPlayer);
        nextPlayer = nextPlayerObj?.userId;
        message = `${nextPlayerObj?.username || nextPlayer}'s turn (${nextPlayerObj?.symbol})`;
        console.log(`[ticTacToeEngine] Move successful, next player is ${nextPlayer}.`);
    }

    const updatedState = {
        ...gameState,
        board: newBoard,
        currentPlayer: nextPlayer,
        status: newStatus,
        winner: winnerId,
        message: message,
        lastMove: { playerId, position, symbol: playerMakingMove.symbol },
    };

    console.log('[ticTacToeEngine] Updated game state:', JSON.stringify(updatedState));
    return updatedState;
};

export const getMessage = (gameState, currentUserId) => {
    const { status, winner, currentPlayer, players, initiatorId } = gameState;

    if (status === 'completed') {
        const winnerPlayer = players.find(p => p.userId === winner);
        return `${winnerPlayer?.username || 'A player'} won!`;
    } else if (status === 'draw') {
        return "It's a draw!";
    } else if (status === 'playing') {
        const currentPlayerObj = players.find(p => p.userId === currentPlayer);
        if (currentPlayer === currentUserId) {
            return `Your turn (${currentPlayerObj?.symbol})`;
        } else {
            return `${currentPlayerObj?.username || 'Opponent'}'s turn (${currentPlayerObj?.symbol})`;
        }
    } else if (status === 'pending') {
        if (initiatorId === currentUserId) {
            return "Press 'Play' to start the game!";
        } else {
            const initiator = players.find(p => p.userId === initiatorId);
            return `Waiting for ${initiator?.username || 'the initiator'} to start the game.`;
        }
    }
    return "Game is in an unknown state.";
};
