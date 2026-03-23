import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Home, CheckCircle, Wallet, Trophy, TrendingUp, FileText, Settings, LogOut, X, Upload, CreditCard, Save, Check, Camera, BarChart3, Clock, DollarSign, Edit3, Loader2, Users, UserPlus, Building2, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import AdminProfilePage from './AdminProfilePage';

// ── Mini bar chart for desktop ──────────────────────────────────
const MOCK_CHART_DATA = [
    { label: 'Sep', v: 2 }, { label: 'Oct', v: 5 }, { label: 'Nov', v: 3 },
    { label: 'Dic', v: 7 }, { label: 'Ene', v: 4 }, { label: 'Feb', v: 6 },
];

interface MyProperty {
    id: string;
    matricula: string;
    descripcion: string;
    ubicacion: string;
    tipo: 'venta' | 'alquiler' | 'anticretico';
    precio: number;
    alquilado: boolean;
    tiempoAlquiler: number | null;
    tiempoAnticretico: number | null;
    image: string | null;
    promocionado: boolean;
    enCoventa: boolean;
}

const ProfilePage = () => {
    const { agent, logout, refreshAgent } = useAuth();
    const navigate = useNavigate();

    // ── Render admin dashboard if admin ──────────────────────────
    if (agent?.role === 'admin') return <AdminProfilePage />;

    const [activeModal, setActiveModal] = useState<'report' | 'wallet' | 'properties' | 'settings' | 'agency' | null>(null);
    const [settingsTab, setSettingsTab] = useState<'perfil' | 'verificacion'>('verificacion');

    // Agency panel state
    const [agencyDashboard, setAgencyDashboard] = useState<any>(null);
    const [agencyLoading, setAgencyLoading] = useState(false);
    const [agencyTab, setAgencyTab] = useState<'resumen' | 'solicitudes' | 'equipo' | 'invitar' | 'propiedades'>('resumen');
    const [inviteSearch, setInviteSearch] = useState('');
    const [inviteResults, setInviteResults] = useState<any[]>([]);
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState<string | null>(null);
    const [agencyProperties, setAgencyProperties] = useState<any[]>([]);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);


    // Avatar
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(agent?.avatarUrl || null);

    const fileInputFrontRef = useRef<HTMLInputElement>(null);
    const fileInputBackRef = useRef<HTMLInputElement>(null);
    const [frontImg, setFrontImg] = useState<string | null>(agent?.identityFront || null);
    const [backImg, setBackImg] = useState<string | null>(agent?.identityBack || null);
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(agent?.emailVerified || false);

    // Wallet
    const [walletAmount, setWalletAmount] = useState('');

    // Properties from DB
    const [myProperties, setMyProperties] = useState<MyProperty[]>([]);
    const [propsLoading, setPropsLoading] = useState(false);

    // Properties edit state
    const [editingPropId, setEditingPropId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editAlquilado, setEditAlquilado] = useState(false);
    const [editTiempo, setEditTiempo] = useState('');
    const [saving, setSaving] = useState(false);

    // Profile edit state
    const [profileName, setProfileName] = useState(agent?.name || '');
    const [profileLastName, setProfileLastName] = useState(agent?.lastName || '');
    const [profilePhone, setProfilePhone] = useState(agent?.phone || '');

    // Refresh agent data on mount
    useEffect(() => {
        refreshAgent();
    }, []);

    // ── Fetch properties when modal opens ────────────────────────
    const fetchMyProperties = useCallback(async () => {
        setPropsLoading(true);
        try {
            const res = await api.get('/agents/my-properties');
            setMyProperties(res.data);
        } catch (err) {
            console.error('Error fetching properties:', err);
        } finally {
            setPropsLoading(false);
        }
    }, []);

    const fetchAgencyDashboard = useCallback(async () => {
        setAgencyLoading(true);
        try {
            const res = await api.get('/agencies/dashboard');
            setAgencyDashboard(res.data);
        } catch (err) { console.error(err); }
        finally { setAgencyLoading(false); }
    }, []);

    const fetchAgencyProperties = useCallback(async () => {
        try {
            const res = await api.get('/agencies/properties');
            setAgencyProperties(res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        if (activeModal === 'properties') {
            fetchMyProperties();
        }
        if (activeModal === 'agency') {
            fetchAgencyDashboard();
            fetchAgencyProperties();
        }
    }, [activeModal, fetchMyProperties, fetchAgencyDashboard, fetchAgencyProperties]);

    // Auto-fetch agency data on mount for agency accounts
    const isAgency = agent?.role === 'agencia';
    useEffect(() => {
        if (isAgency) {
            fetchAgencyDashboard();
            fetchAgencyProperties();
        }
    }, [isAgency, fetchAgencyDashboard, fetchAgencyProperties]);

    // Sync agent data when it changes
    useEffect(() => {
        if (agent) {
            setAvatarUrl(agent.avatarUrl || null);
            setFrontImg(agent.identityFront || null);
            setBackImg(agent.identityBack || null);
            setIsVerified(agent.emailVerified || false);
            setProfileName(agent.name);
            setProfileLastName(agent.lastName);
            setProfilePhone(agent.phone);
        }
    }, [agent]);

    // ── Handlers ─────────────────────────────────────────────────
    const handleAvatarUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height, 300);
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                setAvatarUrl(base64);
                try { await api.post('/agents/upload-avatar', { avatarUrl: base64 }); await refreshAgent(); } catch (err) { console.error(err); }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = async (e: any, type: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            if (type === 'front') setFrontImg(base64); else setBackImg(base64);
            try {
                await api.post('/agents/upload-identity', {
                    frontUrl: type === 'front' ? base64 : frontImg,
                    backUrl: type === 'back' ? base64 : backImg
                });
                await refreshAgent();
            } catch (err) { console.error(err); }
        };
        reader.readAsDataURL(file);
    };

    const handleSendCode = async () => { try { await api.post('/agents/send-verification-email'); setEmailCodeSent(true); } catch (err) { console.error(err); } };
    const handleVerifyCode = async () => {
        try { await api.post('/agents/verify-email', { code: verificationCode }); setIsVerified(true); setEmailCodeSent(false); await refreshAgent(); }
        catch (err) { console.error('Código inválido', err); }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.patch('/agents/update-profile', { name: profileName, lastName: profileLastName, phone: profilePhone });
            await refreshAgent();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    const handleSearchAgents = async (q: string) => {
        setInviteSearch(q);
        if (q.length < 2) { setInviteResults([]); return; }
        try {
            const res = await api.get(`/agencies/search-agents?q=${encodeURIComponent(q)}`);
            setInviteResults(res.data);
        } catch { setInviteResults([]); }
    };

    const handleInviteAgent = async (email: string) => {
        setInviting(true);
        setInviteResult(null);
        try {
            const res = await api.post('/agencies/invite', { email });
            setInviteResult(`✅ ${res.data.message}`);
            setInviteSearch(''); setInviteResults([]);
            fetchAgencyDashboard();
        } catch (err: any) {
            setInviteResult(`❌ ${err.response?.data?.message || 'Error al invitar'}`);
        } finally { setInviting(false); }
    };

    const handleAcceptRequest = async (requestId: string) => {
        setProcessingRequestId(requestId);
        try {
            await api.patch(`/agencies/requests/${requestId}/accept`);
            fetchAgencyDashboard();
        } catch (err) { console.error(err); }
        finally { setProcessingRequestId(null); }
    };

    const handleRejectRequest = async (requestId: string) => {
        setProcessingRequestId(requestId);
        try {
            await api.patch(`/agencies/requests/${requestId}/reject`);
            fetchAgencyDashboard();
        } catch (err) { console.error(err); }
        finally { setProcessingRequestId(null); }
    };

    const handleRemoveAgent = async (agentId: string) => {
        if (!confirm('¿Remover este agente de tu agencia?')) return;
        setRemovingId(agentId);
        try {
            await api.delete(`/agencies/agents/${agentId}`);
            fetchAgencyDashboard();
        } catch (err) { console.error(err); }
        finally { setRemovingId(null); }
    };


    const startEdit = (p: MyProperty) => {
        setEditingPropId(p.id);
        setEditPrice(String(p.precio));
        setEditAlquilado(p.alquilado);
        setEditTiempo(String(p.tiempoAlquiler || p.tiempoAnticretico || ''));
    };

    const handleSaveProperty = async (p: MyProperty) => {
        setSaving(true);
        try {
            const payload: any = { precio: Number(editPrice) };
            if (p.tipo === 'alquiler') {
                payload.alquilado = editAlquilado;
                payload.tiempoAlquiler = editAlquilado ? Number(editTiempo) || null : null;
            }
            if (p.tipo === 'anticretico') {
                payload.tiempoAnticretico = Number(editTiempo) || null;
            }
            await api.patch(`/properties/${p.id}`, payload);
            await fetchMyProperties();
            setEditingPropId(null);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    // ── Display ──────────────────────────────────────────────────
    const propCount = agent?._count?.properties ?? 0;
    const txCount = agent?._count?.transactions ?? 0;
    const stats = { properties: propCount, sales: txCount, points: agent?.points ?? 0, walletBalance: agent?.wallet?.balance ?? 0 };
    const displayName = agent ? `${agent.name} ${agent.lastName}` : 'Sin nombre';
    const displayEmail = agent?.email ?? '';
    const displayRole = agent?.role ?? 'agente';
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2);
    const maxChart = Math.max(...MOCK_CHART_DATA.map(d => d.v));

    return (
        <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4 pb-24">
            {/* ── HEADER ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="relative p-6 sm:p-8 mb-6 rounded-3xl overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8"
                style={{ background: 'linear-gradient(145deg, rgba(20,20,25,0.9), rgba(10,10,15,0.8))', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)' }}>

                {/* Ambient Glows */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-orange/10 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none" />

                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <button onClick={() => avatarInputRef.current?.click()}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] flex-shrink-0 overflow-hidden group shadow-2xl ring-1 ring-white/10 hover:ring-accent-orange/50 transition-all z-10">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-3xl font-bold text-white tracking-wider">
                            {initials}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <Camera size={24} className="text-white transform scale-75 group-hover:scale-100 transition-transform duration-300" />
                    </div>
                </button>

                <div className="flex-1 text-center sm:text-left z-10 w-full mt-2 sm:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{displayName}</h1>
                            <p className="text-gray-400 text-sm mt-1">{displayEmail}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-4">
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/5 text-white/80 border border-white/10 capitalize shadow-inner shadow-white/5">{displayRole}</span>
                                {agent?.verified && (
                                    <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                                        <CheckCircle size={12} /> Verificado
                                    </span>
                                )}
                            </div>
                        </div>

                        <button onClick={handleLogout} className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/20">
                            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-sm font-medium">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {isAgency ? (
                /* ═══════════════════════════════════════════════
                   AGENCY PROFILE – Full Dashboard Inline
                   ═══════════════════════════════════════════════ */
                <>
                    {agencyLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-white/20" /></div>
                    ) : (() => {
                        const st = agencyDashboard?.stats;
                        const totalProps = st?.totalProperties ?? 0;
                        const totalSales = st?.totalTransactions ?? 0;
                        const totalAgents = st?.totalAgents ?? 0;
                        const totalPoints = st?.totalPoints ?? 0;
                        const pending = st?.pendingCount ?? 0;

                        // Monthly simulated data
                        const days = ['1', '5', '10', '15', '20', '25', '30'];
                        const monthlyData = days.map((d, i) => {
                            const pct = (i + 1) / days.length;
                            return {
                                dia: d,
                                propiedades: Math.round(totalProps * pct * (0.7 + Math.random() * 0.6)),
                                ventas: Math.round(totalSales * pct * (0.5 + Math.random() * 0.8)),
                            };
                        });

                        // Pie data
                        const ventaC = agencyProperties.filter((p: any) => p.tipo === 'venta').length;
                        const alqC = agencyProperties.filter((p: any) => p.tipo === 'alquiler').length;
                        const antiC = agencyProperties.filter((p: any) => p.tipo === 'anticretico').length;
                        const pieData = [
                            { name: 'Venta', value: ventaC || 1 },
                            { name: 'Alquiler', value: alqC || 0 },
                            { name: 'Anticrético', value: antiC || 0 },
                        ].filter(d => d.value > 0);
                        const pieColors = ['#a3a3a3', '#737373', '#525252'];

                        return (
                            <>
                                {/* KPI Row */}
                                <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
                                    {[
                                        { val: totalAgents, label: 'Agentes', icon: Users },
                                        { val: totalProps, label: 'Propiedades', icon: Home },
                                        { val: totalSales, label: 'Ventas', icon: TrendingUp },
                                        { val: totalPoints, label: 'Puntos', icon: Trophy },
                                    ].map((kpi, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                                            className="glass-card p-3 sm:p-4 text-center">
                                            <kpi.icon size={14} className="text-white/15 mx-auto mb-1.5" />
                                            <p className="text-xl sm:text-2xl font-bold text-white/80 tabular-nums">{kpi.val}</p>
                                            <p className="text-[7px] sm:text-[8px] text-white/25 uppercase tracking-[0.14em] mt-1">{kpi.label}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    {/* Area Chart */}
                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                                        className="glass-card p-4 sm:p-5">
                                        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-3 font-medium">Actividad del mes</p>
                                        <ResponsiveContainer width="100%" height={130}>
                                            <AreaChart data={monthlyData}>
                                                <defs>
                                                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#fff" stopOpacity={0.12} />
                                                        <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.18} />
                                                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'rgba(14,14,20,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 11, color: '#aaa' }}
                                                    labelStyle={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                                                    formatter={(value: any, name: any) => [value, name === 'propiedades' ? 'Props' : 'Ventas']}
                                                    labelFormatter={(l: any) => `Día ${l}`}
                                                />
                                                <Area type="monotone" dataKey="propiedades" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} fill="url(#gP)" />
                                                <Area type="monotone" dataKey="ventas" stroke="#f97316" strokeWidth={1.5} fill="url(#gS)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        <div className="flex justify-center gap-5 mt-2">
                                            <span className="flex items-center gap-1.5 text-[8px] text-white/20"><span className="w-1.5 h-1.5 rounded-full bg-white/30" />Props</span>
                                            <span className="flex items-center gap-1.5 text-[8px] text-white/20"><span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />Ventas</span>
                                        </div>
                                    </motion.div>

                                    {/* Pie Chart */}
                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                                        className="glass-card p-4 sm:p-5">
                                        <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2 font-medium">Distribución</p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 flex-shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                                                            {pieData.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-2.5 flex-1">
                                                {pieData.map((d, idx) => (
                                                    <div key={d.name} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[idx] }} />
                                                            <span className="text-xs text-white/40">{d.name}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-white/60 tabular-nums">{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Tabs: Solicitudes / Equipo / Invitar */}
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                                    className="glass-card p-4 sm:p-5">
                                    <div className="flex gap-0.5 mb-4 border-b border-white/[0.05] pb-px overflow-x-auto">
                                        {([
                                            ['solicitudes', `Solicitudes${pending > 0 ? ` · ${pending}` : ''}`],
                                            ['equipo', 'Equipo'],
                                            ['invitar', 'Invitar'],
                                        ] as const).map(([k, label]) => (
                                            <button key={k} onClick={() => setAgencyTab(k as any)}
                                                className={`px-3 py-2 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap transition-all border-b-2 -mb-px ${agencyTab === k ? 'border-white/60 text-white/90' : 'border-transparent text-white/25 hover:text-white/40'}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Solicitudes */}
                                    {agencyTab === 'solicitudes' && (
                                        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                                            {(!agencyDashboard?.pendingRequests || agencyDashboard.pendingRequests.length === 0) ? (
                                                <div className="text-center py-10">
                                                    <CheckCircle size={22} className="text-white/8 mx-auto mb-2" />
                                                    <p className="text-sm text-white/25">Sin solicitudes</p>
                                                    <p className="text-[10px] text-white/12 mt-1">Los agentes que soliciten unirse aparecerán aquí</p>
                                                </div>
                                            ) : (
                                                agencyDashboard.pendingRequests.map((r: any) => (
                                                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-all">
                                                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/40 font-semibold text-xs">
                                                            {r.agent?.avatarUrl ? <img src={r.agent.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${r.agent?.name?.[0] || ''}${r.agent?.lastName?.[0] || ''}`}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white/65 truncate">{r.agent?.name} {r.agent?.lastName}</p>
                                                            <p className="text-[10px] text-white/20">{r.agent?.email}</p>
                                                        </div>
                                                        <div className="flex gap-1.5 flex-shrink-0">
                                                            <button onClick={() => handleAcceptRequest(r.id)} disabled={processingRequestId === r.id}
                                                                className="px-3 py-1.5 rounded-lg bg-white/[0.07] text-white/65 text-[10px] font-medium hover:bg-white/[0.11] transition-all disabled:opacity-40">
                                                                {processingRequestId === r.id ? <Loader2 size={10} className="animate-spin" /> : 'Aceptar'}
                                                            </button>
                                                            <button onClick={() => handleRejectRequest(r.id)} disabled={processingRequestId === r.id}
                                                                className="px-2.5 py-1.5 rounded-lg text-white/20 text-[10px] hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40">
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Equipo */}
                                    {agencyTab === 'equipo' && (
                                        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                                            {agencyDashboard?.agents?.length === 0 ? (
                                                <div className="text-center py-10">
                                                    <Users size={22} className="text-white/8 mx-auto mb-2" />
                                                    <p className="text-sm text-white/25">Sin agentes aún</p>
                                                </div>
                                            ) : (
                                                agencyDashboard?.agents?.map((a: any) => (
                                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.07] transition-all">
                                                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/40 font-semibold text-xs">
                                                            {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${a.name?.[0] || ''}${a.lastName?.[0] || ''}`}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white/65 truncate">{a.name} {a.lastName}</p>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-[10px] text-white/18">{a._count?.properties ?? 0} props</span>
                                                                <span className="text-[10px] text-white/18">{a._count?.transactions ?? 0} ventas</span>
                                                                <span className="text-[10px] text-white/18">{a.points} pts</span>
                                                            </div>
                                                        </div>
                                                        {a.id !== agent?.id && (
                                                            <button onClick={() => handleRemoveAgent(a.id)} disabled={removingId === a.id}
                                                                className="p-2 rounded-lg text-white/12 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40 flex-shrink-0" title="Remover">
                                                                {removingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Invitar */}
                                    {agencyTab === 'invitar' && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/18" />
                                                <input type="text" value={inviteSearch} onChange={e => handleSearchAgents(e.target.value)}
                                                    placeholder="Buscar por nombre o email..." className="w-full bg-white/[0.03] border border-white/[0.05] pl-9 pr-4 py-2.5 rounded-xl text-sm text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/12" />
                                            </div>

                                            {inviteResults.length > 0 && (
                                                <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                                                    {inviteResults.map((a: any) => (
                                                        <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/35 font-semibold text-[10px]">
                                                                {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${a.name?.[0] || ''}${a.lastName?.[0] || ''}`}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-white/55 truncate">{a.name} {a.lastName}</p>
                                                                <p className="text-[10px] text-white/18">{a.email}</p>
                                                            </div>
                                                            <button onClick={() => handleInviteAgent(a.email)} disabled={inviting}
                                                                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/45 text-[10px] font-medium hover:bg-white/10 transition-all disabled:opacity-40 flex-shrink-0">
                                                                {inviting ? <Loader2 size={10} className="animate-spin" /> : 'Invitar'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {inviteSearch.length >= 2 && inviteResults.length === 0 && (
                                                <p className="text-[10px] text-white/15 text-center py-4">No se encontraron agentes independientes</p>
                                            )}

                                            {agencyDashboard?.pendingInvitations?.length > 0 && (
                                                <div className="mt-2 pt-3 border-t border-white/[0.04]">
                                                    <p className="text-[8px] text-white/15 uppercase tracking-widest mb-2">Invitaciones pendientes</p>
                                                    {agencyDashboard.pendingInvitations.map((inv: any) => (
                                                        <div key={inv.id} className="flex items-center gap-2 p-2 text-[11px] text-white/25">
                                                            <Clock size={10} className="text-white/12" />
                                                            <span>{inv.agent?.name} {inv.agent?.lastName}</span>
                                                            <span className="text-[9px] text-white/10 ml-auto">Pendiente</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <AnimatePresence>
                                                {inviteResult && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                        className={`text-xs p-3 rounded-xl border ${inviteResult.startsWith('✅') ? 'bg-white/[0.02] border-white/[0.05] text-white/45' : 'bg-red-500/5 border-red-500/10 text-red-400/60'}`}>
                                                        {inviteResult}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Settings button for agency too */}
                                <div className="mt-4">
                                    <button onClick={() => setActiveModal('settings')}
                                        className="glass-card p-3 sm:p-4 flex items-center gap-3 hover:border-white/10 transition-all text-left border border-transparent w-full">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 bg-white/5 border-white/10">
                                            <Settings size={16} className="text-white/30" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-white/60 text-xs sm:text-sm">Configuración</p>
                                            <p className="text-[9px] text-white/20 mt-0.5">Perfil y verificación</p>
                                        </div>
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </>
            ) : (
                /* ═══════════════════════════════════════════════
                   NORMAL AGENT PROFILE
                   ═══════════════════════════════════════════════ */
                <>
                    {/* ── PREMIUM STATS GRID ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        {[
                            { icon: Home, color: 'text-blue-400', bg: 'bg-blue-400', val: stats.properties, label: 'Propiedades', desc: 'Publicadas activas' },
                            { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400', val: stats.sales, label: 'Ventas', desc: 'Tratos cerrados' },
                            { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400', val: stats.points, label: 'Puntos', desc: 'Nivel actual' },
                            { icon: Wallet, color: 'text-accent-orange', bg: 'bg-accent-orange', val: `Bs. ${stats.walletBalance}`, label: 'Wallet', desc: 'Saldo disponible' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                                className="relative p-4 sm:p-5 rounded-3xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                                style={{ background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(15,15,20,0.9) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>

                                {/* Glow Effect */}
                                <div className={`absolute -top-10 -right-10 w-24 h-24 ${s.bg} rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className={`w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner`}>
                                        <s.icon size={18} className={s.color} />
                                    </div>
                                    {i === 2 && stats.points >= 500 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold tracking-wider">DIAMANTE</span>}
                                </div>

                                <div className="relative z-10">
                                    <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-0.5" style={{ textShadow: `0 4px 20px ${s.bg}40` }}>{s.val}</p>
                                    <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                                    <p className="text-[9px] text-gray-500 mt-1">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── BENTO WIDGETS (Progress & Chart) ────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">

                        {/* Progress Widget */}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="lg:col-span-2 relative p-5 sm:p-6 rounded-3xl overflow-hidden"
                            style={{ background: 'linear-gradient(145deg, rgba(20,20,25,0.9), rgba(10,10,15,0.8))', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-[50px] pointer-events-none" />

                            <div className="flex justify-between items-end mb-4 relative z-10">
                                <div>
                                    <h3 className="text-sm font-bold text-white/90 flex items-center gap-2 mb-1">
                                        <Star size={16} className="text-yellow-400" /> Progreso de Nivel
                                    </h3>
                                    <p className="text-xs text-gray-500">Rango Actual: {stats.points >= 500 ? 'Diamante 💎' : stats.points >= 200 ? 'Oro 🥇' : stats.points >= 50 ? 'Plata 🥈' : 'Bronce 🥉'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-accent-orange">{stats.points}</span>
                                    <span className="text-xs text-gray-500 font-medium ml-1">/ 500 pts</span>
                                </div>
                            </div>

                            <div className="relative w-full h-3 sm:h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner mt-2 z-10">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (stats.points / 500) * 100)}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-orange via-yellow-500 to-yellow-400 rounded-full relative overflow-hidden"
                                >
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                                    />
                                </motion.div>
                            </div>

                            <p className="text-[10px] sm:text-xs text-gray-500 mt-4 flex justify-between relative z-10">
                                <span>Multiplica tus puntos publicando y vendiendo propiedades.</span>
                                {stats.points < 500 && <span className="font-medium text-yellow-500/70">{500 - stats.points} pts para Diamante</span>}
                            </p>
                        </motion.div>

                        {/* Mini Activity Chart */}
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="hidden lg:flex flex-col relative p-5 sm:p-6 rounded-3xl"
                            style={{ background: 'linear-gradient(145deg, rgba(20,20,25,0.9), rgba(10,10,15,0.8))', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={14} className="text-blue-400" />
                                <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Actividad Reciente</span>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-2 h-24 mt-2">
                                {MOCK_CHART_DATA.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full max-w-[14px] rounded-full bg-white/5 border border-white/10 group-hover:border-blue-400/50 relative overflow-hidden transition-all"
                                            style={{ height: `${Math.max(15, (d.v / maxChart) * 100)}%` }}>
                                            <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-medium">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ── ACTION BUTTONS ─────────────────────────────────── */}
                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-500 mb-3 ml-2">Herramientas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { key: 'report' as const, icon: FileText, color: 'text-blue-400', hoverBg: 'group-hover:bg-blue-500', title: 'Reportar Venta', sub: 'Subir contrato' },
                            { key: 'wallet' as const, icon: Wallet, color: 'text-accent-orange', hoverBg: 'group-hover:bg-accent-orange', title: 'Recargar', sub: 'QR o Tarjeta' },
                            { key: 'ranking' as const, icon: Trophy, color: 'text-yellow-400', hoverBg: 'group-hover:bg-yellow-500', title: 'Ranking', sub: 'Tabla de líderes', path: '/ranking' },
                            { key: 'properties' as const, icon: Home, color: 'text-purple-400', hoverBg: 'group-hover:bg-purple-500', title: 'Mis Propiedades', sub: 'Administrar' },
                            { key: 'settings' as const, icon: Settings, color: 'text-gray-400', hoverBg: 'group-hover:bg-gray-400', title: 'Configuración', sub: 'Perfil y cuenta' },
                        ].map((b, i) => (
                            <motion.button key={b.key} onClick={() => b.path ? navigate(b.path) : setActiveModal(b.key as any)}
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + (i * 0.05) }}
                                className="relative p-4 sm:p-5 rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 text-left border border-white/5"
                                style={{ background: 'rgba(25,25,30,0.4)', backdropFilter: 'blur(10px)' }}>

                                <div className={`absolute top-0 left-0 w-full h-[3px] ${b.hoverBg} opacity-0 group-hover:opacity-100 transition-all duration-300`} />

                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                    <b.icon size={18} className={`${b.color} group-hover:text-white transition-colors`} />
                                </div>
                                <p className="font-bold text-white/90 text-sm mb-0.5">{b.title}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{b.sub}</p>
                            </motion.button>
                        ))}
                    </div>
                </>
            )}

            {/* ══════════════════ MODALS ══════════════════════════ */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); setEditingPropId(null); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md relative z-10 shadow-2xl overflow-hidden rounded-2xl max-h-[85vh] overflow-y-auto"
                            style={{ background: 'rgba(14,14,20,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="p-5 sm:p-6">
                                <button onClick={() => { setActiveModal(null); setEditingPropId(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full">
                                    <X size={16} />
                                </button>

                                {/* ── REPORT ───────────────────────────── */}
                                {activeModal === 'report' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><FileText size={18} /></div>
                                            <div><h3 className="text-lg font-bold">Reportar Venta</h3><p className="text-xs text-gray-500">Sube el documento de cierre</p></div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1.5 block">Matrícula del inmueble vendido</label>
                                                <input type="text" placeholder="Ej: SCZ-00012-ABCD" className="w-full bg-white/5 border border-glass-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange" />
                                            </div>
                                            <div className="border-2 border-dashed border-glass-border rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                                                <Upload size={24} className="text-gray-500 mb-2" />
                                                <p className="text-sm font-medium">Toca para subir documento</p>
                                                <p className="text-xs text-gray-600 mt-1">PDF, JPG o PNG (Max 5MB)</p>
                                            </div>
                                            <button className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors">Enviar Reporte</button>
                                            <p className="text-[10px] text-gray-500 text-center">Un administrador verificará en 24h.</p>
                                        </div>
                                    </div>
                                )}

                                {/* ── WALLET ─────────────────────────── */}
                                {activeModal === 'wallet' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center text-accent-orange"><Wallet size={18} /></div>
                                            <div><h3 className="text-lg font-bold">Recargar Wallet</h3><p className="text-xs text-gray-500">Saldo actual: Bs. {stats.walletBalance}</p></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                                            {['50', '100', '200', '500'].map(a => (
                                                <button key={a} onClick={() => setWalletAmount(a)} className={`py-2.5 border rounded-xl text-sm font-semibold transition-all ${walletAmount === a ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'bg-white/5 border-glass-border hover:border-accent-orange/50'}`}>Bs. {a}</button>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1.5 block">Monto personalizado</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Bs.</span>
                                                <input type="number" placeholder="0.00" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} className="w-full bg-white/5 border border-glass-border pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-5">
                                            <button onClick={() => {
                                                const amt = parseFloat(walletAmount);
                                                if (isNaN(amt) || amt <= 0) return alert('Ingresa un monto válido');
                                                window.open(`https://wa.me/59175005013?text=${encodeURIComponent(`Hola, quiero hacer una recarga por QR con el monto de ${amt} Bs.`)}`, '_blank');
                                            }} className="flex-1 py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] font-bold flex items-center justify-center gap-2 text-sm transition-colors border border-[#25D366]/30">
                                                Pagar con QR (WhatsApp)
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 text-center mt-3">Serás redirigido a WhatsApp para recibir el QR y enviar el comprobante.</p>
                                    </div>
                                )}

                                {/* ── PROPERTIES (from DB) ───────────── */}
                                {activeModal === 'properties' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400"><Home size={18} /></div>
                                            <div><h3 className="text-lg font-bold">Mis Propiedades</h3><p className="text-xs text-gray-500">{myProperties.length} publicaciones</p></div>
                                        </div>

                                        {propsLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 size={24} className="animate-spin text-accent-orange" />
                                            </div>
                                        ) : myProperties.length === 0 ? (
                                            <div className="text-center py-10">
                                                <Home size={32} className="text-gray-600 mx-auto mb-3" />
                                                <p className="text-sm text-gray-400">Aún no tienes propiedades</p>
                                                <p className="text-xs text-gray-500 mt-1">Publica tu primera propiedad para verla aquí.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
                                                {myProperties.map(p => (
                                                    <div key={p.id} className="bg-white/5 rounded-xl border border-glass-border overflow-hidden">
                                                        <div className="flex gap-3 p-2.5 items-center">
                                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                                                {p.image ? (
                                                                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><Home size={20} /></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold truncate">{p.descripcion}</p>
                                                                <p className="text-[10px] text-gray-400">{p.matricula}</p>
                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${p.tipo === 'venta' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : p.tipo === 'alquiler' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>{p.tipo}</span>
                                                                    <span className="text-xs text-accent-orange font-semibold">${Number(p.precio).toLocaleString()}</span>
                                                                    {p.tipo === 'alquiler' && p.alquilado && <span className="text-[9px] text-yellow-400 font-medium">• Alquilado</span>}
                                                                    {p.enCoventa && <span className="text-[9px] text-cyan-400 font-medium">• Coventa</span>}
                                                                </div>
                                                            </div>
                                                            <button onClick={() => editingPropId === p.id ? setEditingPropId(null) : startEdit(p)}
                                                                className={`p-2 rounded-lg text-xs transition-all flex-shrink-0 ${editingPropId === p.id ? 'bg-accent-orange text-white' : 'bg-white/5 text-gray-400 hover:text-accent-orange'}`}>
                                                                <Edit3 size={14} />
                                                            </button>
                                                        </div>

                                                        <AnimatePresence>
                                                            {editingPropId === p.id && (
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                                    className="border-t border-glass-border overflow-hidden">
                                                                    <div className="p-3 space-y-3 bg-white/[0.02]">
                                                                        <div>
                                                                            <label className="text-[10px] text-gray-400 mb-1 block flex items-center gap-1"><DollarSign size={10} /> Precio ({p.tipo === 'alquiler' ? 'mensual' : p.tipo === 'anticretico' ? 'total' : 'USD'})</label>
                                                                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                                                                                className="w-full bg-white/5 border border-glass-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-accent-orange" />
                                                                        </div>
                                                                        {p.tipo === 'alquiler' && (
                                                                            <>
                                                                                <div className="flex items-center justify-between">
                                                                                    <label className="text-[10px] text-gray-400 flex items-center gap-1"><Home size={10} /> ¿Ya está alquilado?</label>
                                                                                    <button onClick={() => setEditAlquilado(!editAlquilado)}
                                                                                        className={`w-10 h-5 rounded-full transition-colors relative ${editAlquilado ? 'bg-accent-orange' : 'bg-white/10'}`}>
                                                                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editAlquilado ? 'left-5' : 'left-0.5'}`} />
                                                                                    </button>
                                                                                </div>
                                                                                {editAlquilado && (
                                                                                    <div>
                                                                                        <label className="text-[10px] text-gray-400 mb-1 block flex items-center gap-1"><Clock size={10} /> Tiempo de alquiler (meses)</label>
                                                                                        <input type="number" value={editTiempo} onChange={e => setEditTiempo(e.target.value)} placeholder="12"
                                                                                            className="w-full bg-white/5 border border-glass-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-accent-orange" />
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {p.tipo === 'anticretico' && (
                                                                            <div>
                                                                                <label className="text-[10px] text-gray-400 mb-1 block flex items-center gap-1"><Clock size={10} /> Duración anticrético (años)</label>
                                                                                <input type="number" value={editTiempo} onChange={e => setEditTiempo(e.target.value)} placeholder="3"
                                                                                    className="w-full bg-white/5 border border-glass-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-accent-orange" />
                                                                            </div>
                                                                        )}
                                                                        <button onClick={() => handleSaveProperty(p)} disabled={saving}
                                                                            className="w-full py-2 rounded-lg bg-accent-orange hover:bg-accent-orange-hover text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button onClick={() => navigate('/publish')} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/5 text-sm font-semibold transition-colors mt-4">
                                            + Publicar Nueva
                                        </button>
                                    </div>
                                )}

                                {/* ── SETTINGS ───────────────────────── */}
                                {activeModal === 'settings' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 bg-gray-500/20 rounded-xl flex items-center justify-center text-gray-300"><Settings size={18} /></div>
                                            <div><h3 className="text-lg font-bold">Configuración</h3><p className="text-xs text-gray-500">Datos y verificación</p></div>
                                        </div>
                                        <div className="flex bg-white/5 rounded-xl p-1 mb-5 border border-white/5">
                                            <button onClick={() => setSettingsTab('perfil')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${settingsTab === 'perfil' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}>Datos Generales</button>
                                            <button onClick={() => setSettingsTab('verificacion')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${settingsTab === 'verificacion' ? 'bg-accent-orange text-white shadow-sm shadow-accent-orange/20' : 'text-gray-400 hover:text-gray-300'}`}>Verificación</button>
                                        </div>

                                        {settingsTab === 'perfil' && (
                                            <div className="space-y-3">
                                                <div><label className="text-xs text-gray-400 mb-1.5 block">Nombre</label><input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-white/5 border border-glass-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange" /></div>
                                                <div><label className="text-xs text-gray-400 mb-1.5 block">Apellido</label><input type="text" value={profileLastName} onChange={e => setProfileLastName(e.target.value)} className="w-full bg-white/5 border border-glass-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange" /></div>
                                                <div><label className="text-xs text-gray-400 mb-1.5 block">Teléfono</label><input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className="w-full bg-white/5 border border-glass-border px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange" /></div>
                                                <button onClick={handleSaveProfile} disabled={saving}
                                                    className="w-full py-3 rounded-xl bg-accent-orange hover:bg-accent-orange-hover text-white font-semibold flex items-center justify-center gap-2 text-sm transition-colors shadow-lg shadow-accent-orange/20 mt-2 disabled:opacity-50">
                                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar Cambios
                                                </button>
                                            </div>
                                        )}

                                        {settingsTab === 'verificacion' && (
                                            <div className="relative border-l-2 border-glass-border ml-4 space-y-6 pb-2 mt-2">
                                                <div className="relative pl-6">
                                                    <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center text-green-400 shadow-lg shadow-green-500/10">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-white leading-none mb-1 pt-1.5">1. Registro de Cuenta</h4>
                                                    <p className="text-xs text-gray-400">Datos iniciales completados.</p>
                                                </div>
                                                <div className="relative pl-6">
                                                    <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-lg transition-colors ${(frontImg && backImg) ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-accent-orange border-accent-orange-hover text-white shadow-accent-orange/30'}`}>
                                                        {(frontImg && backImg) ? <Check size={14} strokeWidth={3} /> : '2'}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-white leading-none mb-1 pt-1.5">2. Cargar Identidad</h4>
                                                    <p className="text-xs text-gray-400 mb-3">Sube CI o Pasaporte vigente.</p>
                                                    <input type="file" ref={fileInputFrontRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'front')} />
                                                    <input type="file" ref={fileInputBackRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'back')} />
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        {[{ ref: fileInputFrontRef, img: frontImg, label: 'Anverso' }, { ref: fileInputBackRef, img: backImg, label: 'Reverso' }].map((side, si) => (
                                                            <button key={si} onClick={() => side.ref.current?.click()}
                                                                className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all group ${side.img ? 'border-green-500/50 bg-green-500/10' : 'border-glass-border hover:border-accent-orange hover:bg-accent-orange/5 bg-white/5'}`}>
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 transition-colors ${side.img ? 'bg-green-500/20 text-green-400' : 'bg-white/5 group-hover:bg-accent-orange/10 group-hover:text-accent-orange text-gray-500'}`}>
                                                                    {side.img ? <Check size={12} /> : <Upload size={12} />}
                                                                </div>
                                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${side.img ? 'text-green-400' : 'text-gray-300 group-hover:text-accent-orange'}`}>{side.img ? '✓ Cargado' : side.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className={`relative pl-6 transition-all duration-300 ${(!frontImg || !backImg) && !isVerified ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                                    <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-lg ${isVerified ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-accent-orange border-accent-orange-hover text-white'}`}>
                                                        {isVerified ? <Check size={14} strokeWidth={3} /> : '3'}
                                                    </div>
                                                    <h4 className="text-sm font-bold text-gray-200 leading-none mb-1 pt-1.5">3. Verificar Correo</h4>
                                                    <p className="text-xs text-gray-400 mb-3">Verificaremos: <span className="text-gray-200 font-medium">{agent?.email}</span></p>
                                                    {isVerified ? (
                                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                                                            <span className="text-green-400 text-xs font-semibold flex items-center gap-1"><Check size={12} /> Cuenta Verificada</span>
                                                            <span className="text-[10px] text-gray-400 block mt-0.5">Ya puedes publicar propiedades.</span>
                                                        </div>
                                                    ) : emailCodeSent ? (
                                                        <div className="flex gap-2 items-center">
                                                            <input type="text" placeholder="000000" maxLength={6} value={verificationCode} onChange={e => setVerificationCode(e.target.value)}
                                                                className="flex-1 bg-white/5 border border-accent-orange/50 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-orange text-center tracking-[0.5em] font-mono text-white" />
                                                            <button onClick={handleVerifyCode} className="bg-accent-orange hover:bg-accent-orange-hover text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-accent-orange/20">Verificar</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={handleSendCode} className="bg-white/10 hover:bg-white/15 border border-glass-border px-5 py-2.5 rounded-xl text-xs font-semibold text-white w-full transition-colors">
                                                            Enviar código al correo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── AGENCY PANEL ────────────────────── */}
                                {activeModal === 'agency' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 bg-white/[0.06] rounded-xl flex items-center justify-center text-white/70"><Building2 size={18} /></div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white/90">{agencyDashboard?.agency?.name || 'Mi Agencia'}</h3>
                                                <p className="text-[10px] text-white/30">{agencyDashboard?.stats?.totalAgents ?? 0} agentes · Desde {agencyDashboard?.agency?.createdAt ? new Date(agencyDashboard.agency.createdAt).toLocaleDateString('es-BO', { month: 'short', year: 'numeric' }) : '—'}</p>
                                            </div>
                                        </div>

                                        {agencyLoading ? (
                                            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-white/30" /></div>
                                        ) : (
                                            <>
                                                {/* Tab Bar – minimal */}
                                                <div className="flex gap-0.5 mb-5 border-b border-white/[0.06] pb-px overflow-x-auto">
                                                    {([
                                                        ['resumen', 'Resumen'],
                                                        ['solicitudes', `Solicitudes${(agencyDashboard?.pendingRequests?.length ?? 0) > 0 ? ` · ${agencyDashboard.pendingRequests.length}` : ''}`],
                                                        ['equipo', 'Equipo'],
                                                        ['invitar', 'Invitar'],
                                                        ['propiedades', 'Props'],
                                                    ] as const).map(([k, label]) => (
                                                        <button key={k} onClick={() => setAgencyTab(k)}
                                                            className={`px-3 py-2 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap transition-all border-b-2 -mb-px ${agencyTab === k ? 'border-white/70 text-white' : 'border-transparent text-white/30 hover:text-white/50'}`}>
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* === Resumen Tab === */}
                                                {agencyTab === 'resumen' && (() => {
                                                    const stats = agencyDashboard?.stats;
                                                    const totalProps = stats?.totalProperties ?? 0;
                                                    const totalSales = stats?.totalTransactions ?? 0;
                                                    const totalAgents = stats?.totalAgents ?? 0;
                                                    const pending = stats?.pendingCount ?? 0;

                                                    // Simulated monthly data – based on real totals
                                                    const days = ['1', '5', '10', '15', '20', '25', '30'];
                                                    const monthlyData = days.map((d, i) => {
                                                        const pct = (i + 1) / days.length;
                                                        return {
                                                            dia: d,
                                                            propiedades: Math.round(totalProps * pct * (0.7 + Math.random() * 0.6)),
                                                            ventas: Math.round(totalSales * pct * (0.5 + Math.random() * 0.8)),
                                                            agentes: Math.max(1, Math.round(totalAgents * pct)),
                                                        };
                                                    });

                                                    // Property type breakdown from actual agency properties
                                                    const ventaCount = agencyProperties.filter((p: any) => p.tipo === 'venta').length;
                                                    const alquilerCount = agencyProperties.filter((p: any) => p.tipo === 'alquiler').length;
                                                    const antiCount = agencyProperties.filter((p: any) => p.tipo === 'anticretico').length;
                                                    const pieData = [
                                                        { name: 'Venta', value: ventaCount || 1 },
                                                        { name: 'Alquiler', value: alquilerCount || 0 },
                                                        { name: 'Anticrético', value: antiCount || 0 },
                                                    ].filter(d => d.value > 0);
                                                    const pieColors = ['#a3a3a3', '#737373', '#525252'];

                                                    return (
                                                        <div className="space-y-5">
                                                            {/* KPI Row */}
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {[
                                                                    { val: totalAgents, label: 'Agentes' },
                                                                    { val: totalProps, label: 'Propiedades' },
                                                                    { val: totalSales, label: 'Ventas' },
                                                                    { val: pending, label: 'Pendientes' },
                                                                ].map((kpi, i) => (
                                                                    <div key={i} className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                                                                        <p className="text-xl font-bold text-white/80 tabular-nums">{kpi.val}</p>
                                                                        <p className="text-[8px] text-white/25 uppercase tracking-[0.12em] mt-1">{kpi.label}</p>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Area Chart – Monthly Activity */}
                                                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-medium">Actividad del mes</p>
                                                                <ResponsiveContainer width="100%" height={140}>
                                                                    <AreaChart data={monthlyData}>
                                                                        <defs>
                                                                            <linearGradient id="gradProps" x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                                                                                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                                                                            </linearGradient>
                                                                            <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                                                                                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                                                                        <YAxis hide />
                                                                        <Tooltip
                                                                            contentStyle={{ backgroundColor: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#ccc' }}
                                                                            labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                                                            formatter={(value: any, name: any) => [value, name === 'propiedades' ? 'Props' : name === 'ventas' ? 'Ventas' : 'Agentes']}
                                                                            labelFormatter={(l: any) => `Día ${l}`}
                                                                        />
                                                                        <Area type="monotone" dataKey="propiedades" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} fill="url(#gradProps)" />
                                                                        <Area type="monotone" dataKey="ventas" stroke="#f97316" strokeWidth={1.5} fill="url(#gradSales)" />
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                                <div className="flex justify-center gap-5 mt-2">
                                                                    <span className="flex items-center gap-1.5 text-[9px] text-white/30"><span className="w-2 h-2 rounded-full bg-white/40" />Propiedades</span>
                                                                    <span className="flex items-center gap-1.5 text-[9px] text-white/30"><span className="w-2 h-2 rounded-full bg-[#f97316]" />Ventas</span>
                                                                </div>
                                                            </div>

                                                            {/* Pie Chart – Property Type Distribution */}
                                                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium">Distribución de propiedades</p>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-24 h-24 flex-shrink-0">
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <PieChart>
                                                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="value" strokeWidth={0}>
                                                                                    {pieData.map((_, idx) => (
                                                                                        <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                                                                                    ))}
                                                                                </Pie>
                                                                            </PieChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                    <div className="space-y-2 flex-1">
                                                                        {pieData.map((d, idx) => (
                                                                            <div key={d.name} className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[idx] }} />
                                                                                    <span className="text-xs text-white/50">{d.name}</span>
                                                                                </div>
                                                                                <span className="text-xs font-semibold text-white/70 tabular-nums">{d.value}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Top agents mini-list */}
                                                            {agencyDashboard?.agents?.length > 0 && (
                                                                <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                                                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-medium">Top agentes</p>
                                                                    <div className="space-y-2">
                                                                        {agencyDashboard.agents.slice(0, 3).map((a: any, idx: number) => (
                                                                            <div key={a.id} className="flex items-center gap-3">
                                                                                <span className="text-[10px] text-white/20 w-4 text-right font-mono">{idx + 1}</span>
                                                                                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/50 font-semibold text-[10px]">
                                                                                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${a.name?.[0] || ''}${a.lastName?.[0] || ''}`}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs text-white/60 font-medium truncate">{a.name} {a.lastName}</p>
                                                                                </div>
                                                                                <span className="text-[10px] text-white/30 tabular-nums">{a._count?.properties ?? 0} props</span>
                                                                                <span className="text-[10px] text-white/20 tabular-nums">{a.points} pts</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* === Solicitudes Tab === */}
                                                {agencyTab === 'solicitudes' && (
                                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                                                        {(!agencyDashboard?.pendingRequests || agencyDashboard.pendingRequests.length === 0) ? (
                                                            <div className="text-center py-10">
                                                                <CheckCircle size={24} className="text-white/10 mx-auto mb-2" />
                                                                <p className="text-sm text-white/30">Sin solicitudes pendientes</p>
                                                                <p className="text-[10px] text-white/15 mt-1">Cuando un agente solicite unirse, aparecerá aquí</p>
                                                            </div>
                                                        ) : (
                                                            agencyDashboard.pendingRequests.map((r: any) => (
                                                                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all">
                                                                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/50 font-semibold text-xs">
                                                                        {r.agent?.avatarUrl ? (
                                                                            <img src={r.agent.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            `${r.agent?.name?.[0] || ''}${r.agent?.lastName?.[0] || ''}`
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-white/70 truncate">{r.agent?.name} {r.agent?.lastName}</p>
                                                                        <p className="text-[10px] text-white/25">{r.agent?.email}</p>
                                                                    </div>
                                                                    <div className="flex gap-1.5 flex-shrink-0">
                                                                        <button onClick={() => handleAcceptRequest(r.id)} disabled={processingRequestId === r.id}
                                                                            className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-white/70 text-[10px] font-medium hover:bg-white/[0.12] transition-all disabled:opacity-40">
                                                                            {processingRequestId === r.id ? <Loader2 size={10} className="animate-spin" /> : 'Aceptar'}
                                                                        </button>
                                                                        <button onClick={() => handleRejectRequest(r.id)} disabled={processingRequestId === r.id}
                                                                            className="px-2.5 py-1.5 rounded-lg text-white/25 text-[10px] font-medium hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40">
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}

                                                {/* === Equipo Tab === */}
                                                {agencyTab === 'equipo' && (
                                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                                                        {agencyDashboard?.agents?.length === 0 ? (
                                                            <div className="text-center py-10">
                                                                <Users size={24} className="text-white/10 mx-auto mb-2" />
                                                                <p className="text-sm text-white/30">Sin agentes aún</p>
                                                            </div>
                                                        ) : (
                                                            agencyDashboard?.agents?.map((a: any) => (
                                                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/50 font-semibold text-xs">
                                                                        {a.avatarUrl ? (
                                                                            <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            `${a.name?.[0] || ''}${a.lastName?.[0] || ''}`
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-white/70 truncate">{a.name} {a.lastName}</p>
                                                                        <div className="flex items-center gap-3 mt-0.5">
                                                                            <span className="text-[10px] text-white/20">{a._count?.properties ?? 0} props</span>
                                                                            <span className="text-[10px] text-white/20">{a._count?.transactions ?? 0} ventas</span>
                                                                            <span className="text-[10px] text-white/20">{a.points} pts</span>
                                                                        </div>
                                                                    </div>
                                                                    {a.id !== agent?.id && (
                                                                        <button onClick={() => handleRemoveAgent(a.id)} disabled={removingId === a.id}
                                                                            className="p-2 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40 flex-shrink-0" title="Remover">
                                                                            {removingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}

                                                {/* === Invitar Tab === */}
                                                {agencyTab === 'invitar' && (
                                                    <div className="space-y-3">
                                                        <div className="relative">
                                                            <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                                            <input type="text" value={inviteSearch} onChange={e => handleSearchAgents(e.target.value)}
                                                                placeholder="Buscar por nombre o email..." className="w-full bg-white/[0.03] border border-white/[0.06] pl-9 pr-4 py-2.5 rounded-xl text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15" />
                                                        </div>

                                                        {inviteResults.length > 0 && (
                                                            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                                                                {inviteResults.map((a: any) => (
                                                                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center text-white/40 font-semibold text-[10px]">
                                                                            {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${a.name?.[0] || ''}${a.lastName?.[0] || ''}`}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-medium text-white/60 truncate">{a.name} {a.lastName}</p>
                                                                            <p className="text-[10px] text-white/20">{a.email}</p>
                                                                        </div>
                                                                        <button onClick={() => handleInviteAgent(a.email)} disabled={inviting}
                                                                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-[10px] font-medium hover:bg-white/10 transition-all disabled:opacity-40 flex-shrink-0">
                                                                            {inviting ? <Loader2 size={10} className="animate-spin" /> : 'Invitar'}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {inviteSearch.length >= 2 && inviteResults.length === 0 && (
                                                            <p className="text-[10px] text-white/20 text-center py-4">No se encontraron agentes independientes</p>
                                                        )}

                                                        {agencyDashboard?.pendingInvitations?.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-white/[0.04]">
                                                                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Invitaciones pendientes</p>
                                                                {agencyDashboard.pendingInvitations.map((inv: any) => (
                                                                    <div key={inv.id} className="flex items-center gap-2 p-2 text-[11px] text-white/30">
                                                                        <Clock size={10} className="text-white/15" />
                                                                        <span>{inv.agent?.name} {inv.agent?.lastName}</span>
                                                                        <span className="text-[9px] text-white/15 ml-auto">Pendiente</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <AnimatePresence>
                                                            {inviteResult && (
                                                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                                    className={`text-xs p-3 rounded-xl border ${inviteResult.startsWith('✅') ? 'bg-white/[0.03] border-white/[0.06] text-white/50' : 'bg-red-500/5 border-red-500/10 text-red-400/70'}`}>
                                                                    {inviteResult}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {/* === Propiedades Tab === */}
                                                {agencyTab === 'propiedades' && (
                                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                                                        {agencyProperties.length === 0 ? (
                                                            <div className="text-center py-10">
                                                                <Home size={24} className="text-white/10 mx-auto mb-2" />
                                                                <p className="text-sm text-white/30">Sin propiedades</p>
                                                            </div>
                                                        ) : (
                                                            agencyProperties.map((p: any) => (
                                                                <div key={`${p.id}-${p.agent?.id}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                                    <div className="w-11 h-11 bg-white/[0.04] rounded-lg overflow-hidden flex-shrink-0">
                                                                        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><Home size={14} /></div>}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-medium text-white/60 truncate">{p.ubicacion}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${p.tipo === 'venta' ? 'bg-white/[0.06] text-white/40' : p.tipo === 'alquiler' ? 'bg-white/[0.04] text-white/30' : 'bg-white/[0.04] text-white/30'}`}>{p.tipo}</span>
                                                                            <span className="text-xs text-white/50 font-semibold tabular-nums">${Number(p.precio).toLocaleString()}</span>
                                                                        </div>
                                                                        <p className="text-[9px] text-white/15 mt-0.5">{p.agent?.name} {p.agent?.lastName}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
