import { io } from 'socket.io-client';

let socket = null;

// Call this after login — creates socket with JWT
export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    auth: { token },          // ← sent to server's io.use() middleware
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('🔌 Socket connected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};