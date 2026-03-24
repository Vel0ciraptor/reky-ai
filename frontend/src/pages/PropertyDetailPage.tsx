import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, MapPin, Bed, Bath, Car, Dog, TreePine, Waves,
    MessageCircle, Share2, Tag, Key, Building2, Copy, Check, Facebook, Link2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

// ── Share Modal ─────────────────────────────────────────────────
const ShareModal = ({ url, title, onClose }: { url: string; title: string; onClose: () => void }) => {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOptions = [
        {
            label: 'Facebook',
            icon: <Facebook size={18} />,
            color: '#1877F2',
            bg: 'rgba(24,119,242,0.12)',
            border: 'rgba(24,119,242,0.3)',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        },
        {
            label: 'WhatsApp',
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            color: '#25D366',
            bg: 'rgba(37,211,102,0.12)',
            border: 'rgba(37,211,102,0.3)',
            href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
        },
        {
            label: 'Instagram',
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
            ),
            color: '#E4405F',
            bg: 'rgba(228,64,95,0.12)',
            border: 'rgba(228,64,95,0.3)',
            // Instagram doesn't allow direct share links from web; copy link instead
            href: null,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl z-10"
                style={{ background: 'rgba(14,14,20,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-white">Compartir propiedad</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Social buttons */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {shareOptions.map((opt) => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    if (opt.href) window.open(opt.href, '_blank');
                                    else { copyLink(); }
                                }}
                                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                                style={{ background: opt.bg, border: `1px solid ${opt.border}`, color: opt.color }}
                            >
                                {opt.icon}
                                <span className="text-[11px] font-semibold">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Copy link */}
                    <div className="flex gap-2 items-center bg-white/5 border border-glass-border rounded-xl px-3 py-2.5">
                        <Link2 size={14} className="text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 flex-1 truncate">{url}</span>
                        <button
                            onClick={copyLink}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,106,0,0.15)', color: copied ? '#22c55e' : '#FF6A00' }}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Image Carousel ───────────────────────────────────────────────
const ImageCarousel = ({ images, location }: { images: any[]; location: string }) => {
    const [current, setCurrent] = useState(0);
    const [lightbox, setLightbox] = useState(false);

    const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

    useEffect(() => {
        if (!lightbox) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'Escape') setLightbox(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox, prev, next]);

    if (!images?.length) {
        return <div className="w-full h-[40vh] min-h-[280px] md:h-[480px] bg-gradient-to-b from-gray-800 to-bg-dark" />;
    }

    return (
        <>
            {/* Main slider */}
            <div className="relative w-full h-[40vh] min-h-[280px] md:h-[480px] overflow-hidden bg-black">
                <AnimatePresence initial={false}>
                    <motion.img
                        key={current}
                        src={images[current].url}
                        alt={`${location} - foto ${current + 1}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 w-full h-full object-cover cursor-zoom-in select-none"
                        onClick={() => setLightbox(true)}
                        draggable={false}
                    />
                </AnimatePresence>

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/30 to-transparent pointer-events-none" />

                {/* Prev/Next arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}

                {/* Counter badge */}
                <div className="absolute bottom-20 right-4 z-10 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/10">
                    {current + 1} / {images.length}
                </div>

                {/* Dot indicators */}
                {images.length > 1 && images.length <= 10 && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`rounded-full transition-all ${i === current ? 'w-5 h-1.5 bg-accent-orange' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-black/30">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === current ? 'border-accent-orange scale-105 shadow-lg shadow-accent-orange/30' : 'border-transparent opacity-60 hover:opacity-90'}`}
                        >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/96 flex flex-col items-center justify-center"
                        onClick={() => setLightbox(false)}
                    >
                        <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                            <X size={20} />
                        </button>
                        <div className="text-white/40 text-sm mb-4">{current + 1} / {images.length}</div>
                        <div
                            className="relative max-w-5xl w-full px-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <motion.img
                                key={current}
                                src={images[current].url}
                                alt={location}
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="w-full max-h-[80vh] object-contain rounded-xl"
                            />
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-3 mt-5">
                                <button onClick={prev} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={next} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// ── Main Page ────────────────────────────────────────────────────
export default function PropertyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const [flyTo] = useState<[number, number] | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                setProperty(res.data);
            } catch (err) {
                console.error("Error fetching property:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent-orange border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center p-6">
                <h2 className="text-2xl font-bold mb-2">Propiedad no encontrada</h2>
                <p className="text-gray-400 mb-6">La propiedad que buscas no existe o ha sido eliminada.</p>
                <button onClick={() => navigate('/search')} className="btn-primary px-8">Explorar Mapa</button>
            </div>
        );
    }

    const mainAgentLink = property.agents?.[0]?.agent;
    const shareUrl = window.location.href;

    const handleContact = () => {
        if (!mainAgentLink?.id) return;
        navigate(`/chat?agent=${mainAgentLink.id}&property=${property.id}`);
    };

    // Suppress unused variable warning
    void flyTo;

    return (
        <div className="max-w-4xl mx-auto pb-24 relative">

            {/* ── Image Carousel ── */}
            <div className="relative">
                <ImageCarousel images={property.images || []} location={property.ubicacion} />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/10"
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Share button */}
                <button
                    onClick={() => setShowShare(true)}
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors border border-white/10"
                >
                    <Share2 size={18} />
                </button>

                {/* Badges (overlapping carousel bottom) */}
                <div className="absolute bottom-28 left-4 flex flex-wrap gap-2 z-10">
                    <span className="px-3 py-1 bg-accent-orange text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-accent-orange/30">
                        {property.tipo}
                    </span>
                    {property.tipoVivienda && (
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-full">
                            {property.tipoVivienda}
                        </span>
                    )}
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-full font-mono uppercase tracking-widest">
                        {property.matricula}
                    </span>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="px-4 sm:px-6 mt-6 md:mt-8 grid md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            {property.ubicacion}
                        </h1>
                        <h2 className="text-2xl font-bold text-accent-orange mb-4">
                            ${Number(property.precio).toLocaleString('es-BO')}
                        </h2>

                        <div className="flex flex-wrap gap-4 py-4 border-y border-glass-border">
                            {property.dormitorios > 0 && (
                                <div className="flex items-center gap-2 text-gray-300">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <Bed size={18} className="text-accent-orange" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{property.dormitorios}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dormitorios</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-300">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <Bath size={18} className="text-accent-orange" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{property.banos}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Baños</p>
                                </div>
                            </div>
                            {(property.terreno || property.construccion) && (
                                <div className="flex items-center gap-2 text-gray-300">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <MapPin size={18} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        {property.construccion && <p className="text-sm font-semibold">{property.construccion} m² const.</p>}
                                        {property.terreno && <p className="text-sm font-semibold text-gray-400">{property.terreno} m² terr.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Key size={18} className="text-accent-orange" />
                            Comodidades
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${property.estacionamiento ? 'bg-accent-orange/10 border-accent-orange/30 text-white' : 'bg-white/5 border-glass-border text-gray-500'}`}>
                                <Car size={18} /> <span className="text-sm font-medium">Parqueo</span>
                            </div>
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${property.mascotas ? 'bg-accent-orange/10 border-accent-orange/30 text-white' : 'bg-white/5 border-glass-border text-gray-500'}`}>
                                <Dog size={18} /> <span className="text-sm font-medium">Mascotas</span>
                            </div>
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${property.patio ? 'bg-accent-orange/10 border-accent-orange/30 text-white' : 'bg-white/5 border-glass-border text-gray-500'}`}>
                                <TreePine size={18} /> <span className="text-sm font-medium">Patio</span>
                            </div>
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${property.piscina ? 'bg-accent-orange/10 border-accent-orange/30 text-white' : 'bg-white/5 border-glass-border text-gray-500'}`}>
                                <Waves size={18} /> <span className="text-sm font-medium">Piscina</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Tag size={18} className="text-accent-orange" />
                            Descripción
                        </h3>
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-glass-border text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {property.descripcion || 'Sin descripción adicional.'}
                        </div>
                    </div>

                    {property.tags?.length > 0 && (
                        <div className="pt-4">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">Etiquetas de Búsqueda</h3>
                            <div className="flex flex-wrap gap-2">
                                {property.tags.map((t: any) => (
                                    <span key={t.tag.name} className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-gray-400 border border-white/10">
                                        #{t.tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mobile share button */}
                    <button
                        onClick={() => setShowShare(true)}
                        className="md:hidden w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange transition-colors text-sm font-semibold bg-white/[0.03]"
                    >
                        <Share2 size={16} /> Compartir propiedad
                    </button>
                </div>

                {/* Agent Sidebar */}
                <div className="md:col-span-1">
                    <div className="sticky top-24 space-y-3">
                        <div className="p-5 rounded-3xl border border-glass-border bg-black/40 backdrop-blur-xl">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-orange/20 to-red-900/30 flex items-center justify-center font-bold text-lg text-white border border-accent-orange/30 overflow-hidden relative">
                                    {mainAgentLink?.avatarUrl ? (
                                        <img src={mainAgentLink.avatarUrl} alt={mainAgentLink.name} className="object-cover w-full h-full" />
                                    ) : (
                                        mainAgentLink?.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{mainAgentLink?.name} {mainAgentLink?.lastName}</h3>
                                    {mainAgentLink?.agency ? (
                                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Building2 size={12} className="text-purple-400" />
                                            {mainAgentLink.agency.name}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-500 mt-0.5">Agente Independiente</p>
                                    )}
                                </div>
                            </div>

                            {mainAgentLink?.phone && (
                                <p className="text-sm text-gray-300 mb-5 bg-white/5 p-3 rounded-xl border border-white/10 text-center font-mono">
                                    {mainAgentLink.phone}
                                </p>
                            )}

                            <div className="space-y-3">
                                <button onClick={handleContact} className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-[0_0_20px_rgba(255,106,0,0.2)]">
                                    <MessageCircle size={18} />
                                    Iniciar Chat
                                </button>
                                <button
                                    onClick={() => setShowShare(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange transition-all text-sm font-semibold bg-white/[0.03]"
                                >
                                    <Share2 size={16} /> Compartir
                                </button>
                            </div>

                            {property.agents?.length > 1 && (
                                <div className="mt-6 pt-5 border-t border-glass-border">
                                    <p className="text-xs text-center text-gray-500 mb-3 uppercase tracking-wider font-semibold">Otros agentes gestionando</p>
                                    <div className="flex flex-col gap-3">
                                        {property.agents.slice(1).map((link: any) => (
                                            <div key={link.agent.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-glass-border/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-accent-orange/20 flex items-center justify-center text-xs text-accent-orange uppercase font-bold overflow-hidden">
                                                        {link.agent.avatarUrl ? <img src={link.agent.avatarUrl} alt="" className="object-cover w-full h-full" /> : link.agent.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-gray-400 truncate max-w-[100px]">{link.agent.name}</span>
                                                </div>
                                                <button onClick={() => navigate(`/chat?agent=${link.agent.id}&property=${property.id}`)} className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-accent-orange hover:bg-accent-orange hover:text-white transition-colors border border-accent-orange/20">
                                                    <MessageCircle size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            <AnimatePresence>
                {showShare && (
                    <ShareModal
                        url={shareUrl}
                        title={`${property.ubicacion} - $${Number(property.precio).toLocaleString('es-BO')} - Reky AI`}
                        onClose={() => setShowShare(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
