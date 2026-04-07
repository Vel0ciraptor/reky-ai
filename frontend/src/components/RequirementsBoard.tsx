import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Clock, DollarSign, X,
    CheckCircle2, Loader2,
    Bed, MapPin, ChevronDown, ChevronUp, Bell, Target, Star, List
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';

type Requerimiento = {
    id: string;
    titulo: string;
    tipoOperacion: 'compra' | 'alquiler';
    tipoPropiedad: 'casa' | 'departamento' | 'lote';
    presupuestoMin: number;
    presupuestoMax: number;
    zona: string;
    habitaciones: number;
    descripcion: string;
    estado: string;
    prioridad: 'alta' | 'media' | 'baja';
    createdAt: string;
    matches: Match[];
};

type Match = {
    id: string;
    captadorId: string;
    requerimientoId: string;
    scoreMatch: number;
    estado: string;
    notas: string | null;
    createdAt: string;
    captador: {
        id: string;
        nombre: string;
        telefono: string;
        zonaTrabajo: string;
        tipo: string;
        rating: number;
    };
};

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
}

function getScoreLabel(score: number) {
    if (score >= 80) return 'Match Fuerte';
    if (score >= 50) return 'Match Viable';
    return 'No relevante';
}

function MatchCard({ match, onNotify }: { match: Match; onNotify: (id: string) => void }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-glass-border hover:border-accent-orange/20 transition-all">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${getScoreColor(match.scoreMatch)}`}>
                    {match.scoreMatch}%
                </div>
                <div>
                    <h5 className="text-sm font-semibold">{match.captador.nombre}</h5>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Target size={10} /> {getScoreLabel(match.scoreMatch)} • {match.captador.tipo}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-accent-orange bg-accent-orange/10 px-2 py-1 rounded-lg text-[10px]">
                    <Star size={10} fill="currentColor" /> {Number(match.captador.rating).toFixed(1)}
                </div>
                <button 
                    onClick={() => onNotify(match.id)}
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                    title="Notificar captador"
                >
                    <Bell size={14} />
                </button>
            </div>
        </div>
    );
}

function ReqCard({ req, onRefresh }: { req: Requerimiento; onRefresh: () => void }) {
    const [expanded, setExpanded] = useState(false);

    const handleNotify = async (matchId: string) => {
        try {
            await api.patch(`/matching/matches/${matchId}/status`, { estado: 'contactado' });
            // Simulation of notification
            setTimeout(() => {
                onRefresh();
            }, 1000);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div layout className="glass-card border border-glass-border hover:border-accent-orange/30 transition-all overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg text-white">{req.titulo}</h4>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                req.prioridad === 'alta' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                                req.prioridad === 'media' ? 'border-accent-orange/50 text-accent-orange bg-accent-orange/10' :
                                'border-blue-500/50 text-blue-400 bg-blue-500/10'
                            }`}>
                                {req.prioridad}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={11} /> Publicado el {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={() => setExpanded(!expanded)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-accent-orange/20 text-accent-orange px-3 py-1 rounded-full font-medium border border-accent-orange/30 uppercase">
                        {req.tipoOperacion}
                    </span>
                    <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full border border-glass-border capitalize">
                        🏠 {req.tipoPropiedad}
                    </span>
                    <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full border border-glass-border flex items-center gap-1">
                        <MapPin size={10} /> {req.zona}
                    </span>
                </div>

                <p className="text-sm text-gray-400 italic line-clamp-2">"{req.descripcion}"</p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-600 uppercase">Presupuesto</span>
                        <span className="text-sm font-semibold flex items-center gap-1">
                            <DollarSign size={12} className="text-accent-orange" />
                            {Number(req.presupuestoMin).toLocaleString()} - {Number(req.presupuestoMax).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-600 uppercase">Características</span>
                        <span className="text-sm font-semibold flex items-center gap-1">
                            <Bed size={12} className="text-accent-orange" />
                            {req.habitaciones} Hab.
                        </span>
                    </div>
                </div>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-4 border-t border-glass-border/50 pt-4 mt-2"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs font-bold uppercase tracking-widest text-gray-500">Match con Captadores ({req.matches.length})</h5>
                                <div className="text-[10px] text-gray-600">Actualizado automáticamente</div>
                            </div>

                            <div className="flex flex-col gap-2">
                                {req.matches.length > 0 ? (
                                    req.matches.map(m => (
                                        <MatchCard key={m.id} match={m} onNotify={handleNotify} />
                                    ))
                                ) : (
                                    <div className="text-center py-6 border border-dashed border-glass-border rounded-xl">
                                        <Target size={24} className="mx-auto text-gray-700 mb-2 opacity-20" />
                                        <p className="text-xs text-gray-600">Buscando captadores compatibles...</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function CreateRequirementForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
    const { register, handleSubmit } = useForm({
        defaultValues: {
            titulo: '',
            tipoOperacion: 'compra',
            tipoPropiedad: 'casa',
            presupuestoMin: 0,
            presupuestoMax: 500000,
            zona: '',
            habitaciones: 1,
            descripcion: '',
            prioridad: 'media'
        }
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            await api.post('/matching/requerimientos', data);
            onSuccess();
        } catch (e: any) {
            console.error(e);
            alert('Error creating requirement');
        } finally { setIsSubmitting(false); }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="glass-card border-l-4 border-l-accent-orange p-6 flex flex-col gap-6 mb-8 shadow-2xl">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2"><Plus size={20} className="text-accent-orange" /> Nuevo Requerimiento</h3>
                <button type="button" onClick={onCancel} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Título del Requerimiento</label>
                        <input {...register('titulo', { required: true })} placeholder="Ej: Departamento en Equipetrol" className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Operación</label>
                            <select {...register('tipoOperacion')} className="w-full bg-bg-dark border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none capitalize">
                                <option value="compra">Compra</option>
                                <option value="alquiler">Alquiler</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Propiedad</label>
                            <select {...register('tipoPropiedad')} className="w-full bg-bg-dark border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none capitalize">
                                <option value="casa">Casa</option>
                                <option value="departamento">Departamento</option>
                                <option value="lote">Lote</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Zona / Ubicación</label>
                        <input {...register('zona', { required: true })} placeholder="Equipetrol, Zona Norte, etc." className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Presupuesto Máx (USD)</label>
                            <input type="number" {...register('presupuestoMax', { required: true })} className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Habitaciones</label>
                            <input type="number" {...register('habitaciones', { required: true })} className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Descripción Detallada</label>
                <textarea {...register('descripcion', { required: true })} rows={3} placeholder="Describa detalles específicos..." className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange outline-none resize-none" />
            </div>

            <div className="flex justify-between items-center border-t border-glass-border/50 pt-6">
                <div>
                   <label className="text-xs font-bold uppercase text-gray-500 mr-4">Prioridad:</label>
                   {['baja', 'media', 'alta'].map(p => (
                       <label key={p} className="inline-flex items-center mr-4 cursor-pointer">
                           <input type="radio" {...register('prioridad')} value={p} className="hidden peer" />
                           <span className="px-3 py-1 rounded-full border border-glass-border text-[10px] uppercase peer-checked:bg-accent-orange peer-checked:border-accent-orange peer-checked:text-white transition-all">
                               {p}
                           </span>
                       </label>
                   ))}
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="px-6 py-3 text-sm text-gray-400 hover:text-white transition-all">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Publicar Requerimiento
                    </button>
                </div>
            </div>
        </form>
    );
}

function MatchListView({ requirements, onContact }: { requirements: Requerimiento[]; onContact: (agentId: string) => void }) {
    const allMatches = requirements.flatMap(r => r.matches);
    const fuerteMatches = allMatches.filter(m => m.scoreMatch >= 80);
    const sortedMatches = [...fuerteMatches].sort((a, b) => b.scoreMatch - a.scoreMatch);

    if (sortedMatches.length === 0) {
        return (
            <div className="text-center py-20 glass-card border-dashed border-glass-border">
                <Target size={40} className="mx-auto text-gray-700 mb-4 opacity-20" />
                <p className="text-gray-500">No tienes matches fuertes (al menos 80%) en este momento.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                <Target size={14} className="text-green-400" /> Matches de Alta Compatibilidad (80%+)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedMatches.map(m => (
                    <div key={m.id} className="glass-card p-4 border border-glass-border flex flex-col gap-3 hover:border-green-500/20 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border ${getScoreColor(m.scoreMatch)}`}>
                                    {m.scoreMatch}%
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{m.captador.nombre}</h4>
                                    <p className="text-[11px] text-gray-500">{m.captador.tipo} • {m.captador.zonaTrabajo}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-accent-orange text-xs font-bold bg-accent-orange/10 px-2 py-1 rounded-lg border border-accent-orange/20">
                                <Star size={12} fill="currentColor" /> {Number(m.captador.rating).toFixed(1)}
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-glass-border line-clamp-1">
                            {requirements.find(r => r.id === m.requerimientoId)?.titulo}
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => onContact(m.captador.id)}
                                className="flex-1 bg-accent-orange text-white py-2 rounded-lg text-xs font-bold hover:bg-accent-light transition-all flex items-center justify-center gap-2"
                             >
                                 <Bell size={14} /> Contactar
                             </button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SuggestionsView({ requirements }: { requirements: Requerimiento[] }) {
    const allMatches = requirements.flatMap(r => r.matches);
    const viableMatches = allMatches.filter(m => m.scoreMatch >= 50 && m.scoreMatch < 80);
    const sorted = [...viableMatches].sort((a, b) => b.scoreMatch - a.scoreMatch);

    return (
        <div className="flex flex-col gap-6">
            <div className="glass-card p-6 border border-glass-border bg-gradient-to-br from-blue-500/5 to-transparent">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                        <Star size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Sugerencias Viables</h2>
                        <p className="text-gray-500 text-xs">Captadores con puntaje entre 50% y 79% que podrían ser interesantes.</p>
                    </div>
                </div>
            </div>

            {sorted.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sorted.map(m => (
                        <div key={m.id} className="glass-card p-4 border border-glass-border flex flex-col gap-3 hover:border-blue-500/20 transition-all">
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border ${getScoreColor(m.scoreMatch)}`}>
                                        {m.scoreMatch}%
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{m.captador.nombre}</h4>
                                        <p className="text-[11px] text-gray-500">{m.captador.tipo}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    Viable
                                </div>
                            </div>
                            <div className="mt-1 text-[11px] text-gray-400 italic">
                                "{m.notas || 'Buen match por ubicación geográfica.'}"
                            </div>
                            <button className="w-full bg-white/5 text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 py-2 rounded-lg text-xs font-bold transition-all">
                                Explorar sugerencia
                            </button>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="text-center py-20 border border-dashed border-glass-border rounded-2xl">
                    <p className="text-gray-500 text-sm">No hay sugerencias viables en este rango (50-79%) aún.</p>
                </div>
            )}
        </div>
    );
}

export default function RequirementsBoard() {
    const navigate = useNavigate();
    const [requirements, setRequirements] = useState<Requerimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'requerimientos' | 'matches' | 'sugerencias'>('requerimientos');

    const fetchRequirements = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/matching/requerimientos');
            setRequirements(data);
        } catch (error) {
            console.error('Error fetching requirements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequirements(); }, []);

    return (
        <div className="flex flex-col w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
                <div className="flex-1">
                    <h1 className="text-3xl font-extrabold text-white mb-2">Muro de Requerimientos</h1>
                    <p className="text-gray-500 text-sm">Gestiona tus necesidades y encuentra captadores automáticamente.</p>
                    
                    <div className="flex gap-2 mt-6 p-1 bg-white/5 rounded-xl border border-glass-border w-fit">
                        {[
                            { id: 'requerimientos', label: 'Mis Requerimientos', icon: List },
                            { id: 'matches', label: 'Mis Matches', icon: Target },
                            { id: 'sugerencias', label: 'Sugerencias', icon: Star }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                                {tab.id === 'requerimientos' && requirements.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>
                                        {requirements.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <CreateRequirementForm onSuccess={() => { setShowForm(false); fetchRequirements(); }} onCancel={() => setShowForm(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 size={40} className="animate-spin text-accent-orange" />
                    <p className="text-gray-500 animate-pulse">Analizando mercado...</p>
                </div>
            ) : activeTab === 'requerimientos' ? (
                requirements.length === 0 ? (
                    <div className="glass-card p-16 text-center flex flex-col items-center border border-dashed border-glass-border">
                        <Target size={48} className="text-gray-700 mb-6" />
                        <h3 className="text-lg font-bold text-gray-400 mb-2">No tienes requerimientos activos</h3>
                        <p className="text-gray-600 text-sm max-w-xs mb-8">Publica lo que tus clientes buscan para que Reky encuentre los mejores captadores.</p>
                        <button onClick={() => setShowForm(true)} className="btn-primary py-3 px-8 text-sm flex gap-2 items-center"><Plus size={18} />Publicar primer requerimiento</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 pb-24">
                        {requirements.map(req => (
                            <ReqCard key={req.id} req={req} onRefresh={fetchRequirements} />
                        ))}
                    </div>
                )
            ) : activeTab === 'matches' ? (
                <MatchListView requirements={requirements} onContact={(id) => navigate(`/chat?agent=${id}`)} />
            ) : (
                <SuggestionsView requirements={requirements} />
            )}

            {/* FAB Button */}
            <button
                onClick={() => setShowForm(true)}
                className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-accent-orange rounded-full flex items-center justify-center shadow-2xl shadow-accent-orange/40 hover:scale-110 active:scale-95 transition-transform"
            >
                <Plus size={28} className="text-white" />
            </button>
        </div>
    );
}
