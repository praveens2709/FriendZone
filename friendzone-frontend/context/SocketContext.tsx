// context/SocketContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, getSocket, disconnectSocket } from '@/services/socketService';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, authLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const isConnectingRef = useRef(false);

  const initializeSocket = useCallback(() => {
    if (!isAuthenticated || !user || !user._id || isConnectingRef.current) return;

    isConnectingRef.current = true;
    console.log('Initializing socket for user:', user._id);
    const newSocket = connectSocket(user._id);
    setSocket(newSocket);
    isConnectingRef.current = false;
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?._id) {
      const existingSocket = getSocket();
      if (!existingSocket || !existingSocket.connected || !existingSocket.hasListeners('setUserId')) {
        initializeSocket();
      } else {
        existingSocket.emit('setUserId', user._id);
        setSocket(existingSocket);
      }
    } else if (!authLoading && !isAuthenticated) {
      disconnectSocket();
      setSocket(null);
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, authLoading, user?._id, initializeSocket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
