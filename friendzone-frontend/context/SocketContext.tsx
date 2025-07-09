// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, getSocket, disconnectSocket } from '@/services/socketService';
import { useAuth } from './AuthContext'; // To get the current user's ID

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, authLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const isConnectingRef = useRef(false); // To prevent multiple connect calls

  const initializeSocket = useCallback(() => {
    if (!isAuthenticated || !user || !user._id || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    console.log('Attempting to initialize socket for user:', user._id);
    const newSocket = connectSocket(user._id);
    setSocket(newSocket);
    isConnectingRef.current = false;
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?._id) {
      const existingSocket = getSocket();
      if (!existingSocket || !existingSocket.connected || !existingSocket.hasListeners('setUserId')) {
         // Re-initialize if socket is not connected or if setUserId listener is missing (e.g., after full app restart)
        initializeSocket();
      } else {
        // If socket already exists and is connected, ensure userId is set
        existingSocket.emit('setUserId', user._id);
        setSocket(existingSocket);
      }
    } else if (!authLoading && !isAuthenticated) {
      // If user logs out, disconnect the socket
      disconnectSocket();
      setSocket(null);
    }

    // Cleanup on component unmount (or when user logs out)
    return () => {
      // Socket should ideally persist across screens within the authenticated session
      // Disconnect only on full app close or explicit logout
      // For now, let's keep it connected as long as AuthProvider is mounted and user is authenticated
    };
  }, [isAuthenticated, authLoading, user?._id, initializeSocket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};