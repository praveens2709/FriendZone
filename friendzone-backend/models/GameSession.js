// models/GameSession.js
const mongoose = require('mongoose');

const GameSessionSchema = new mongoose.Schema({
    gameId: { type: String, required: true }, // e.g., 'chess', 'tictactoe', 'snake_ladder'
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'declined', 'cancelled'], default: 'pending' },
    initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    acceptedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    gameStartTime: { type: Date },
    gameEndTime: { type: Date },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // NEW: Flexible field for game-specific state
    gameStateData: {
        type: mongoose.Schema.Types.Mixed,
        default: {} // Default to an empty object
    },
    // NEW: Track current player in the game itself (User ID)
    currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('GameSession', GameSessionSchema);