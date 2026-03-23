import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001/chat' : 'https://reky-ai.onrender.com/chat';
        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: false,
        });
    }
    return socket;
};

export const connectSocket = (agentId: string) => {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
        s.on('connect', () => {
            s.emit('register', { agentId });
        });
    } else {
        s.emit('register', { agentId });
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket?.connected) {
        socket.disconnect();
    }
};
