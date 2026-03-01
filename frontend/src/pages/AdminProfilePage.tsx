import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Users, Home, TrendingUp, Building2, Clock, CheckCircle,
    ChevronLeft, ChevronRight, LogOut, Camera, Loader2,
    BarChart3, PieChart as PieChartIcon, CalendarDays, Check,
    AlertTriangle, Award, DollarSign, Activity, Download,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ── Types ──────────────────────────────────────────────────────
interface ChartPoint {
    label: string;
    ventas: number;
    propiedades: number;
}

interface AdminMetrics {
    totalAgents: number;
    totalProperties: number;
    totalTransactions: number;
    pendingVerifications: number;
    totalAgencies: number;
    salesWeek: number;
    salesMonth: number;
    salesYear: number;
    propsWeek: number;
    propsMonth: number;
    propsYear: number;
    agentsThisMonth: number;
    dailyChart: ChartPoint[];
    weeklyChart: ChartPoint[];
    monthlyChart: ChartPoint[];
    propertyDistribution: { venta: number; alquiler: number; anticretico: number };
}

const CHART_COLORS = {
    orange: '#FF6A00',
    orangeGlow: 'rgba(255,106,0,0.15)',
    white: 'rgba(255,255,255,0.35)',
    whiteGlow: 'rgba(255,255,255,0.08)',
    green: '#22c55e',
    greenGlow: 'rgba(34,197,94,0.12)',
    blue: '#3b82f6',
    blueGlow: 'rgba(59,130,246,0.12)',
};

const PIE_COLORS = ['#FF6A00', '#3b82f6', '#a855f7'];

const AdminProfilePage = () => {
    const { agent, logout, refreshAgent } = useAuth();
    const navigate = useNavigate();

    // Refresh agent data on mount
    useEffect(() => {
        refreshAgent();
    }, []);

    // ── State ─────────────────────────────────────────────────────
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [pendingProps, setPendingProps] = useState<any[]>([]);
    const [topAgents, setTopAgents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'properties' | 'agents'>('overview');

    // Charts carousel
    const [chartSlide, setChartSlide] = useState(0);
    type ChartPeriod = 'daily' | 'weekly' | 'monthly';
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');
    const totalSlides = 3;

    // Avatar
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(agent?.avatarUrl || null);

    const displayName = agent ? `${agent.name} ${agent.lastName}` : 'Admin';
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2);

    // ── Fetch Data ────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const [mRes, txRes, propsRes, agentsRes] = await Promise.all([
                api.get('/admin/metrics'),
                api.get('/admin/transactions/pending'),
                api.get('/admin/properties/pending'),
                api.get('/admin/top-agents'),
            ]);
            setMetrics(mRes.data);
            setPendingTxs(txRes.data);
            setPendingProps(propsRes.data);
            setTopAgents(agentsRes.data);
        } catch (err) {
            console.error('Admin fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        if (agent) setAvatarUrl(agent.avatarUrl || null);
    }, [agent]);

    // ── Handlers ─────────────────────────────────────────────────
    const handleVerifyTx = async (txId: string) => {
        setVerifyingId(txId);
        try {
            await api.patch(`/admin/transactions/${txId}/verify`);
            setPendingTxs(prev => prev.filter(t => t.id !== txId));
            fetchAll();
        } catch (err) { console.error(err); }
        finally { setVerifyingId(null); }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    const handleDownloadCSV = async () => {
        if (!metrics) return;
        try {
            const res = await api.get('/admin/report/csv', { responseType: 'blob' });
            // application/vnd.ms-excel fuerza al SO a ofrecer abrirlo en Excel
            const blob = new Blob([res.data], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `reky-reporte-admin-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Liberar memoria
        } catch (error) {
            console.error("Error downloading CSV report", error);
        }
    };

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

    const nextSlide = () => setChartSlide(s => (s + 1) % totalSlides);
    const prevSlide = () => setChartSlide(s => (s - 1 + totalSlides) % totalSlides);

    // Auto-rotate carousel removed to allow manual control

    // ── Derived Data ─────────────────────────────────────────────
    const pieData = metrics ? [
        { name: 'Venta', value: metrics.propertyDistribution.venta || 0 },
        { name: 'Alquiler', value: metrics.propertyDistribution.alquiler || 0 },
        { name: 'Anticrético', value: metrics.propertyDistribution.anticretico || 0 },
    ].filter(d => d.value > 0) : [];

    const salesBarData = metrics ? [
        { period: 'Semana', ventas: metrics.salesWeek, propiedades: metrics.propsWeek },
        { period: 'Mes', ventas: metrics.salesMonth, propiedades: metrics.propsMonth },
        { period: 'Año', ventas: metrics.salesYear, propiedades: metrics.propsYear },
    ] : [];

    const activityChartData = metrics
        ? chartPeriod === 'daily' ? metrics.dailyChart
            : chartPeriod === 'weekly' ? metrics.weeklyChart
                : metrics.monthlyChart
        : [];

    const periodLabels: Record<ChartPeriod, string> = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };
    const periodSub: Record<ChartPeriod, string> = { daily: 'Últimos 28 días', weekly: 'Últimas 12 semanas', monthly: 'Últimos 12 meses' };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={36} className="animate-spin text-accent-orange mx-auto mb-4" />
                    <p className="text-white/30 text-sm">Cargando panel de administración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-4 sm:py-8 px-3 sm:px-4 pb-24">

            {/* ── HEADER ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="relative p-6 sm:p-8 mb-6 rounded-3xl overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8"
                style={{ background: 'linear-gradient(145deg, rgba(20,14,8,0.95), rgba(10,10,15,0.85))', border: '1px solid rgba(255,106,0,0.12)', boxShadow: '0 20px 60px -20px rgba(255,106,0,0.15)' }}>

                {/* Ambient Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-orange/8 rounded-full blur-[100px] -mr-60 -mt-60 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <button onClick={() => avatarInputRef.current?.click()}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] flex-shrink-0 overflow-hidden group shadow-2xl ring-2 ring-accent-orange/20 hover:ring-accent-orange/50 transition-all z-10">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent-orange/20 to-red-900/30 flex items-center justify-center text-3xl font-bold text-white tracking-wider">
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
                            <p className="text-white/30 text-sm mt-1">{agent?.email}</p>
                            <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-4">
                                <span className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full bg-accent-orange/15 text-accent-orange border border-accent-orange/25 shadow-[0_0_20px_rgba(255,106,0,0.1)]">
                                    <Shield size={12} /> Administrador
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleDownloadCSV} disabled={!metrics} className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] text-accent-orange/80 hover:bg-accent-orange/10 hover:text-accent-orange transition-all border border-white/5 hover:border-accent-orange/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                <span className="text-sm font-medium hidden sm:inline">Exportar CSV</span>
                            </button>
                            <button onClick={handleLogout} className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/20">
                                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span className="text-sm font-medium">Cerrar sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── KPI CARDS ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-5">
                {[
                    { icon: Users, val: metrics?.totalAgents ?? 0, label: 'Agentes', color: 'text-blue-400', bg: 'bg-blue-400' },
                    { icon: Building2, val: metrics?.totalAgencies ?? 0, label: 'Agencias', color: 'text-purple-400', bg: 'bg-purple-400' },
                    { icon: Home, val: metrics?.totalProperties ?? 0, label: 'Propiedades', color: 'text-emerald-400', bg: 'bg-emerald-400' },
                    { icon: TrendingUp, val: metrics?.totalTransactions ?? 0, label: 'Ventas', color: 'text-accent-orange', bg: 'bg-accent-orange' },
                    { icon: AlertTriangle, val: metrics?.pendingVerifications ?? 0, label: 'Pendientes', color: 'text-yellow-400', bg: 'bg-yellow-400' },
                    { icon: Activity, val: metrics?.agentsThisMonth ?? 0, label: 'Nuevos/mes', color: 'text-cyan-400', bg: 'bg-cyan-400' },
                ].map((kpi, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                        className="relative p-3.5 sm:p-4 rounded-2xl overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300"
                        style={{ background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(15,15,20,0.95) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className={`absolute -top-8 -right-8 w-20 h-20 ${kpi.bg} rounded-full blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity`} />
                        <kpi.icon size={14} className={`${kpi.color} mb-2 relative z-10 opacity-60`} />
                        <p className="text-xl sm:text-2xl font-bold text-white/85 tabular-nums relative z-10">{kpi.val}</p>
                        <p className="text-[8px] sm:text-[9px] text-white/25 uppercase tracking-[0.12em] mt-1 relative z-10">{kpi.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── CHARTS CAROUSEL ─────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="relative mb-5 rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(12,12,18,0.95) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>

                {/* Carousel Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                    <div className="flex items-center gap-2">
                        {(() => {
                            const slides = [
                                { icon: BarChart3, label: 'Ventas por período' },
                                { icon: Activity, label: chartSlide === 1 ? `Actividad · ${periodLabels[chartPeriod]}` : 'Actividad' },
                                { icon: PieChartIcon, label: 'Distribución' },
                            ];
                            const s = slides[chartSlide];
                            return (
                                <>
                                    <s.icon size={14} className="text-accent-orange/60" />
                                    <span className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-medium">{s.label}</span>
                                </>
                            );
                        })()}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Period selector (only on activity slide) */}
                        {chartSlide === 1 && (
                            <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 mr-2">
                                {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map(p => (
                                    <button key={p} onClick={() => setChartPeriod(p)}
                                        className={`px-2 sm:px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-medium transition-all duration-200 ${chartPeriod === p
                                            ? 'bg-accent-orange/20 text-accent-orange shadow-sm'
                                            : 'text-white/25 hover:text-white/45'}`}>
                                        {p === 'daily' ? 'Día' : p === 'weekly' ? 'Sem' : 'Mes'}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={prevSlide} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all text-white/30 hover:text-white/60">
                            <ChevronLeft size={14} />
                        </button>
                        <div className="flex gap-1 mx-1">
                            {Array.from({ length: totalSlides }).map((_, i) => (
                                <button key={i} onClick={() => setChartSlide(i)}
                                    className={`h-1 rounded-full transition-all duration-300 ${i === chartSlide ? 'w-5 bg-accent-orange/60' : 'w-1.5 bg-white/10 hover:bg-white/20'}`} />
                            ))}
                        </div>
                        <button onClick={nextSlide} className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all text-white/30 hover:text-white/60">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Carousel Slides */}
                <div className="relative overflow-hidden" style={{ height: '220px' }}>
                    <AnimatePresence mode="wait">
                        {/* Slide 0: Sales by Period (Bar Chart) */}
                        {chartSlide === 0 && (
                            <motion.div key="bar" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }} className="absolute inset-0 px-4 sm:px-5 pb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesBarData} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} width={30} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(14,14,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, color: '#bbb' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        />
                                        <Bar dataKey="ventas" name="Ventas" fill={CHART_COLORS.orange} radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="propiedades" name="Propiedades" fill={CHART_COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>
                        )}

                        {/* Slide 1: Activity (Area Chart with period selector) */}
                        {chartSlide === 1 && (
                            <motion.div key={`area-${chartPeriod}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                                <p className="text-[9px] text-white/15 px-5 mb-1">{periodSub[chartPeriod]}</p>
                                <div className="flex-1 px-4 sm:px-5 pb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={activityChartData}>
                                            <defs>
                                                <linearGradient id="adminGradV" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={CHART_COLORS.orange} stopOpacity={0.25} />
                                                    <stop offset="100%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="adminGradP" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#fff" stopOpacity={0.12} />
                                                    <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="label" tick={{ fontSize: chartPeriod === 'daily' ? 7 : 9, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false}
                                                interval={chartPeriod === 'daily' ? 3 : chartPeriod === 'weekly' ? 1 : 0} />
                                            <YAxis hide />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(14,14,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, color: '#bbb' }}
                                                labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                            />
                                            <Area type="monotone" dataKey="ventas" name="Ventas" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#adminGradV)" dot={chartPeriod === 'daily' ? { r: 2, fill: CHART_COLORS.orange } : false} />
                                            <Area type="monotone" dataKey="propiedades" name="Propiedades" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} fill="url(#adminGradP)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}

                        {/* Slide 2: Property Distribution (Pie Chart) */}
                        {chartSlide === 2 && (
                            <motion.div key="pie" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }} className="absolute inset-0 px-4 sm:px-5 pb-4 flex items-center justify-center gap-8">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1 }]} cx="50%" cy="50%"
                                                innerRadius="45%" outerRadius="80%" dataKey="value" strokeWidth={0}
                                                animationBegin={0} animationDuration={800}>
                                                {(pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1 }]).map((_, idx) => (
                                                    <Cell key={idx} fill={pieData.length > 0 ? PIE_COLORS[idx % PIE_COLORS.length] : 'rgba(255,255,255,0.08)'} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-3">
                                    {(pieData.length > 0 ? pieData : []).map((d, idx) => (
                                        <div key={d.name} className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                                            <div>
                                                <p className="text-sm text-white/60 font-medium">{d.name}</p>
                                                <p className="text-xl font-bold text-white/85 tabular-nums">{d.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {pieData.length === 0 && (
                                        <p className="text-sm text-white/20">Sin propiedades aún</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Legend */}
                {chartSlide < 2 && (
                    <div className="flex justify-center gap-5 pb-3">
                        <span className="flex items-center gap-1.5 text-[9px] text-white/25">
                            <span className="w-2 h-2 rounded-full bg-accent-orange" />Ventas
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] text-white/25">
                            <span className="w-2 h-2 rounded-full" style={{ background: chartSlide === 0 ? CHART_COLORS.blue : 'rgba(255,255,255,0.4)' }} />Propiedades
                        </span>
                    </div>
                )}
            </motion.div>

            {/* ── TAB BAR ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg, rgba(20,20,25,0.8) 0%, rgba(12,12,18,0.95) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>

                <div className="flex gap-0 border-b border-white/[0.05] overflow-x-auto">
                    {([
                        ['overview', 'Resumen', CalendarDays],
                        ['sales', `Ventas${(metrics?.pendingVerifications ?? 0) > 0 ? ` · ${metrics!.pendingVerifications}` : ''}`, DollarSign],
                        ['properties', 'Propiedades', Home],
                        ['agents', 'Agentes', Award],
                    ] as const).map(([k, label, Icon]) => (
                        <button key={k} onClick={() => setActiveTab(k)}
                            className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 text-[10px] sm:text-xs font-medium tracking-wide uppercase whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === k ? 'border-accent-orange/70 text-white/90' : 'border-transparent text-white/25 hover:text-white/40'}`}>
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="p-4 sm:p-5 min-h-[300px]">

                    {/* ── OVERVIEW TAB ──────────────────────────── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Sales Period Cards */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    { label: 'Semana', ventas: metrics?.salesWeek ?? 0, props: metrics?.propsWeek ?? 0, icon: Clock },
                                    { label: 'Mes', ventas: metrics?.salesMonth ?? 0, props: metrics?.propsMonth ?? 0, icon: CalendarDays },
                                    { label: 'Año', ventas: metrics?.salesYear ?? 0, props: metrics?.propsYear ?? 0, icon: BarChart3 },
                                ].map((p, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                        <p.icon size={12} className="text-white/15 mb-2" />
                                        <p className="text-[8px] text-white/20 uppercase tracking-widest mb-2">{p.label}</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-lg font-bold text-accent-orange tabular-nums">{p.ventas}</span>
                                            <span className="text-[9px] text-white/15">ventas</span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 mt-0.5">
                                            <span className="text-sm font-semibold text-white/50 tabular-nums">{p.props}</span>
                                            <span className="text-[9px] text-white/15">props nuevas</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Quick Pending Preview */}
                            {pendingTxs.length > 0 && (
                                <div className="bg-yellow-500/[0.04] border border-yellow-500/10 rounded-xl p-3.5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={14} className="text-yellow-400/60" />
                                        <span className="text-[10px] text-yellow-400/50 uppercase tracking-widest font-medium">
                                            {pendingTxs.length} venta{pendingTxs.length !== 1 ? 's' : ''} por verificar
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {pendingTxs.slice(0, 3).map(tx => (
                                            <div key={tx.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                                                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                                    {tx.agent?.avatarUrl
                                                        ? <img src={tx.agent.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                                        : <span className="text-[9px] text-white/30 font-bold">{tx.agent?.name?.[0]}{tx.agent?.lastName?.[0]}</span>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white/50 truncate">{tx.agent?.name} · {tx.property?.ubicacion}</p>
                                                </div>
                                                <button onClick={() => handleVerifyTx(tx.id)} disabled={verifyingId === tx.id}
                                                    className="px-2.5 py-1 rounded-lg bg-accent-orange/10 text-accent-orange text-[10px] font-semibold hover:bg-accent-orange/20 transition-all disabled:opacity-40 flex-shrink-0">
                                                    {verifyingId === tx.id ? <Loader2 size={10} className="animate-spin" /> : 'Verificar'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {pendingTxs.length > 3 && (
                                        <button onClick={() => setActiveTab('sales')} className="text-[10px] text-yellow-400/40 mt-2 hover:text-yellow-400/60 transition-colors">
                                            Ver todas →
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Top 5 Agents */}
                            {topAgents.length > 0 && (
                                <div>
                                    <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3 font-medium">Top Agentes</p>
                                    <div className="space-y-1.5">
                                        {topAgents.slice(0, 5).map((a, idx) => (
                                            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.06] transition-all">
                                                <span className="text-[10px] text-white/15 w-4 text-right font-mono tabular-nums">{idx + 1}</span>
                                                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.05] flex items-center justify-center text-white/35 font-semibold text-[10px]">
                                                    {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" /> : `${a.name?.[0]}${a.lastName?.[0]}`}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white/60 font-medium truncate">{a.name} {a.lastName}</p>
                                                    {a.agency && <p className="text-[9px] text-white/15">{a.agency.name}</p>}
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className="text-[10px] text-white/25 tabular-nums">{a._count?.properties ?? 0} props</span>
                                                    <span className="text-[10px] text-white/25 tabular-nums">{a._count?.transactions ?? 0} ventas</span>
                                                    <span className="text-[10px] text-accent-orange/60 font-semibold tabular-nums">{a.points} pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SALES (PENDING TXs) TAB ──────────────── */}
                    {activeTab === 'sales' && (
                        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
                            {pendingTxs.length === 0 ? (
                                <div className="text-center py-14">
                                    <CheckCircle size={28} className="text-green-400/15 mx-auto mb-3" />
                                    <p className="text-sm text-white/30">Todas las ventas están verificadas</p>
                                    <p className="text-[10px] text-white/15 mt-1">Las nuevas ventas reportadas aparecerán aquí</p>
                                </div>
                            ) : (
                                pendingTxs.map(tx => (
                                    <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex-shrink-0 overflow-hidden">
                                                {tx.property?.images?.[0]?.url
                                                    ? <img src={tx.property.images[0].url} alt="" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Home size={16} className="text-white/10" /></div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white/70 truncate">{tx.property?.ubicacion || 'Sin ubicación'}</p>
                                                <p className="text-[10px] text-white/25 mt-0.5">Matrícula: {tx.property?.matricula}</p>
                                                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium capitalize ${tx.tipo === 'venta' ? 'bg-emerald-500/10 text-emerald-400/70' : tx.tipo === 'alquiler' ? 'bg-blue-500/10 text-blue-400/70' : 'bg-purple-500/10 text-purple-400/70'}`}>
                                                        {tx.tipo}
                                                    </span>
                                                    <span className="text-xs text-accent-orange/70 font-semibold">${Number(tx.property?.precio ?? 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                                    {tx.agent?.avatarUrl
                                                        ? <img src={tx.agent.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        : <span className="text-[8px] text-white/30 font-bold">{tx.agent?.name?.[0]}{tx.agent?.lastName?.[0]}</span>
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-[11px] text-white/50 font-medium">{tx.agent?.name} {tx.agent?.lastName}</p>
                                                    <p className="text-[9px] text-white/15">{tx.agent?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-white/15">{new Date(tx.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</span>
                                                <button onClick={() => handleVerifyTx(tx.id)} disabled={verifyingId === tx.id}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-orange/10 text-accent-orange text-[11px] font-semibold hover:bg-accent-orange/20 transition-all disabled:opacity-40">
                                                    {verifyingId === tx.id ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Verificar</>}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── PROPERTIES TAB ────────────────────────── */}
                    {activeTab === 'properties' && (
                        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
                            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3 font-medium">
                                Propiedades recientes · {pendingProps.length} encontradas
                            </p>
                            {pendingProps.length === 0 ? (
                                <div className="text-center py-14">
                                    <Home size={28} className="text-white/10 mx-auto mb-3" />
                                    <p className="text-sm text-white/30">Sin propiedades recientes</p>
                                </div>
                            ) : (
                                pendingProps.map((prop: any) => (
                                    <motion.div key={prop.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.07] transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex-shrink-0 overflow-hidden">
                                            {prop.images?.[0]?.url
                                                ? <img src={prop.images[0].url} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><Home size={14} className="text-white/10" /></div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white/60 truncate">{prop.ubicacion}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${prop.tipo === 'venta' ? 'bg-emerald-500/10 text-emerald-400/60' : prop.tipo === 'alquiler' ? 'bg-blue-500/10 text-blue-400/60' : 'bg-purple-500/10 text-purple-400/60'}`}>
                                                    {prop.tipo}
                                                </span>
                                                <span className="text-xs text-white/40 font-semibold tabular-nums">${Number(prop.precio).toLocaleString()}</span>
                                                <span className="text-[9px] text-white/15">{prop.matricula}</span>
                                            </div>
                                            {prop.agents?.[0]?.agent && (
                                                <p className="text-[9px] text-white/15 mt-0.5">
                                                    {prop.agents[0].agent.name} {prop.agents[0].agent.lastName}
                                                    {prop.agents[0].agent.agency?.name && ` · ${prop.agents[0].agent.agency.name}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-[9px] text-white/15">{new Date(prop.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}</p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── AGENTS TAB ────────────────────────────── */}
                    {activeTab === 'agents' && (
                        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
                            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-3 font-medium">
                                Ranking de agentes · {topAgents.length} totales
                            </p>
                            {topAgents.length === 0 ? (
                                <div className="text-center py-14">
                                    <Users size={28} className="text-white/10 mx-auto mb-3" />
                                    <p className="text-sm text-white/30">Sin agentes registrados</p>
                                </div>
                            ) : (
                                topAgents.map((a, idx) => (
                                    <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.07] transition-all">
                                        <span className={`text-xs w-6 text-center font-mono tabular-nums flex-shrink-0 ${idx < 3 ? 'text-accent-orange/60 font-bold' : 'text-white/15'}`}>
                                            {idx + 1}
                                        </span>
                                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.05] flex items-center justify-center text-white/35 font-semibold text-[10px]">
                                            {a.avatarUrl
                                                ? <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                : `${a.name?.[0]}${a.lastName?.[0]}`
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white/65 truncate">{a.name} {a.lastName}</p>
                                                {a.verified && <CheckCircle size={11} className="text-green-400/50 flex-shrink-0" />}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-white/20">{a.email}</span>
                                                {a.agency && <span className="text-[9px] text-accent-orange/30 font-medium">· {a.agency.name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                                            <div>
                                                <p className="text-sm font-bold text-white/60 tabular-nums">{a._count?.properties ?? 0}</p>
                                                <p className="text-[8px] text-white/15 uppercase">Props</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white/60 tabular-nums">{a._count?.transactions ?? 0}</p>
                                                <p className="text-[8px] text-white/15 uppercase">Ventas</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-accent-orange/70 tabular-nums">{a.points}</p>
                                                <p className="text-[8px] text-white/15 uppercase">Pts</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AdminProfilePage;
