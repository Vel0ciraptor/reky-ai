import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io('https://reky-ai.onrender.com/chat', {
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
