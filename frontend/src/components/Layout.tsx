import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Search, Plus, MessageSquare, ClipboardList, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../lib/socket';
import api from '../lib/api';

interface LayoutProps {
    children: ReactNode;
}

const navItems = [
    { name: 'Buscar', icon: Search, path: '/search' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Publicar', icon: Plus, path: '/publish' },
    { name: 'Req.', icon: ClipboardList, path: '/requirements' },
    { name: 'Perfil', icon: User, path: '/profile' },
];

const playNotificationSound = (type: 'property' | 'requirement') => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'requirement') {
            // Requirement sound: attention grabbing double beep lower pitch
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        } else {
            // Property sound: gentle upward ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        }
    } catch (e) {
        console.error('Audio play failed', e);
    }
};

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();
    const { agent } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    // Global Chat Listening
    useEffect(() => {
        if (!agent?.id) return;

        const syncUnread = async () => {
            try {
                const res = await api.get('/chat/conversations');
                const total = res.data.reduce((acc: number, c: any) => acc + (c.unread || 0), 0);
                setUnreadCount(total);
            } catch (err) {
                // Ignore sync errors
            }
        };

        syncUnread();
        const intv = setInterval(syncUnread, 15000);

        const socket = connectSocket(agent.id);

        const handleIncoming = (msg: any) => {
            // If message is not from me
            if (msg.senderId !== agent.id) {
                const contentText = msg.content?.toLowerCase() || '';
                const isReq = contentText.includes('requier') || contentText.includes('pedido') || contentText.includes('necesit');

                playNotificationSound(isReq ? 'requirement' : 'property');

                // Immediately refresh count from server to be accurate
                setTimeout(syncUnread, 500);
            }
        };

        socket.on('new_conversation_message', handleIncoming);
        socket.on('new_message', handleIncoming); // Fallback for some flows

        return () => {
            clearInterval(intv);
            socket.off('new_conversation_message', handleIncoming);
            socket.off('new_message', handleIncoming);
        };
    }, [agent?.id]);

    // Resync when leaving chat
    useEffect(() => {
        if (location.pathname !== '/chat' && agent?.id) {
            api.get('/chat/conversations').then(res => {
                const total = res.data.reduce((acc: number, c: any) => acc + (c.unread || 0), 0);
                setUnreadCount(total);
            }).catch(() => { });
        }
    }, [location.pathname, agent?.id]);

    return (
        <div className="min-h-screen bg-bg-dark flex flex-col">

            {/* Main Content — padded bottom for navbar */}
            <main className="flex-1 pt-4 pb-28 overflow-hidden">
                <div className="h-full">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
                <div
                    className="flex items-center justify-around px-2 py-2 rounded-2xl border border-glass-border backdrop-blur-2xl"
                    style={{
                        background: 'rgba(20, 20, 26, 0.85)',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
                    }}
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isPublish = item.path === '/publish';
                        const isChat = item.path === '/chat';

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center gap-0.5 group"
                                style={{ minWidth: 56, padding: '4px 0' }}
                            >
                                {/* Publish button gets special floating treatment */}
                                {isPublish ? (
                                    <div className="w-12 h-12 -mt-6 rounded-2xl bg-accent-orange flex items-center justify-center shadow-lg shadow-accent-orange/40 border-4 border-bg-dark group-hover:scale-110 transition-transform duration-200">
                                        <Icon size={22} className="text-white" />
                                    </div>
                                ) : (
                                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${isActive ? 'bg-accent-orange/15' : 'group-hover:bg-white/5'}`}>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-indicator"
                                                className="absolute inset-0 rounded-xl bg-accent-orange/15"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <Icon
                                            size={20}
                                            className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-accent-orange' : 'text-gray-500 group-hover:text-gray-300'}`}
                                        />

                                        {/* Unread Badge Overlay */}
                                        {isChat && unreadCount > 0 && (
                                            <AnimatePresence>
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-bg-dark z-20"
                                                >
                                                    <span className="text-[10px] font-bold text-white leading-none">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                </motion.div>
                                            </AnimatePresence>
                                        )}
                                    </div>
                                )}
                                {!isPublish && (
                                    <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-accent-orange' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
