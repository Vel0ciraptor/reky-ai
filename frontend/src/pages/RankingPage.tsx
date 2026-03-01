import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Award, TrendingUp, Loader2, Crown, Sparkles, Building2, Key, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

interface AgentRanking {
    rank: number;
    id: string;
    name: string;
    lastName: string;
    avatarUrl: string | null;
    points: number;
}

const medalStyle: Record<number, {
    bg: string;
    border: string;
    text: string;
    glow: string;
    icon: any;
    label: string;
    ring: string;
}> = {
    1: {
        bg: 'bg-gradient-to-t from-yellow-500/20 via-yellow-500/10 to-transparent',
        border: 'border-yellow-400/40',
        text: 'text-yellow-400',
        glow: 'shadow-[0_0_30px_rgba(250,204,21,0.25)]',
        icon: Crown,
        label: '1º LUGAR',
        ring: 'ring-4 ring-yellow-400/30 ring-offset-4 ring-offset-[#0A0A0A]'
    },
    2: {
        bg: 'bg-gradient-to-t from-slate-300/20 via-slate-300/10 to-transparent',
        border: 'border-slate-300/40',
        text: 'text-slate-300',
        glow: 'shadow-[0_0_25px_rgba(203,213,225,0.15)]',
        icon: Medal,
        label: '2º LUGAR',
        ring: 'ring-4 ring-slate-300/30 ring-offset-4 ring-offset-[#0A0A0A]'
    },
    3: {
        bg: 'bg-gradient-to-t from-amber-700/30 via-amber-700/10 to-transparent',
        border: 'border-amber-600/40',
        text: 'text-amber-500',
        glow: 'shadow-[0_0_25px_rgba(217,119,6,0.15)]',
        icon: Award,
        label: '3º LUGAR',
        ring: 'ring-4 ring-amber-600/30 ring-offset-4 ring-offset-[#0A0A0A]'
    },
};

const getInitials = (n: string, l: string) => `${n?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

const RankingPage = () => {
    const { data: leaderboard = [], isLoading } = useQuery<AgentRanking[]>({
        queryKey: ['ranking'],
        queryFn: async () => {
            const r = await api.get('/ranking');
            return r.data;
        },
    });

    const firstPlace = leaderboard.find(a => a.rank === 1);
    const secondPlace = leaderboard.find(a => a.rank === 2);
    const thirdPlace = leaderboard.find(a => a.rank === 3);
    const top3 = [secondPlace, firstPlace, thirdPlace]; // 2, 1, 3 for podium layout

    const rest = leaderboard.filter(a => a.rank > 3);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[80vh]">
                <Loader2 size={40} className="text-accent-orange animate-spin mb-6" />
                <p className="text-gray-400 font-medium tracking-wide">Actualizando posiciones...</p>
            </div>
        );
    }

    if (!leaderboard.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Trophy size={48} className="text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">La cima está vacía</h3>
                <p className="text-gray-400 max-w-md">El ranking está esperando a sus primeros líderes. Publica propiedades y cierra tratos para aparecer aquí.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 pb-24">
            {/* Header Section */}
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-accent-orange/10 blur-[100px] -z-10 rounded-full" />
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-sm font-semibold mb-6 uppercase tracking-widest"
                >
                    <Sparkles size={16} />
                    Ranking Global
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight"
                >
                    Top Agentes
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg"
                >
                    Los profesionales más destacados de la plataforma, compitiendo por la excelencia en bienes raíces.
                </motion.p>
            </div>

            {/* Podium Section */}
            <div className="flex justify-center items-end gap-2 sm:gap-6 mb-20 px-2 mt-24">
                {top3.map((agent, index) => {
                    const positions = [2, 1, 3];
                    const realRank = positions[index];
                    const style = medalStyle[realRank];

                    if (!agent) {
                        return <div key={`empty-${index}`} className="w-1/3 max-w-[200px]" />;
                    }

                    // Adjust heights and sizing based on rank
                    const isFirst = realRank === 1;
                    const heightClass = isFirst ? 'h-64 sm:h-80' : realRank === 2 ? 'h-48 sm:h-60' : 'h-40 sm:h-52';
                    const avatarSize = isFirst ? 'w-24 h-24 sm:w-32 sm:h-32' : 'w-16 h-16 sm:w-20 sm:h-20';
                    const Icon = style.icon;

                    return (
                        <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.15 + 0.3, type: "spring", stiffness: 100 }}
                            className={`w-[30%] sm:w-1/3 max-w-[240px] flex flex-col items-center relative ${isFirst ? 'z-10 -mx-2 sm:-mx-4' : 'z-0'}`}
                        >
                            {/* Avatar & Badge */}
                            <div className="absolute -top-16 sm:-top-20 flex flex-col items-center z-20">
                                {isFirst && (
                                    <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.8, type: "spring" }}
                                    >
                                        <Crown size={32} className="text-yellow-400 mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                    </motion.div>
                                )}

                                <div className={`relative ${style.ring} rounded-full bg-[#111] p-1`}>
                                    {agent.avatarUrl ? (
                                        <img src={agent.avatarUrl} alt="" className={`${avatarSize} rounded-full object-cover`} />
                                    ) : (
                                        <div className={`${avatarSize} rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold ${style.text}`}>
                                            {getInitials(agent.name, agent.lastName)}
                                        </div>
                                    )}
                                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#111] border-2 ${style.border} flex items-center justify-center text-sm font-bold ${style.text} z-10`}>
                                        {realRank}
                                    </div>
                                </div>

                                <div className="mt-6 text-center w-full px-2">
                                    <h3 className={`font-bold text-[13px] sm:text-base ${isFirst ? 'text-white' : 'text-gray-200'} truncate w-full`}>
                                        {agent.name} {agent.lastName}
                                    </h3>
                                    <p className={`font-black text-lg sm:text-2xl mt-1 tracking-tight ${style.text} drop-shadow-md`}>
                                        {agent.points.toLocaleString()} <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70">pts</span>
                                    </p>
                                </div>
                            </div>

                            {/* Pedestal Base */}
                            <div className={`w-full ${heightClass} ${style.bg} border-t border-l border-r ${style.border} rounded-t-2xl sm:rounded-t-3xl relative overflow-hidden backdrop-blur-sm ${style.glow}`}>
                                {/* Reflection effect */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50" />
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                                <div className="absolute bottom-4 sm:bottom-8 w-full flex flex-col items-center justify-center opacity-60">
                                    <Icon size={isFirst ? 48 : 32} className={`${style.text} mb-2 opacity-50`} />
                                    <span className={`text-[10px] sm:text-xs font-bold tracking-[0.2em] ${style.text}`}>
                                        {style.label}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* List Ranking (Positions 4+) */}
            {rest.length > 0 && (
                <div className="mb-20">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Star className="text-gray-400" size={20} />
                        Clasificación General
                    </h2>
                    <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-[3rem_1fr_5rem] sm:grid-cols-[5rem_1fr_8rem] text-xs font-semibold text-gray-500 uppercase tracking-widest px-4 sm:px-8 py-4 bg-white/[0.02] border-b border-white/5">
                            <span className="text-center">Pos</span>
                            <span>Profesional</span>
                            <span className="text-right">Puntuación</span>
                        </div>
                        <div className="flex flex-col">
                            {rest.map((agent, i) => (
                                <motion.div
                                    key={agent.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 + 0.5 }}
                                    className="grid grid-cols-[3rem_1fr_5rem] sm:grid-cols-[5rem_1fr_8rem] items-center px-4 sm:px-8 py-5 border-b border-white/5 hover:bg-white/[0.03] transition-colors group"
                                >
                                    <span className="text-gray-500 font-mono font-bold text-center text-sm sm:text-base group-hover:text-white transition-colors">
                                        {agent.rank}
                                    </span>
                                    <div className="flex items-center gap-4 min-w-0">
                                        {agent.avatarUrl ? (
                                            <img src={agent.avatarUrl} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-full flex items-center justify-center text-sm font-bold text-gray-300 border border-white/10">
                                                {getInitials(agent.name, agent.lastName)}
                                            </div>
                                        )}
                                        <div className="block truncate">
                                            <p className="font-semibold text-gray-200 text-sm sm:text-base truncate group-hover:text-white transition-colors">
                                                {agent.name} {agent.lastName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-accent-orange text-base sm:text-lg">
                                            {agent.points.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-gray-500 ml-1 hidden sm:inline">pts</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Rules / How points work */}
            <div className="mt-16">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-white mb-2">Sistema de Puntuación</h2>
                    <p className="text-gray-400">¿Cómo escalar posiciones en el ranking?</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {[
                        { icon: Star, label: 'Publicar Propiedad', pts: '+5', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                        { icon: Key, label: 'Alquiler Cerrado', pts: '+20', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
                        { icon: Building2, label: 'Anticrético', pts: '+30', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { icon: TrendingUp, label: 'Venta Concretada', pts: '+50', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
                    ].map((p, i) => (
                        <motion.div
                            key={p.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 + 0.6 }}
                            className={`flex flex-col items-center text-center p-6 rounded-2xl border ${p.border} ${p.bg} backdrop-blur-sm`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#111] mb-4 shadow-inner border border-white/5`}>
                                <p.icon size={20} className={p.color} />
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 font-medium mb-3 h-10 flex items-center justify-center">
                                {p.label}
                            </p>
                            <div className="mt-auto">
                                <span className={`text-2xl sm:text-3xl font-black ${p.color} drop-shadow-sm`}>
                                    {p.pts}
                                </span>
                                <span className={`text-xs font-bold ml-1 ${p.color} opacity-70`}>PTS</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RankingPage;
