const BOARD_SIZE = 100;

const BASE_SNAKES_LADDERS = {
    ladders: [
        { bottom: 3, top: 20 }, { bottom: 6, top: 14 }, { bottom: 11, top: 28 },
        { bottom: 15, top: 34 }, { bottom: 17, top: 74 }, { bottom: 22, top: 37 },
        { bottom: 38, top: 59 }, { bottom: 49, top: 67 }, { bottom: 57, top: 76 },
        { bottom: 61, top: 78 }, { bottom: 73, top: 86 }, { bottom: 81, top: 98 },
        { bottom: 88, top: 91 },
    ],
    snakes: [
        { head: 8, tail: 4 }, { head: 18, tail: 1 }, { head: 26, tail: 10 },
        { head: 39, tail: 5 }, { head: 51, tail: 6 }, { head: 54, tail: 36 },
        { head: 56, tail: 1 }, { head: 60, tail: 23 }, { head: 75, tail: 28 },
        { head: 83, tail: 45 }, { head: 85, tail: 59 }, { head: 90, tail: 48 },
        { head: 92, tail: 25 }, { head: 97, tail: 87 }, { head: 99, tail: 63 },
    ],
};

exports.initialize = (participants) => {
    const players = participants.map(p => ({
        userId: p.userId,
        position: 1,
        username: p.username,
        avatar: p.avatar,
    }));

    return {
        players,
        boardSize: BOARD_SIZE,
        snakes: BASE_SNAKES_LADDERS.snakes, // Use fixed snakes
        ladders: BASE_SNAKES_LADDERS.ladders, // Use fixed ladders
        currentPlayerIndex: 0,
        lastDiceRoll: 0,
        diceRollsThisTurn: 0,
        moveHistory: [],
    };
};

exports.rollDice = () => Math.floor(Math.random() * 6) + 1;

exports.calculateNextPosition = (currentPosition, roll) => {
    let newPosition = currentPosition + roll;

    if (newPosition > BOARD_SIZE) {
        return currentPosition;
    }
    if (newPosition === BOARD_SIZE) {
        return BOARD_SIZE;
    }

    // Check for fixed ladders
    const ladder = BASE_SNAKES_LADDERS.ladders.find(l => l.bottom === newPosition);
    if (ladder) {
        return ladder.top;
    }

    // Check for fixed snakes
    const snake = BASE_SNAKES_LADDERS.snakes.find(s => s.head === newPosition);
    if (snake) {
        return snake.tail;
    }

    return newPosition;
};

exports.applyMove = (gameState, playerId, move) => {
    const { players, snakes, ladders, currentPlayerIndex, boardSize } = gameState;
    const currentPlayer = players[currentPlayerIndex];

    if (currentPlayer.userId !== playerId) {
        throw new Error('Not your turn.');
    }
    if (move.type !== 'rollDice') {
        throw new Error('Invalid move type for Snake and Ladder.');
    }

    const diceRoll = exports.rollDice();
    const oldPosition = currentPlayer.position; // Store old position for animation
    const newPosition = exports.calculateNextPosition(oldPosition, diceRoll);

    currentPlayer.position = newPosition;

    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;

    return {
        ...gameState,
        players: players.map(p => (p.userId === playerId ? currentPlayer : p)),
        currentPlayerIndex: nextPlayerIndex,
        lastDiceRoll: diceRoll,
        message: `${currentPlayer.username || 'Player'} rolled a ${diceRoll}. Moved to ${newPosition}.`,
        // NEW: Add old position to state for frontend animation
        animationData: {
            playerId: currentPlayer.userId,
            fromPosition: oldPosition,
            toPosition: newPosition,
            diceRoll: diceRoll,
        }
    };
};

exports.checkWin = (gameState) => {
    const winningPlayer = gameState.players.find(p => p.position === BOARD_SIZE);
    return winningPlayer ? winningPlayer.userId : null;
};

exports.getMessage = (gameState, currentUserId) => {
    if (!gameState || !gameState.players || gameState.players.length === 0) {
        return 'Initializing game...';
    }

    const unacceptedPlayers = gameState.players.filter(p => !gameState.acceptedBy?.includes(p.userId));

    if (gameState.status === 'pending' || gameState.status === 'waiting') {
        if (unacceptedPlayers.length > 0) {
             return `Waiting for ${unacceptedPlayers.map(p => p.username || 'player').join(', ')} to accept the invite...`;
        }
        return `Waiting for game to start...`;
    }
    if (gameState.status === 'completed' || gameState.status === 'gameOver') {
        return gameState.winner ? `${gameState.players.find(p => p.userId === gameState.winner)?.username || 'A player'} won!` : 'Game Over!';
    }
    if (gameState.currentPlayer === currentUserId) {
        return `It's your turn! Roll the dice. (Last roll: ${gameState.lastDiceRoll})`;
    } else {
        const opponent = gameState.players.find(p => p.userId === gameState.currentPlayer);
        return `${opponent?.username || 'Opponent'}'s turn. (Last roll: ${gameState.lastDiceRoll})`;
    }
};

exports.getPendingGameState = (participantsData, initiatorId) => {
    const initialState = exports.initialize(participantsData);
    initialState.status = 'waiting';
    initialState.message = `Waiting for players to accept the invite...`;
    initialState.currentPlayer = initiatorId;
    initialState.initiatorId = initiatorId;
    initialState.acceptedBy = [initiatorId];
    return initialState;
};

exports.getInitialGameState = (participantsData, initiatorId) => {
    const initialState = exports.initialize(participantsData);
    const initiatorPlayer = initialState.players.find(p => p.userId === initiatorId);
    if (initiatorPlayer) {
        initialState.currentPlayer = initiatorPlayer.userId;
        initialState.message = `Game started! ${initiatorPlayer.username || 'You'} roll first.`;
    } else {
        initialState.currentPlayer = participantsData[0].userId;
        initialState.message = 'Game started! Roll the dice.';
    }
    initialState.status = 'playing';
    initialState.initiatorId = initiatorId;
    return initialState;
};
