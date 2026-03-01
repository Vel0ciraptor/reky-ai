import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wallet, Lock, Shield, Search, Loader2, ArrowLeft, X, Phone, Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';

interface Conversation {
    partnerId: string;
    partnerName: string;
    partnerAvatar: string | null;
    partnerRole: string;
    lastMessage: string;
    lastMessageTime: string;
    unread: number;
}

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string; lastName: string; avatarUrl?: string | null };
}

const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const dayMs = 86400000;
    if (diff < dayMs) return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    if (diff < 2 * dayMs) return 'Ayer';
    if (diff < 7 * dayMs) return d.toLocaleDateString('es-BO', { weekday: 'short' });
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
};

const formatMsgTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const getRoomId = (a: string, b: string) => [a, b].sort().join('_');

const ChatPage = () => {
    const { agent, refreshAgent } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        if (!agent?.id) return [];
        try {
            const cached = localStorage.getItem(`chat_history_${agent.id}`);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.error(e);
        }
        return [];
    });

    // Sync conversations list to local storage so optimistic empty chats are preserved
    useEffect(() => {
        if (agent?.id && conversations.length > 0) {
            localStorage.setItem(`chat_history_${agent.id}`, JSON.stringify(conversations));
        }
    }, [conversations, agent?.id]);

    const [selectedPartner, setSelectedPartner] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [canShareContact, setCanShareContact] = useState(false);
    const [contactInfo, setContactInfo] = useState<{ phone: string; email: string } | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [chatError, setChatError] = useState('');
    const walletBalance = Number(agent?.wallet?.balance ?? 0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Calculate messages needed for contact sharing
    const myId = agent?.id || '';
    const myMsgCount = messages.filter(m => m.senderId === myId).length;
    const theirMsgCount = messages.filter(m => m.senderId !== myId).length;
    const messagesToContact = Math.max(0, 5 - Math.max(myMsgCount, theirMsgCount));

    // ── Socket Setup ─────────────────────────────────────────────
    useEffect(() => {
        if (!agent?.id) return;
        const socket = connectSocket(agent.id);

        socket.on('online_users', (users: string[]) => setOnlineUsers(users));
        socket.on('user_online', ({ agentId }: { agentId: string }) => {
            setOnlineUsers(prev => [...new Set([...prev, agentId])]);
        });
        socket.on('user_offline', ({ agentId }: { agentId: string }) => {
            setOnlineUsers(prev => prev.filter(id => id !== agentId));
        });

        socket.on('new_message', (msg: Message) => {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        socket.on('new_conversation_message', () => {
            // Refresh conversations list on new messages
            fetchConversations();
        });

        socket.on('typing_indicator', ({ typing }: { agentId: string; typing: boolean }) => {
            setPartnerTyping(typing);
        });

        socket.on('chat_error', ({ message }: { message: string }) => {
            setChatError(message);
            setTimeout(() => setChatError(''), 4000);
        });

        return () => {
            socket.off('online_users');
            socket.off('user_online');
            socket.off('user_offline');
            socket.off('new_message');
            socket.off('new_conversation_message');
            socket.off('typing_indicator');
            socket.off('chat_error');
        };
    }, [agent?.id]);

    // ── Fetch Conversations ──────────────────────────────────────
    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get(`/chat/conversations?t=${Date.now()}`);
            setConversations(prev => {
                const fetched: Conversation[] = res.data;
                const merged = [...fetched];

                // Retain any conversations we generated locally that aren't in the DB yet
                // or where our local optimistic update is NEWER than the DB's last message
                for (const p of prev) {
                    const existingIdx = merged.findIndex(m => m.partnerId === p.partnerId);
                    if (existingIdx === -1) {
                        // Completely missing from DB (empty chat we just started)
                        merged.push(p);
                    } else {
                        // Exists in DB, check if local is newer (race condition mitigation)
                        const localTime = new Date(p.lastMessageTime).getTime();
                        const dbTime = new Date(merged[existingIdx].lastMessageTime).getTime();
                        if (localTime > dbTime) {
                            merged[existingIdx] = p;
                        }
                    }
                }

                // Re-sort by newest
                return merged.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
            });
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // ── Select Conversation & Fetch Messages ─────────────────────
    const openConversation = useCallback(async (convId: string, prefillConv?: Conversation) => {
        setMsgsLoading(true);
        setMessages([]);
        setCanShareContact(false);
        setContactInfo(null);
        if (prefillConv) setSelectedPartner(prefillConv);

        try {
            const res = await api.get(`/chat/conversation/${convId}`);
            setMessages(res.data.messages);
            setCanShareContact(res.data.canShareContact);
            if (res.data.contactInfo) setContactInfo(res.data.contactInfo);

            // If we came from the URL and didn't have a prefilled list conversation, create one from partnerInfo
            if (!prefillConv && res.data.partnerInfo) {
                const p = res.data.partnerInfo;
                const newConv = {
                    partnerId: p.id,
                    partnerName: `${p.name} ${p.lastName}`,
                    partnerAvatar: p.avatarUrl,
                    partnerRole: p.role,
                    lastMessage: '...',
                    lastMessageTime: new Date().toISOString(),
                    unread: 0
                };
                setSelectedPartner(newConv);

                // Add it locally so it shows if user hits the back arrow even before sending a message
                setConversations(prev => {
                    if (prev.some(c => c.partnerId === p.id)) return prev;
                    return [newConv, ...prev];
                });
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setMsgsLoading(false);
        }

        // Join WebSocket room
        const roomId = getRoomId(myId, convId);
        getSocket().emit('join_room', { roomId });
    }, [myId]);

    // Handle initial URL params
    const autoOpenAttempted = useRef(false);
    useEffect(() => {
        const agentParam = searchParams.get('agent');
        if (agentParam && agent?.id && !autoOpenAttempted.current && !loading) {
            autoOpenAttempted.current = true;
            const existing = conversations.find(c => c.partnerId === agentParam);
            openConversation(agentParam, existing);
            // Optionally clear the query string parameter to maintain history cleaner:
            // navigate('/chat', { replace: true });
        }
    }, [searchParams, agent, loading, conversations, openConversation]);

    // ── Auto-scroll ──────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedPartner]);

    // ── Send Message ─────────────────────────────────────────────
    const sendMessage = async () => {
        if (!newMessage.trim() || sending || walletBalance <= 0 || !selectedPartner) return;
        setSending(true);
        setChatError('');

        const roomId = getRoomId(myId, selectedPartner.partnerId);
        const sentContent = newMessage.trim();

        getSocket().emit('send_message', {
            senderId: myId,
            receiverId: selectedPartner.partnerId,
            content: sentContent,
            roomId,
        });

        // Optimistic update for the inbox tray
        setConversations(prev => {
            const existing = prev.find(c => c.partnerId === selectedPartner.partnerId);
            const nowTime = new Date().toISOString();
            if (existing) {
                return [
                    { ...existing, lastMessage: sentContent, lastMessageTime: nowTime },
                    ...prev.filter(c => c.partnerId !== selectedPartner.partnerId)
                ];
            } else {
                return [
                    { ...selectedPartner, lastMessage: sentContent, lastMessageTime: nowTime },
                    ...prev
                ];
            }
        });

        setNewMessage('');
        setSending(false);

        // Refresh wallet balance
        setTimeout(() => refreshAgent(), 500);
    };

    // ── Typing indicator ─────────────────────────────────────────
    const handleTyping = () => {
        if (!selectedPartner) return;
        const roomId = getRoomId(myId, selectedPartner.partnerId);
        getSocket().emit('typing', { roomId, agentId: myId, typing: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            getSocket().emit('typing', { roomId, agentId: myId, typing: false });
        }, 2000);
    };

    const filteredConvs = conversations.filter(c =>
        c.partnerName.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQ.toLowerCase())
    );

    const isPartnerOnline = (partnerId: string) => onlineUsers.includes(partnerId);

    // ── CHAT VIEW ────────────────────────────────────────────────
    const renderChatView = () => (
        <motion.div
            key="chat"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-0 flex flex-col bg-bg-dark z-10"
        >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3 border-b border-glass-border bg-bg-card/90 backdrop-blur-xl">
                <button
                    onClick={() => { fetchConversations(); setSelectedPartner(null); navigate('/chat', { replace: true }); }}
                    className="text-gray-400 hover:text-white transition-colors p-1 -ml-1"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="relative flex-shrink-0">
                    {selectedPartner!.partnerAvatar ? (
                        <img src={selectedPartner!.partnerAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                        <div className="w-9 h-9 bg-accent-orange/20 rounded-full flex items-center justify-center text-accent-orange font-bold text-sm">
                            {getInitials(selectedPartner!.partnerName)}
                        </div>
                    )}
                    {isPartnerOnline(selectedPartner!.partnerId) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-bg-dark" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedPartner!.partnerName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        {partnerTyping ? (
                            <span className="text-accent-orange animate-pulse">Escribiendo...</span>
                        ) : (
                            <>
                                <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline(selectedPartner!.partnerId) ? 'bg-green-400' : 'bg-gray-600'}`} />
                                {isPartnerOnline(selectedPartner!.partnerId) ? 'En línea' : selectedPartner!.partnerRole}
                            </>
                        )}
                    </p>
                </div>
                {/* Contact guard */}
                <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border flex-shrink-0 ${canShareContact ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-glass-border text-gray-600'}`}>
                    {canShareContact ? <><Shield size={11} /> Contacto</> : <><Lock size={11} /> {messagesToContact} msg</>}
                </div>
            </div>

            {/* Contact info banner */}
            <AnimatePresence>
                {canShareContact && contactInfo && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="flex items-center justify-center gap-4 bg-green-500/10 border-b border-green-500/20 px-4 py-2">
                            <div className="flex items-center gap-1.5 text-xs text-green-400">
                                <Phone size={11} /> {contactInfo.phone}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-green-400">
                                <Mail size={11} /> {contactInfo.email}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {msgsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-accent-orange" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-2">
                        <MessageCircle size={32} className="opacity-30" />
                        <p className="text-sm">Inicia la conversación</p>
                        <p className="text-xs text-gray-700">Cada mensaje cuesta 1 Bs</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.senderId === myId;
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${isMe
                                    ? 'bg-accent-orange text-white rounded-br-sm'
                                    : 'bg-white/8 border border-glass-border rounded-bl-sm'
                                    }`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-600'}`}>
                                        {formatMsgTime(msg.createdAt)}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-glass-border px-3 py-3 bg-bg-card/90 backdrop-blur-xl">
                <AnimatePresence>
                    {chatError && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-lg mb-2 leading-relaxed">
                            <Shield size={14} className="mt-0.5 flex-shrink-0" /> {chatError}
                        </motion.div>
                    )}
                </AnimatePresence>
                {walletBalance <= 0 && !chatError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-lg mb-2">
                        <Wallet size={13} /> Saldo agotado. Recarga tu wallet.
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <input
                        value={newMessage}
                        onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder={walletBalance > 0 ? 'Escribe un mensaje...' : 'Recarga tu wallet para continuar'}
                        disabled={walletBalance <= 0}
                        className="flex-1 bg-white/5 border border-glass-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent-orange transition-all disabled:opacity-50"
                    />
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Wallet size={11} className="text-accent-orange" />
                        <span className="text-accent-orange">1Bs</span>
                    </div>
                    <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending || walletBalance <= 0}
                        className="w-11 h-11 rounded-xl bg-accent-orange flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-accent-orange/20"
                    >
                        {sending ? <Loader2 size={17} className="animate-spin text-white" /> : <Send size={17} className="text-white" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );

    // ── CONVERSATION LIST ────────────────────────────────────────
    const renderConvList = () => (
        <motion.div
            key="list"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-0 flex flex-col"
        >
            {/* Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-glass-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold">Mensajes</h2>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-glass-border bg-white/5">
                        <Wallet size={13} className="text-accent-orange" />
                        <span className="text-sm font-bold text-accent-orange">{walletBalance} Bs</span>
                    </div>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        placeholder="Buscar conversación..."
                        className="w-full bg-white/5 border border-glass-border pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange transition-all"
                    />
                    {searchQ && (
                        <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={24} className="animate-spin text-accent-orange" />
                    </div>
                ) : filteredConvs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm gap-2">
                        <MessageCircle size={28} className="opacity-30" />
                        {conversations.length === 0
                            ? 'Aún no tienes conversaciones'
                            : 'No se encontraron resultados'}
                    </div>
                ) : (
                    filteredConvs.map(conv => (
                        <motion.div
                            key={conv.partnerId}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openConversation(conv.partnerId, conv)}
                            className="flex items-center gap-3 px-4 py-3.5 border-b border-glass-border cursor-pointer hover:bg-white/4 active:bg-white/8 transition-colors"
                        >
                            <div className="relative flex-shrink-0">
                                {conv.partnerAvatar ? (
                                    <img src={conv.partnerAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                    <div className="w-12 h-12 bg-accent-orange/20 rounded-full flex items-center justify-center text-accent-orange font-bold">
                                        {getInitials(conv.partnerName)}
                                    </div>
                                )}
                                {isPartnerOnline(conv.partnerId) && (
                                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-bg-dark" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="font-semibold text-sm truncate">{conv.partnerName}</p>
                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                        {formatTime(conv.lastMessageTime)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                            </div>
                            {conv.unread > 0 && (
                                <div className="w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-white">{conv.unread}</span>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Info tip */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-glass-border">
                <p className="text-xs text-gray-600 text-center">Cada mensaje enviado cuesta 1 Bs de tu wallet</p>
            </div>
        </motion.div>
    );

    return (
        <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
            <AnimatePresence mode="wait" initial={false}>
                {selectedPartner ? renderChatView() : renderConvList()}
            </AnimatePresence>
        </div>
    );
};

export default ChatPage;
