import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import {
    Plus, MapPin, DollarSign, Bed, Bath, Car,
    Wind, Waves, Clock, FileText, Loader2, CheckCircle2,
    Tag, X, Navigation, Image as ImageIcon, Camera, Trash2, Wallet, ChevronRight, Eye, List
} from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

// Fix Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PIN_ICON = L.divIcon({
    html: `<div style="width:36px;height:36px;background:#FF6A00;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(255,106,0,0.5)"></div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
});

const SCZ_CENTER: [number, number] = [-17.7863, -63.1812];

// Map click handler sub-component
const MapClickHandler = ({ onLocation }: { onLocation: (lat: number, lng: number, address: string) => void }) => {
    useMapEvents({
        click: async (e) => {
            const { lat, lng } = e.latlng;
            // Reverse geocode via Nominatim
            let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            try {
                const r = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
                );
                const data = await r.json();
                if (data.display_name) {
                    // Shorten: take first 2 parts (neighbourhood + city)
                    const parts = data.display_name.split(',').slice(0, 3).map((s: string) => s.trim());
                    address = parts.join(', ');
                }
            } catch { /* fallback to coords */ }
            onLocation(lat, lng, address);
        },
    });
    return null;
};

const MapUpdater = ({ center }: { center: { lat: number, lng: number } | null }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo([center.lat, center.lng], 16);
        }
    }, [center, map]);
    return null;
};

type PropertyType = 'venta' | 'alquiler' | 'anticretico';

interface PublishForm {
    descripcion: string;
    ubicacion: string;
    tipo: PropertyType;
    precio: number;
    dormitorios: number;
    dormitoriosDetalles?: { tipo: string; dimensiones: string }[];
    banos: number;
    banosDetalles?: { tipo: string }[];
    estacionamiento: boolean;
    parqueos: number;
    parqueoTipo?: 'con_techo' | 'aire_libre';
    patio: boolean;
    patios: number;
    piscina: boolean;
    mascotas: boolean;
    tipoVivienda: string;
    terreno?: number;
    construccion?: number;
    tiempoAlquiler?: number;
    tiempoAnticretico?: number;
}

const SUGGESTED_TAGS = [
    'Vista panorámica', 'Cerca del centro', 'Zona exclusiva', 'Recién remodelado',
    'Piscina compartida', 'Condominio cerrado', 'A estrenar', 'Inversión', 'Duplex',
    'Planta baja', 'Último piso', 'Jardín propio', 'Amueblado', 'Semi-amueblado',
];

const SlideButton = ({ onConfirm, isSubmitting }: { onConfirm: () => void, isSubmitting: boolean }) => {
    const x = useMotionValue(0);
    const containerWidth = 280;
    const thumbWidth = 56;
    const dragRange = containerWidth - thumbWidth;

    // progress visual
    const fillWidth = useTransform(x, [0, dragRange], [thumbWidth, containerWidth]);

    const handleDragEnd = () => {
        if (x.get() > dragRange * 0.9) {
            x.set(dragRange);
            onConfirm();
        } else {
            x.set(0);
        }
    };

    if (isSubmitting) {
        return (
            <div className="w-[280px] h-14 bg-accent-orange mx-auto rounded-full flex items-center justify-center opacity-70">
                <Loader2 size={24} className="animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="relative w-[280px] h-14 mx-auto bg-white/10 rounded-full flex items-center overflow-hidden border border-glass-border">
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-300 pointer-events-none pl-6 z-0">
                Desliza para confirmar
            </span>
            <motion.div
                className="absolute left-0 top-0 bottom-0 bg-accent-orange z-10 rounded-full"
                style={{ width: fillWidth }}
            />
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: dragRange }}
                dragElastic={0}
                dragMomentum={false}
                style={{ x }}
                onDragEnd={handleDragEnd}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing relative z-20 shadow-lg border border-accent-orange/50"
            >
                <ChevronRight size={24} className="text-accent-orange" />
            </motion.div>
        </div>
    );
};

const PublishProperty = () => {
    const { refreshAgent } = useAuth();
    const navigate = useNavigate();
    const [pendingData, setPendingData] = useState<PublishForm | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [propertyId] = useState(() => uuidv4());

    const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<PublishForm>({
        defaultValues: {
            tipo: 'venta', dormitorios: 1, banos: 1,
            estacionamiento: false, parqueos: 1, parqueoTipo: 'con_techo',
            patio: false, patios: 0, piscina: false, mascotas: false,
            tipoVivienda: 'Cualquiera',
            dormitoriosDetalles: [{ tipo: 'Suite', dimensiones: '' }],
            banosDetalles: [{ tipo: 'En suite' }]
        }
    });

    const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
        control,
        name: "dormitoriosDetalles"
    });

    const { fields: bathFields, append: appendBath, remove: removeBath } = useFieldArray({
        control,
        name: "banosDetalles"
    });

    const numDormitorios = watch('dormitorios');
    const numBanos = watch('banos');

    // Sync field arrays with the counts
    useEffect(() => {
        const currentCount = roomFields.length;
        if (numDormitorios > currentCount) {
            for (let i = currentCount; i < numDormitorios; i++) {
                appendRoom({ tipo: 'Habitación', dimensiones: '' });
            }
        } else if (numDormitorios < currentCount) {
            for (let i = currentCount; i > numDormitorios; i--) {
                removeRoom(i - 1);
            }
        }
    }, [numDormitorios, appendRoom, removeRoom, roomFields.length]);

    useEffect(() => {
        const currentCount = bathFields.length;
        if (numBanos > currentCount) {
            for (let i = currentCount; i < numBanos; i++) {
                appendBath({ tipo: 'Compartido' });
            }
        } else if (numBanos < currentCount) {
            for (let i = currentCount; i > numBanos; i--) {
                removeBath(i - 1);
            }
        }
    }, [numBanos, appendBath, removeBath, bathFields.length]);

    const selectedType = watch('tipo');

    // Tag management
    const addTag = (tag: string) => {
        const clean = tag.trim().toLowerCase().replace(/\s+/g, '-');
        if (clean && !tags.includes(clean) && tags.length < 10) {
            setTags(prev => [...prev, clean]);
        }
        setTagInput('');
        setShowSuggestions(false);
    };

    const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            addTag(tagInput);
        }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const handleLocation = useCallback((lat: number, lng: number, address: string) => {
        setMapPin({ lat, lng });
        setValue('ubicacion', address, { shouldValidate: true });
    }, [setValue]);

    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploadingImage(true);
        for (const file of files) {
            if (images.length >= 5) break;

            try {
                // 1. Compress Image (WebP, max 300KB)
                const options = {
                    maxSizeMB: 0.3,
                    maxWidthOrHeight: 1280,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(file as File, options);

                // 2. Get Presigned URL
                const { data: { uploadUrl, fileUrl } } = await api.post('/upload/upload-url', {
                    entityId: propertyId,
                    type: 'image/webp',
                    folder: 'properties'
                });

                // 3. Upload directly to R2 (CORS required)
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: compressedFile,
                    headers: { 'Content-Type': 'image/webp' }
                });

                // 4. Save metadata in backend (Supabase)
                // Note: If property doesn't exist yet, we capture the URL to send in final submit
                // but we also call the endpoint as requested.
                try {
                    await api.post('/upload/images', { entityId: propertyId, url: fileUrl });
                } catch (e) {
                    console.warn('Metadata save error (expected for new properties):', e);
                }

                setImages(prev => [...prev, fileUrl].slice(0, 5));
            } catch (error) {
                console.error('Upload error:', error);
                alert('Error al subir una de las imágenes. Revisa la consola para más detalles.');
            }
        }
        setIsUploadingImage(false);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const filteredSuggestions = SUGGESTED_TAGS.filter(s =>
        s.toLowerCase().includes(tagInput.toLowerCase()) &&
        !tags.includes(s.toLowerCase().replace(/\s+/g, '-'))
    );

    const onSubmit = async (data: PublishForm) => {
        // Intercept form submission and show confirmation modal instead
        setPendingData(data);
    };

    const confirmPublish = async () => {
        if (!pendingData) return;
        setIsSubmitting(true);
        try {
            const payload: any = {
                id: propertyId,
                ...pendingData,
                lat: mapPin?.lat,
                lng: mapPin?.lng,
                tags,
                images,
                estacionamiento: (pendingData.parqueos || 0) > 0,
                patio: (pendingData.patios || 0) > 0,
            };

            // Clean up NaN values which fail backend validation
            if (!payload.terreno && payload.terreno !== 0) delete payload.terreno;
            if (!payload.construccion && payload.construccion !== 0) delete payload.construccion;
            if (isNaN(payload.tiempoAlquiler)) delete payload.tiempoAlquiler;
            if (isNaN(payload.tiempoAnticretico)) delete payload.tiempoAnticretico;
            await api.post('/properties', payload);
            setIsSuccess(true);
            setPendingData(null);
            refreshAgent();
        } catch (error: any) {
            console.error(error);
            alert('Error publicando: ' + (error.response?.data?.message || 'Error de conexión'));
            setPendingData(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/30">
                    <CheckCircle2 size={40} className="text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">¡Propiedad Publicada!</h2>
                <p className="text-gray-400 mb-8 max-w-sm">Tu propiedad está registrada y visible en el mapa para otros agentes.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => { setIsSuccess(false); setMapPin(null); setTags([]); setImages([]); }} className="btn-primary">
                        Publicar otra propiedad
                    </button>
                    <button
                        onClick={() => navigate('/profile?tab=properties')}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-glass-border text-gray-300 hover:border-accent-orange hover:text-accent-orange transition-all text-sm font-semibold"
                    >
                        <Eye size={16} /> Ver mis propiedades
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">

            {/* Confirmation Modal */}
            <AnimatePresence>
                {pendingData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setPendingData(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center z-10"
                        >
                            <div className="w-16 h-16 bg-accent-orange/20 rounded-full flex items-center justify-center mb-4">
                                <Wallet size={32} className="text-accent-orange" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Confirmar Publicación</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Publicar este inmueble en Reky AI tiene un costo de <strong className="text-accent-orange text-lg">1 Bs</strong>. Se descontará automáticamente de tu wallet una vez confirmado.
                            </p>

                            <SlideButton onConfirm={confirmPublish} isSubmitting={isSubmitting} />

                            <button
                                type="button"
                                onClick={() => setPendingData(null)}
                                disabled={isSubmitting}
                                className="mt-5 text-sm font-medium text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancelar y revisar datos
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-glass-border pb-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-orange/20 text-accent-orange rounded-xl flex items-center justify-center flex-shrink-0">
                        <Plus size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Publicar Inmueble</h1>
                        <p className="text-gray-500 text-sm">
                            Completa los datos para que otros agentes puedan colaborar.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/profile?tab=properties')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange transition-all text-xs font-semibold flex-shrink-0"
                >
                    <List size={14} /> Mis Propiedades
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

                {/* ── IMÁGENES ── */}
                <div className="glass-card p-5 flex flex-col gap-4">
                    <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                        <ImageIcon size={13} /> Fotos de la propiedad <span className="text-gray-600">(max. 5)</span>
                    </label>

                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-glass-border group">
                                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={18} className="text-white" />
                                </button>
                            </div>
                        ))}
                        {images.length < 5 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="aspect-square rounded-xl border-2 border-dashed border-glass-border hover:border-accent-orange/50 hover:bg-accent-orange/10 flex flex-col items-center justify-center gap-1.5 transition-all group disabled:opacity-50"
                            >
                                {isUploadingImage ? (
                                    <Loader2 size={18} className="text-accent-orange animate-spin" />
                                ) : (
                                    <>
                                        <Camera size={18} className="text-gray-600 group-hover:text-accent-orange" />
                                        <span className="text-[10px] text-gray-600 font-medium">Subir ({5 - images.length})</span>
                                    </>
                                )}
                            </button>
                        )}
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>
                </div>

                <div className="glass-card p-5 flex flex-col gap-4">
                    <div>
                        <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-2">
                            <FileText size={13} /> Descripción <span className="text-accent-orange">*</span>
                        </label>
                        <textarea
                            {...register('descripcion', { required: 'La descripción es obligatoria' })}
                            rows={3}
                            className={`w-full bg-white/5 border ${errors.descripcion ? 'border-red-500' : 'border-glass-border'} px-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange transition-all text-sm resize-none font-medium leading-relaxed`}
                            placeholder="Estado, vistas, acabados, puntos de referencia..."
                        />
                        {errors.descripcion && <p className="text-red-400 text-xs mt-1">{errors.descripcion.message}</p>}
                    </div>
                </div>

                {/* ── MAPA DE UBICACIÓN ── */}
                <div className="glass-card p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                            <Navigation size={13} /> Ubicación en el mapa <span className="text-accent-orange">*</span>
                        </label>
                        {mapPin && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <MapPin size={12} /> Pin colocado
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-gray-600 mb-2">Toca el mapa para colocar el pin de la propiedad o ingresa un enlace de Google Maps a continuación. El mapa y la dirección se actualizarán solos.</p>

                    {/* Input Google Maps */}
                    <div className="relative mb-2">
                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent-orange" />
                        <input
                            type="text"
                            placeholder="🔗 Pega un enlace de Google Maps o coordenadas (ej: -17.78, -63.18)"
                            className="w-full bg-white/5 border border-glass-border pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange transition-all text-sm text-gray-300"
                            onChange={(e) => {
                                const val = e.target.value;
                                const linkMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                const queryMatch = val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                const rawMatch = val.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
                                const match = linkMatch || queryMatch || rawMatch;
                                if (match) {
                                    handleLocation(parseFloat(match[1]), parseFloat(match[2]), 'Ubicación importada de mapa');
                                }
                            }}
                        />
                    </div>

                    {/* Leaflet map */}
                    <div className="rounded-xl overflow-hidden border border-glass-border shadow-inner" style={{ height: 400 }}>
                        <MapContainer
                            center={SCZ_CENTER as L.LatLngExpression}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            <MapUpdater center={mapPin} />
                            <MapClickHandler onLocation={handleLocation} />
                            {mapPin && (
                                <Marker
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    position={[mapPin.lat, mapPin.lng] as any}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    icon={PIN_ICON as any}
                                />
                            )}
                        </MapContainer>
                    </div>

                    {/* Ubicacion text (editable, set by map or manually) */}
                    <div className="relative">
                        <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            {...register('ubicacion', { required: 'Elige una ubicación en el mapa' })}
                            className={`w-full bg-white/5 border ${errors.ubicacion ? 'border-red-500' : 'border-glass-border'} pl-9 pr-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange transition-all text-sm`}
                            placeholder="Se completa al tocar el mapa, o escribe manualmente"
                        />
                    </div>
                    {errors.ubicacion && <p className="text-red-400 text-xs">{errors.ubicacion.message}</p>}
                </div>

                {/* ── PRECIO + TIPO ── */}
                <div className="glass-card p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-2">
                                <DollarSign size={13} /> Precio <span className="text-accent-orange">*</span>
                            </label>
                            <input
                                type="number"
                                {...register('precio', { required: 'Ingresa el precio', valueAsNumber: true })}
                                className={`w-full bg-white/5 border ${errors.precio ? 'border-red-500' : 'border-glass-border'} px-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange transition-all text-sm`}
                                placeholder="0"
                            />
                            {errors.precio && <p className="text-red-400 text-xs mt-1">{errors.precio.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Tipo <span className="text-accent-orange">*</span></label>
                            <div className="flex flex-col gap-1.5">
                                {(['venta', 'alquiler', 'anticretico'] as PropertyType[]).map(t => (
                                    <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all text-sm ${selectedType === t ? 'border-accent-orange bg-accent-orange/10 text-white' : 'border-glass-border text-gray-500'}`}>
                                        <input {...register('tipo')} type="radio" value={t} className="hidden" />
                                        <span className="capitalize">{t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Conditional duration fields */}
                    <AnimatePresence>
                        {selectedType === 'alquiler' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-2">
                                    <Clock size={13} /> Duración alquiler (meses)
                                </label>
                                <input type="number" {...register('tiempoAlquiler', { valueAsNumber: true })}
                                    className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                            </motion.div>
                        )}
                        {selectedType === 'anticretico' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-2">
                                    <Clock size={13} /> Duración anticrético (años)
                                </label>
                                <input type="number" {...register('tiempoAnticretico', { valueAsNumber: true })}
                                    className="w-full bg-white/5 border border-glass-border px-4 py-3 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── CARACTERÍSTICAS ── */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Características Detalladas</h3>
                    
                    <div className="flex flex-col gap-6">
                        {/* DORMITORIOS SECTION */}
                        <div className="p-4 rounded-xl bg-white/3 border border-glass-border">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                                    <Bed size={16} className="text-accent-orange" /> Dormitorios
                                </label>
                                <input type="number" min="1" {...register('dormitorios', { valueAsNumber: true })}
                                    className="w-20 bg-white/5 border border-glass-border px-3 py-1.5 rounded-lg focus:outline-none focus:border-accent-orange text-sm text-center" />
                            </div>
                            
                            <div className="space-y-3">
                                {roomFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/5 border border-glass-border/30">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Tipo #{index + 1}</label>
                                            <select {...register(`dormitoriosDetalles.${index}.tipo` as const)} 
                                                className="w-full bg-bg-dark border border-glass-border px-2 py-1.5 rounded text-xs outline-none">
                                                <option value="Suite">Suite</option>
                                                <option value="Habitación">Habitación</option>
                                                <option value="Cuarto de visitas">Cuarto de visitas</option>
                                                <option value="Cuarto de servicio">Cuarto de servicio</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Dimensiones</label>
                                            <input {...register(`dormitoriosDetalles.${index}.dimensiones` as const)} 
                                                placeholder="Ej: 4x5m"
                                                className="w-full bg-white/5 border border-glass-border px-2 py-1.5 rounded text-xs outline-none focus:border-accent-orange" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BAÑOS SECTION */}
                        <div className="p-4 rounded-xl bg-white/3 border border-glass-border">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                                    <Bath size={16} className="text-accent-orange" /> Baños
                                </label>
                                <input type="number" min="0" {...register('banos', { valueAsNumber: true })}
                                    className="w-20 bg-white/5 border border-glass-border px-3 py-1.5 rounded-lg focus:outline-none focus:border-accent-orange text-sm text-center" />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bathFields.map((field, index) => (
                                    <div key={field.id} className="p-2 rounded-lg bg-white/5 border border-glass-border/30">
                                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Baño #{index + 1}</label>
                                        <select {...register(`banosDetalles.${index}.tipo` as const)} 
                                            className="w-full bg-bg-dark border border-glass-border px-2 py-1 round text-xs outline-none">
                                            <option value="En suite">En suite</option>
                                            <option value="Compartido">Compartido</option>
                                            <option value="Visitas">Visitas</option>
                                            <option value="Servicio">Servicio</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PARKING & PATIO SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/3 border border-glass-border">
                                <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2 mb-4">
                                    <Car size={16} className="text-accent-orange" /> Parqueos
                                </label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Cantidad</span>
                                        <input type="number" min="0" {...register('parqueos', { valueAsNumber: true })}
                                            className="w-20 bg-white/5 border border-glass-border px-3 py-1.5 rounded-lg text-sm text-center focus:border-accent-orange outline-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <label className={`flex-1 flex items-center justify-center py-2 rounded-lg border text-[10px] uppercase font-bold cursor-pointer transition-all ${watch('parqueoTipo') === 'con_techo' ? 'bg-accent-orange/10 border-accent-orange text-accent-orange' : 'border-glass-border text-gray-500'}`}>
                                            <input type="radio" {...register('parqueoTipo')} value="con_techo" className="hidden" />
                                            Con Techo
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center py-2 rounded-lg border text-[10px] uppercase font-bold cursor-pointer transition-all ${watch('parqueoTipo') === 'aire_libre' ? 'bg-accent-orange/10 border-accent-orange text-accent-orange' : 'border-glass-border text-gray-500'}`}>
                                            <input type="radio" {...register('parqueoTipo')} value="aire_libre" className="hidden" />
                                            Al aire libre
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/3 border border-glass-border">
                                <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2 mb-4">
                                    <Wind size={16} className="text-accent-orange" /> Patios
                                </label>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Cantidad de patios</span>
                                    <input type="number" min="0" {...register('patios', { valueAsNumber: true })}
                                        className="w-20 bg-white/5 border border-glass-border px-3 py-1.5 rounded-lg text-sm text-center focus:border-accent-orange outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {[
                            { field: 'piscina' as const, icon: Waves, label: 'Piscina' },
                            { field: 'mascotas' as const, icon: Plus, label: 'Mascotas' },
                        ].map(({ field, icon: Icon, label }) => {
                            const val = watch(field as any);
                            return (
                                <label key={field}
                                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm ${val ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'border-glass-border text-gray-600 hover:border-gray-500'}`}>
                                    <input type="checkbox" {...register(field as any)} className="hidden" />
                                    <Icon size={18} />
                                    {label}
                                </label>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <div>
                            <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">🏠 Tipo de Vivienda</label>
                            <select {...register('tipoVivienda')} className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm text-white/80">
                                <option value="Cualquiera" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Cualquiera</option>

                                {/* CASAS */}
                                <option value="Casa en condominio" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa en condominio</option>
                                <option value="Casa de campo" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa de campo</option>
                                <option value="Casa en ciudad" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa en ciudad</option>
                                <option value="Casa a las afueras" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa a las afueras</option>
                                <option value="Casa de lujo" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa de lujo</option>
                                <option value="Casa minimalista" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa minimalista</option>
                                <option value="Casa colonial" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa colonial</option>
                                <option value="Casa prefabricada" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa prefabricada</option>
                                <option value="Casa ecológica" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Casa ecológica</option>

                                {/* DEPARTAMENTOS */}
                                <option value="Departamento" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Departamento</option>
                                <option value="Departamento amoblado" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Departamento amoblado</option>
                                <option value="Departamento tipo estudio" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Departamento tipo estudio</option>
                                <option value="Penthouse" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Penthouse</option>
                                <option value="Loft" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Loft</option>
                                <option value="Dúplex" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Dúplex</option>

                                {/* TERRENOS */}
                                <option value="Terreno urbano" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Terreno urbano</option>
                                <option value="Terreno rural" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Terreno rural</option>
                                <option value="Terreno agrícola" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Terreno agrícola</option>
                                <option value="Lote en condominio" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Lote en condominio</option>
                                <option value="Lote comercial" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Lote comercial</option>

                                {/* COMERCIAL */}
                                <option value="Local comercial" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Local comercial</option>
                                <option value="Oficina" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Oficina</option>
                                <option value="Edificio" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Edificio</option>
                                <option value="Galpón" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Galpón</option>
                                <option value="Depósito" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Depósito</option>
                                <option value="Centro comercial" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Centro comercial</option>

                                {/* TURÍSTICOS */}
                                <option value="Cabaña" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Cabaña</option>
                                <option value="Quinta" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Quinta</option>
                                <option value="Hacienda" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Hacienda</option>
                                <option value="Hostal" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Hostal</option>
                                <option value="Hotel" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Hotel</option>
                                <option value="Resort" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Resort</option>

                                {/* OTROS */}
                                <option value="Garaje" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Garaje</option>
                                <option value="Parqueo" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Parqueo</option>
                                <option value="Proyecto en construcción" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Proyecto en construcción</option>
                                <option value="Propiedad industrial" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Propiedad industrial</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">📐 Terreno (m²)</label>
                            <input type="number" step="0.01" {...register('terreno', { valueAsNumber: true })}
                                placeholder="Ej: 300"
                                className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">🏗️ Construcción (m²)</label>
                            <input type="number" step="0.01" {...register('construccion', { valueAsNumber: true })}
                                placeholder="Ej: 150"
                                className="w-full bg-white/5 border border-glass-border px-3 py-2.5 rounded-xl focus:outline-none focus:border-accent-orange text-sm" />
                        </div>
                    </div>
                </div>

                {/* ── TAGS / ETIQUETAS ── */}
                <div className="glass-card p-5">
                    <label className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5 mb-3">
                        <Tag size={13} /> Etiquetas de búsqueda
                        <span className="text-gray-600 normal-case tracking-normal font-normal">(max. 10)</span>
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                        Las etiquetas ayudan a los agentes a encontrar tu propiedad. Escribe y presiona Enter o elige sugerencias.
                    </p>

                    {/* Tag chips */}
                    <div className={`flex flex-wrap gap-2 p-3 rounded-xl border min-h-[48px] transition-all ${tags.length > 0 ? 'border-accent-orange/30' : 'border-glass-border'} bg-white/3`}>
                        {tags.map(t => (
                            <span key={t} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent-orange/15 text-accent-orange border border-accent-orange/30">
                                #{t}
                                <button type="button" onClick={() => removeTag(t)} className="hover:text-white transition-colors ml-0.5">
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                        {tags.length < 10 && (
                            <div className="relative flex-1 min-w-[140px]">
                                <input
                                    value={tagInput}
                                    onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }}
                                    onKeyDown={handleTagKeyDown}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    placeholder={tags.length === 0 ? 'Escribe una etiqueta...' : 'Añadir más...'}
                                    className="bg-transparent text-sm focus:outline-none w-full py-0.5 text-white placeholder:text-gray-700"
                                />
                            </div>
                        )}
                    </div>

                    {/* Autocomplete suggestions */}
                    <AnimatePresence>
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mt-2 p-2 rounded-xl border border-glass-border bg-bg-card shadow-xl flex flex-wrap gap-1.5"
                            >
                                {filteredSuggestions.slice(0, 8).map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => addTag(s)}
                                        className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange transition-all"
                                    >
                                        + {s}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── SUBMIT ── */}
                <div className="flex gap-3 pb-2">
                    <button type="button" className="text-gray-500 hover:text-white transition-colors py-3 px-5 text-sm">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary flex-1">
                        <Plus size={18} /> Continuar a Publicar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PublishProperty;
