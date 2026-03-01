import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, MapPin, Bed, Bath, Car, Dog, TreePine, Waves,
    MessageCircle, Share2, Tag, Key, Building2
} from 'lucide-react';
import api from '../lib/api';

export default function PropertyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    // Default primary agent
    const mainAgentLink = property.agents?.[0]?.agent;

    const handleContact = () => {
        if (!mainAgentLink?.id) return;
        navigate(`/chat?agent=${mainAgentLink.id}&property=${property.id}`);
    };

    return (
        <div className="max-w-4xl mx-auto pb-24 relative">
            {/* Header / Images */}
            <div className="relative w-full h-[40vh] min-h-[300px] md:h-[500px]">
                {property.images?.[0] ? (
                    <img src={property.images[0].url} alt={property.ubicacion} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-gray-800 to-bg-dark flex items-center justify-center" />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/50 to-transparent" />

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2">
                    <button className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
                        <Share2 size={18} />
                    </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-accent-orange text-white text-xs font-bold rounded-full uppercase tracking-wider">
                            {property.tipo}
                        </span>
                        {property.tipoVivienda && (
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-full">
                                {property.tipoVivienda}
                            </span>
                        )}
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-full uppercase tracking-widest font-mono">
                            {property.matricula}
                        </span>
                    </div>
                </div>
            </div>

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
                </div>

                {/* Agent Sidebar */}
                <div className="md:col-span-1">
                    <div className="sticky top-24 p-5 rounded-3xl border border-glass-border bg-black/40 backdrop-blur-xl">
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
    );
}
