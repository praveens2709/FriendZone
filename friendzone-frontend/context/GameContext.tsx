import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import GameService from '@/services/GameService';

interface GameInvite {
  gameSessionId: string;
  gameId: string;
  gameName: string;
  initiator: {
    id: string;
    username: string;
    avatar: string | null;
  };
  timestamp: string;
}

interface GameContextType {
  pendingInvites: GameInvite[];
  acceptGameInvite: (gameSessionId: string) => Promise<void>;
  declineGameInvite: (gameSessionId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);

  useEffect(() => {
    console.log('[GameContext] useEffect for socket listeners started.');
    if (!socket || !accessToken || !user) {
        console.log('[GameContext] Socket, accessToken, or user not available for listeners. Returning.');
        return;
    }
    console.log('[GameContext] Socket, accessToken, and user available. Setting up socket listeners.');

    const handleGameInvite = (invite: GameInvite) => {
      console.log('[GameContext] Received gameInvite event:', invite);
      setPendingInvites((prev) => {
        const isDuplicate = prev.some(inv => inv.gameSessionId === invite.gameSessionId);
        if (isDuplicate) {
          console.log('[GameContext] Duplicate invite received, ignoring.');
          return prev;
        }
        console.log('[GameContext] Adding new invite to pendingInvites.');
        return [...prev, invite];
      });
      console.log('info', `New Game Invite from ${invite.initiator.username} for ${invite.gameName}. Check notifications!`);
    };

    const handleGameInviteAccepted = (data: any) => {
        console.log('[GameContext] Received gameInviteAccepted:', data);
        setPendingInvites((prev) => {
            const newInvites = prev.filter(inv => inv.gameSessionId !== data.gameSessionId);
            console.log(`[GameContext] Removed accepted invite ${data.gameSessionId} from pendingInvites.`);
            return newInvites;
        });
    };

    const handleGameInviteDeclined = (data: any) => {
        console.log('[GameContext] Received gameInviteDeclined:', data);
        setPendingInvites((prev) => {
            const newInvites = prev.filter(inv => inv.gameSessionId !== data.gameSessionId);
            console.log(`[GameContext] Removed declined invite ${data.gameSessionId} from pendingInvites.`);
            return newInvites;
        });
    };

    const handleGameSessionStarted = (data: any) => {
        console.log('[GameContext] Received gameSessionStarted event:', data);
        console.log('success', `Game ${data.gameId} is starting!`);
        setPendingInvites((prev) => {
            const newInvites = prev.filter(inv => inv.gameSessionId !== data.gameSessionId);
            console.log(`[GameContext] Removed started game session ${data.gameSessionId} from pendingInvites.`);
            return newInvites;
        });
        
        console.log(`[GameContext] Attempting to navigate to game session: /games/[id] with ID: ${data.gameSessionId}, Game ID: ${data.gameId}`);
        router.push({
            pathname: '/games/[id]',
            params: { id: data.gameSessionId, gameId: data.gameId }
        });
        console.log('[GameContext] Navigation instruction sent.');
    };

    socket.on('gameInvite', handleGameInvite);
    socket.on('gameInviteAccepted', handleGameInviteAccepted);
    socket.on('gameInviteDeclined', handleGameInviteDeclined);
    socket.on('gameSessionStarted', handleGameSessionStarted);
    console.log('[GameContext] All game-related socket listeners are set.');

    return () => {
      console.log('[GameContext] Cleaning up socket listeners...');
      socket.off('gameInvite', handleGameInvite);
      socket.off('gameInviteAccepted', handleGameInviteAccepted);
      socket.off('gameInviteDeclined', handleGameInviteDeclined);
      socket.off('gameSessionStarted', handleGameSessionStarted);
      console.log('[GameContext] Cleared socket listeners.');
    };
  }, [socket, accessToken, router, user]);

  const acceptGameInvite = useCallback(async (gameSessionId: string) => {
    console.log(`[GameContext] acceptGameInvite (manual) called for session: ${gameSessionId}`);
    if (!accessToken) {
        console.error('[GameContext] acceptGameInvite failed: No access token available.');
        throw new Error("No access token available.");
    }
    await GameService.acceptGameInvite(accessToken, gameSessionId);
    console.log(`[GameContext] GameService.acceptGameInvite called for ${gameSessionId}.`);
    if (socket && user) {
        console.log(`[GameContext] User ${user._id} attempting to join game session room ${gameSessionId} via manual accept.`);
        socket.emit('joinGameSession', gameSessionId);
    } else {
        console.warn('[GameContext] Socket or user not available to join game session room via manual accept.');
    }
  }, [accessToken, socket, user]);

  const declineGameInvite = useCallback(async (gameSessionId: string) => {
    console.log(`[GameContext] declineGameInvite (manual) called for session: ${gameSessionId}`);
    if (!accessToken) {
        console.error('[GameContext] declineGameInvite failed: No access token available.');
        throw new Error("No access token available.");
    }
    await GameService.declineGameInvite(accessToken, gameSessionId);
    console.log(`[GameContext] GameService.declineGameInvite called for ${gameSessionId}.`);
  }, [accessToken]);

  const contextValue: GameContextType = {
    pendingInvites,
    acceptGameInvite,
    declineGameInvite,
  };

  console.log('[GameContext] Rendering GameProvider.');
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};