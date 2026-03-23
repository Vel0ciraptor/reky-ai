import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, MessageCircle, Clock, DollarSign, X,
    CheckCircle2, User, Loader2, Tag, Car, Waves, Wind,
    Bed, Bath, MapPin, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

type PropertyType = 'venta' | 'alquiler' | 'anticretico';

type Requirement = {
    id: string;
    agentId: string;
    propertyType: string | null;
    tipoVivienda: string | null;
    ubicacion: string | null;
    minBudget: string | null;
    maxBudget: string | null;
    dormitorios: number | null;
    banos: number | null;
    estacionamiento: boolean | null;
    patio: boolean | null;
    piscina: boolean | null;
    mascotas: boolean | null;
    terreno: number | null;
    construccion: number | null;
    tiempoAlquiler: number | null;
    tiempoAnticretico: number | null;
    tags: string[];
    description: string;
    createdAt: string;
    agent: {
        id: string;
        name: string;
        lastName: string;
        avatarUrl: string | null;
    };
};

const SUGGESTED_TAGS = [
    'Vista panorámica', 'Cerca del centro', 'Zona exclusiva', 'Recién remodelado',
    'Piscina compartida', 'Condominio cerrado', 'A estrenar', 'Inversión', 'Duplex',
    'Planta baja', 'Último piso', 'Jardín propio', 'Amueblado', 'Semi-amueblado',
];

function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    for (const [div, label] of [[31536000, 'año'], [2592000, 'mes'], [86400, 'día'], [3600, 'hora'], [60, 'minuto']] as [number, string][]) {
        const v = Math.floor(seconds / div);
        if (v >= 1) return `${v} ${label}${v > 1 ? (label === 'mes' ? 'es' : 's') : ''}`;
    }
    return 'justo ahora';
}

function ReqCard({ req, isOwn, onDelete, onChat, currentUserId }: {
    req: Requirement; isOwn: boolean; onDelete: (id: string) => void;
    onChat: (agentId: string) => void; currentUserId: string;
}) {
    const [expanded, setExpanded] = useState(false);

    const boolFeature = (v: boolean | null, icon: React.ReactNode, label: string) =>
        v ? <span className="flex items-center gap-1 text-xs bg-white/10 px-2.5 py-1 rounded-full">{icon}<span>{label}</span></span> : null;

    return (
        <motion.div
            layout
            className="glass-card border border-glass-border hover:border-accent-orange/30 transition-all overflow-hidden"
        >
            <div className="p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {req.agent.avatarUrl ? (
                            <img src={req.agent.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-glass-border" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 border border-glass-border">
                                <User size={18} />
                            </div>
                        )}
                        <div>
                            <h4 className="font-semibold text-sm">{req.agent.name} {req.agent.lastName}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={11} /> Hace {timeAgo(req.createdAt)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOwn && (
                            <button onClick={() => onDelete(req.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button onClick={() => setExpanded(p => !p)} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-lg transition-colors">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-300 leading-relaxed font-medium italic">"{req.description}"</p>

                {/* Key chips row */}
                <div className="flex flex-wrap items-center gap-2">
                    {req.propertyType && (
                        <span className="text-xs bg-accent-orange/15 text-accent-orange border border-accent-orange/30 px-3 py-1 rounded-full capitalize font-medium">
                            {req.propertyType}
                        </span>
                    )}
                    {req.tipoVivienda && req.tipoVivienda !== 'Cualquiera' && (
                        <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full">🏠 {req.tipoVivienda}</span>
                    )}
                    {req.ubicacion && (
                        <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <MapPin size={10} /> {req.ubicacion}
                        </span>
                    )}
                    {(req.minBudget || req.maxBudget) && (
                        <span className="text-xs text-accent-orange font-semibold flex items-center gap-1">
                            <DollarSign size={12} />
                            {req.minBudget ? `${req.minBudget}` : '0'}
                            {' – '}
                            {req.maxBudget ? `${req.maxBudget}` : '∞'}
                        </span>
                    )}
                    {req.dormitorios != null && <span className="flex items-center gap-1 text-xs bg-white/10 px-2.5 py-1 rounded-full"><Bed size={11} /> {req.dormitorios} dorm.</span>}
                    {req.banos != null && <span className="flex items-center gap-1 text-xs bg-white/10 px-2.5 py-1 rounded-full"><Bath size={11} /> {req.banos} baños</span>}
                    {boolFeature(req.estacionamiento, <Car size={10} />, 'Parking')}
                    {boolFeature(req.piscina, <Waves size={10} />, 'Piscina')}
                    {boolFeature(req.patio, <Wind size={10} />, 'Patio')}
                    {boolFeature(req.mascotas, <span>🐾</span>, 'Mascotas')}
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-3 border-t border-glass-border/50 pt-3"
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-400">
                                {req.terreno != null && <div className="bg-white/5 rounded-lg p-2.5"><span className="text-gray-600 block mb-0.5">Terreno</span><span className="text-white font-medium">{req.terreno} m²</span></div>}
                                {req.construccion != null && <div className="bg-white/5 rounded-lg p-2.5"><span className="text-gray-600 block mb-0.5">Construcción</span><span className="text-white font-medium">{req.construccion} m²</span></div>}
                                {req.tiempoAlquiler != null && <div className="bg-white/5 rounded-lg p-2.5"><span className="text-gray-600 block mb-0.5">Duración alquiler</span><span className="text-white font-medium">{req.tiempoAlquiler} meses</span></div>}
                                {req.tiempoAnticretico != null && <div className="bg-white/5 rounded-lg p-2.5"><span className="text-gray-600 block mb-0.5">Anticrético</span><span className="text-white font-medium">{req.tiempoAnticretico} años</span></div>}
                            </div>
                            {req.tags && req.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {req.tags.map(t => (
                                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-glass-border text-gray-400">#{t}</span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                {req.agentId !== currentUserId && (
                    <div className="flex justify-end pt-1 border-t border-glass-border/50">
                        <button onClick={() => onChat(req.agentId)} className="text-xs font-semibold px-4 py-2 bg-accent-orange/15 text-accent-orange hover:bg-accent-orange hover:text-white rounded-lg transition-all flex items-center gap-1.5">
                            <MessageCircle size={13} /> Contactar agente
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}


// ─────────────────────────────────────────────
// Full Requirement Form
// ─────────────────────────────────────────────
function CreateRequirementForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            propertyType: '' as PropertyType | '',
            tipoVivienda: '',
            ubicacion: '',
            minBudget: '' as any,
            maxBudget: '' as any,
            dormitorios: '' as any,
            banos: '' as any,
            estacionamiento: false,
            patio: false,
            piscina: false,
            mascotas: false,
            terreno: '' as any,
            construccion: '' as any,
            tiempoAlquiler: '' as any,
            tiempoAnticretico: '' as any,
            description: '',
        }
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const selectedType = watch('propertyType');

    const addTag = (tag: string) => {
        const clean = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (clean && !tags.includes(clean) && tags.length < 10) setTags(p => [...p, clean]);
        setTagInput(''); setShowSuggestions(false);
    };
    const removeTag = (t: string) => setTags(p => p.filter(x => x !== t));
    const filteredSugs = SUGGESTED_TAGS.filter(s =>
        s.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(s.toLowerCase().replace(/\s+/g, '-'))
    );

    const onSubmit = async (raw: any) => {
        setIsSubmitting(true);
        try {
            const data: any = { ...raw, tags };
            // Clean up empty / NaN optional numbers
            (['minBudget', 'maxBudget', 'dormitorios', 'banos', 'terreno', 'construccion', 'tiempoAlquiler', 'tiempoAnticretico'] as const)
                .forEach(k => {
                    const v = Number(data[k]);
                    if (!data[k] || isNaN(v)) delete data[k]; else data[k] = v;
                });
            if (!data.propertyType) delete data.propertyType;
            if (!data.tipoVivienda) delete data.tipoVivienda;
            if (!data.ubicacion) delete data.ubicacion;

            await api.post('/requirements', data);
            onSuccess();
        } catch (e: any) {
            console.error(e);
            alert('Error: ' + (e.response?.data?.message || 'Error de conexión'));
        } finally { setIsSubmitting(false); }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="glass-card border-l-4 border-l-accent-orange p-5 flex flex-col gap-5 mb-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2"><Search size={16} className="text-accent-orange" /> Crear Pedido de Propiedad</h3>
                <button type="button" onClick={onCancel} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            {/* DESCRIPTION */}
            <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">¿Qué necesitas? <span className="text-accent-orange">*</span></label>
                <textarea
                    {...register('description', { required: 'Describe lo que buscas' })}
                    placeholder="Ej: Busco casa con piscina para cliente con buena garantía, zona norte..."
                    className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange focus:outline-none text-sm resize-none"
                    rows={3}
                />
                {errors.description && <span className="text-red-400 text-xs mt-1">{(errors.description as any).message}</span>}
            </div>

            {/* TYPE + VIVIENDA */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-500 mb-2 block">Tipo</label>
                    <div className="flex flex-col gap-1.5">
                        {(['venta', 'alquiler', 'anticretico'] as PropertyType[]).map(t => (
                            <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all text-sm ${selectedType === t ? 'border-accent-orange bg-accent-orange/10 text-white' : 'border-glass-border text-gray-500'}`}>
                                <input {...register('propertyType')} type="radio" value={t} className="hidden" />
                                <span className="capitalize">{t}</span>
                            </label>
                        ))}
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all text-sm ${selectedType === '' ? 'border-accent-orange bg-accent-orange/10 text-white' : 'border-glass-border text-gray-500'}`}>
                            <input {...register('propertyType')} type="radio" value="" className="hidden" />
                            <span>Cualquiera</span>
                        </label>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">🏠 Tipo Vivienda</label>
                        <select {...register('tipoVivienda')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm text-white/80">
                            <option value="" style={{ backgroundColor: '#0e0e14' }}>Cualquiera</option>
                            {['Casa en condominio', 'Casa de campo', 'Casa en ciudad', 'Casa a las afueras'].map(v =>
                                <option key={v} value={v} style={{ backgroundColor: '#0e0e14' }}>{v}</option>
                            )}
                        </select>
                    </div>

                    {/* Duration fields */}
                    <AnimatePresence>
                        {selectedType === 'alquiler' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label className="text-xs text-gray-500 mb-1.5 block">⏱ Duración alquiler (meses)</label>
                                <input type="number" {...register('tiempoAlquiler')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                            </motion.div>
                        )}
                        {selectedType === 'anticretico' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label className="text-xs text-gray-500 mb-1.5 block">⏱ Duración anticrético (años)</label>
                                <input type="number" {...register('tiempoAnticretico')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* LOCATION */}
            <div>
                <label className="text-xs text-gray-500 mb-1.5 block"><MapPin size={11} className="inline mr-1" />Zona / Ubicación</label>
                <input {...register('ubicacion')} placeholder="Ej: Zona Norte, Plan 3000, Radial 27..." className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:border-accent-orange focus:outline-none text-sm" />
            </div>

            {/* BUDGET */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1 block"><DollarSign size={11} />Precio Mín.</label>
                    <input type="number" {...register('minBudget')} placeholder="0" className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:border-accent-orange focus:outline-none text-sm" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1 block"><DollarSign size={11} />Precio Máx.</label>
                    <input type="number" {...register('maxBudget')} placeholder="Sin límite" className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:border-accent-orange focus:outline-none text-sm" />
                </div>
            </div>

            {/* CHARACTERISTICS */}
            <div className="glass-card p-4 border border-glass-border/50 flex flex-col gap-3">
                <p className="text-xs uppercase tracking-widest text-gray-500">Características deseadas</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Bed size={11} /> Dormitorios</label>
                        <input type="number" min="0" {...register('dormitorios')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 flex items-center gap-1"><Bath size={11} /> Baños</label>
                        <input type="number" min="0" {...register('banos')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { field: 'estacionamiento', icon: <Car size={16} />, label: 'Parking' },
                        { field: 'patio', icon: <Wind size={16} />, label: 'Patio' },
                        { field: 'piscina', icon: <Waves size={16} />, label: 'Piscina' },
                        { field: 'mascotas', icon: <span className="text-sm">🐾</span>, label: 'Mascotas' },
                    ].map(({ field, icon, label }) => {
                        const val = watch(field as any);
                        return (
                            <label key={field} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${val ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'border-glass-border text-gray-600 hover:border-gray-500'}`}>
                                <input type="checkbox" {...register(field as any)} className="hidden" />
                                {icon}{label}
                            </label>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">📐 Terreno mín. (m²)</label>
                        <input type="number" step="0.01" {...register('terreno')} placeholder="Ej: 200" className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">🏗️ Construcción mín. (m²)</label>
                        <input type="number" step="0.01" {...register('construccion')} placeholder="Ej: 100" className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                    </div>
                </div>
            </div>

            {/* TAGS */}
            <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-2">
                    <Tag size={12} /> Etiquetas <span className="text-gray-600 normal-case font-normal tracking-normal">(max. 10)</span>
                </label>
                <div className={`flex flex-wrap gap-2 p-3 rounded-xl border min-h-[44px] bg-white/3 transition-all ${tags.length > 0 ? 'border-accent-orange/30' : 'border-glass-border'}`}>
                    {tags.map(t => (
                        <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent-orange/15 text-accent-orange border border-accent-orange/30">
                            #{t}
                            <button type="button" onClick={() => removeTag(t)} className="hover:text-white ml-0.5"><X size={10} /></button>
                        </span>
                    ))}
                    {tags.length < 10 && (
                        <input
                            value={tagInput}
                            onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }}
                            onKeyDown={e => {
                                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) { e.preventDefault(); addTag(tagInput); }
                                if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1]);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            placeholder="Escribe y presiona Enter..."
                            className="bg-transparent text-sm focus:outline-none flex-1 min-w-[130px] py-0.5 text-white placeholder:text-gray-700"
                        />
                    )}
                </div>
                <AnimatePresence>
                    {showSuggestions && filteredSugs.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 p-2 rounded-xl border border-glass-border bg-bg-card shadow-xl flex flex-wrap gap-1.5">
                            {filteredSugs.slice(0, 8).map(s => (
                                <button key={s} type="button" onClick={() => addTag(s)} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange transition-all">
                                    + {s}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-white transition-colors px-4 py-2.5">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary py-2 px-6 text-sm flex gap-2 items-center">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Publicar Pedido
                </button>
            </div>
        </form>
    );
}


// ─────────────────────────────────────────────
// Main Board Component
// ─────────────────────────────────────────────
export default function RequirementsBoard() {
    const { agent: currentUser } = useAuth();
    const navigate = useNavigate();
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

    const fetchRequirements = async () => {
        setLoading(true);
        try {
            const url = viewMode === 'all' ? '/requirements' : '/requirements/me';
            const { data } = await api.get(url);
            setRequirements(data);
        } catch (error) {
            console.error('Error fetching requirements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequirements(); }, [viewMode]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este pedido?')) return;
        try {
            await api.delete(`/requirements/${id}`);
            fetchRequirements();
        } catch { alert('Error al eliminar'); }
    };

    const handleChat = (agentId: string) => navigate(`/chat?agent=${agentId}`);

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Tab bar + create button */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex bg-white/5 p-1 rounded-xl w-full sm:w-auto">
                    <button onClick={() => setViewMode('all')} className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm transition-all ${viewMode === 'all' ? 'bg-accent-orange text-white' : 'text-gray-400 hover:text-white'}`}>Muro de Agentes</button>
                    <button onClick={() => setViewMode('mine')} className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm transition-all ${viewMode === 'mine' ? 'bg-accent-orange text-white' : 'text-gray-400 hover:text-white'}`}>Mis Pedidos</button>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="w-full sm:w-auto btn-primary py-2 px-5 text-sm flex items-center justify-center gap-2">
                        <Plus size={16} /> Crear Pedido
                    </button>
                )}
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <CreateRequirementForm onSuccess={() => { setShowForm(false); fetchRequirements(); }} onCancel={() => setShowForm(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-10"><Loader2 size={32} className="animate-spin text-accent-orange" /></div>
            ) : requirements.length === 0 ? (
                <div className="glass-card p-10 text-center flex flex-col items-center border border-glass-border">
                    <Search size={40} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 text-sm">No hay pedidos activos en este momento.</p>
                    {viewMode === 'mine' && <button onClick={() => setShowForm(true)} className="mt-4 btn-primary py-2 px-5 text-sm flex gap-2 items-center"><Plus size={15} />Crear mi primer pedido</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {requirements.map(req => (
                        <ReqCard
                            key={req.id}
                            req={req}
                            isOwn={req.agentId === currentUser?.id}
                            onDelete={handleDelete}
                            onChat={handleChat}
                            currentUserId={currentUser?.id ?? ''}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
