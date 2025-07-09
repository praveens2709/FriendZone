// services/socketService.ts
import { API_BASE_URL } from '@/constants/const';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket && socket.connected) {
    console.log('Socket already connected.');
    socket.emit('setUserId', userId); // Re-emit userId in case of reconnection or initial load
    return socket;
  }

  const socketUrl = API_BASE_URL.replace('/api', ''); // Your socket.io server might be at the root URL
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    // auth: { token: accessToken } // If you implement token-based auth for socket connection
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('setUserId', userId);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // if (reason === 'io server disconnect') {
    //   // the disconnection was initiated by the server, you need to reconnect manually
    //   socket?.connect();
    // }
    // else the socket will automatically try to reconnect
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket reconnect attempt: ${attemptNumber}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnect error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnect failed permanently.');
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected and cleared.');
  }
};