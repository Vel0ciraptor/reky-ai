import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import {
    Search, Camera, SlidersHorizontal,
    Bed, Bath, Car, X, ChevronUp, ChevronDown,
    MapPin, DollarSign, RefreshCw,
    Dog, TreePine, Waves
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPropertyIcon = (agentCount: number, promoted: boolean) =>
    L.divIcon({
        html: `<div style="background:${promoted ? '#FF6A00' : '#14141A'};border:2px solid ${promoted ? '#FF8C2A' : 'rgba(255,255,255,0.18)'};border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;box-shadow:0 4px 14px ${promoted ? 'rgba(255,106,0,0.5)' : 'rgba(0,0,0,0.5)'}">${agentCount}</div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16],
    });

const createClusterCustomIcon = function (cluster: any) {
    return L.divIcon({
        html: `<div style="background:#0F0F13;border:2px solid #3A3A4A;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;color:white;box-shadow:0 4px 14px rgba(0,0,0,0.6)">${cluster.getChildCount()}</div>`,
        className: 'custom-marker-cluster',
        iconSize: L.point(40, 40, true),
    });
};

const QUICK_FILTERS = [
    { name: 'Venta', icon: '🏠', value: 'venta', field: 'tipo' },
    { name: 'Alquiler', icon: '🔑', value: 'alquiler', field: 'tipo' },
    { name: 'Anticrético', icon: '🏦', value: 'anticretico', field: 'tipo' },
    { name: 'Condominio', icon: '🏘️', value: 'casa en condominio', field: 'tipoVivienda' },
    { name: 'Pet Friendly', icon: '🐾', value: true, field: 'mascotas' },
    { name: 'Con Piscina', icon: '🏊', value: true, field: 'piscina' },
    { name: 'Con Parqueo', icon: '🚗', value: true, field: 'estacionamiento' },
];

const SCZ_CENTER: [number, number] = [-17.7863, -63.1812];

const MapController = ({ onBoundsReady }: { onBoundsReady: (b: L.LatLngBounds) => void }) => {
    const map = useMapEvents({
        moveend: (e) => {
            // Track current view bounds without triggering a search
            (window as any).__mapCurrentBounds = e.target.getBounds();
        },
    });

    useEffect(() => {
        if (map) {
            (window as any).__mapCurrentBounds = map.getBounds();
            onBoundsReady(map.getBounds());
        }
    }, [map]);

    return null;
};

const tipoColor: Record<string, string> = {
    venta: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    alquiler: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    anticretico: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

// ── Dual Range Slider ───────────────────────────────────────────
const PriceRangeSlider = ({ min, max, valueMin, valueMax, onChange }: {
    min: number; max: number; valueMin: number; valueMax: number;
    onChange: (min: number, max: number) => void;
}) => {
    const pct = (v: number) => ((v - min) / (max - min)) * 100;
    const midPct = (pct(valueMin) + pct(valueMax)) / 2;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-gray-500">
                <span className="tabular-nums">${valueMin.toLocaleString()}</span>
                <span className="tabular-nums">${valueMax.toLocaleString()}</span>
            </div>
            <div className="relative h-1.5 bg-white/10 rounded-full">
                <div className="absolute h-full bg-accent-orange rounded-full transition-all"
                    style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }} />
                {/* Min slider – clip to left half so it doesn't block max handle */}
                <input type="range" min={min} max={max} step={1000} value={valueMin}
                    onChange={e => onChange(Math.min(Number(e.target.value), valueMax - 1000), valueMax)}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ zIndex: 3, clipPath: `inset(0 ${100 - midPct}% 0 0)` }} />
                {/* Max slider – clip to right half */}
                <input type="range" min={min} max={max} step={1000} value={valueMax}
                    onChange={e => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1000))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ zIndex: 3, clipPath: `inset(0 0 0 ${midPct}%)` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-accent-orange rounded-full border-2 border-bg-dark shadow pointer-events-none"
                    style={{ left: `calc(${pct(valueMin)}% - 7px)`, zIndex: 4 }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-accent-orange rounded-full border-2 border-bg-dark shadow pointer-events-none"
                    style={{ left: `calc(${pct(valueMax)}% - 7px)`, zIndex: 4 }} />
            </div>
        </div>
    );
};

// ── Property Card (shared between desktop list + mobile sheet) ──
const PropertyCard = ({ p, selected, onClick, layout = 'sheet' }: {
    p: any; selected: boolean; onClick: () => void; layout?: 'sheet' | 'sidebar';
}) => {
    const navigate = useNavigate();
    const mainAgent = p.agents?.[0]?.agent;

    const handleContact = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!mainAgent?.id) return;
        navigate(`/chat?agent=${mainAgent.id}&property=${p.id}`);
    };

    const handleViewDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/property/${p.id}`);
    };

    return (
        <motion.div
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={`rounded-xl cursor-pointer border overflow-hidden transition-all ${selected ? 'border-accent-orange shadow-lg shadow-accent-orange/10' : 'border-glass-border hover:border-white/20'}`}
            style={{ background: selected ? 'rgba(255,106,0,0.05)' : 'rgba(255,255,255,0.02)' }}
        >
            {p.images?.[0]?.url && (
                <div className={`overflow-hidden ${layout === 'sidebar' ? 'h-36' : 'h-24'}`}>
                    <img src={p.images[0].url} alt={p.ubicacion}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
            )}
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tipoColor[p.tipo] || ''}`}>
                                {p.tipo}
                            </span>
                            {p._count?.agents > 1 && (
                                <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full border border-blue-400/20">
                                    {p._count.agents} agentes
                                </span>
                            )}
                            {p.agents?.[0]?.promocionado && (
                                <span className="text-[10px] text-accent-orange bg-accent-orange/10 px-1.5 py-0.5 rounded-full border border-accent-orange/20">
                                    ★ Destacado
                                </span>
                            )}
                        </div>
                        <p className="font-semibold text-sm leading-tight truncate">{p.ubicacion}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.descripcion}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="font-bold text-accent-orange text-sm leading-tight">
                            ${Number(p.precio).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1 justify-end">
                            {p.dormitorios > 0 && <span className="flex items-center gap-0.5"><Bed size={10} />{p.dormitorios}</span>}
                            <span className="flex items-center gap-0.5"><Bath size={10} />{p.banos}</span>
                            {p.estacionamiento && <Car size={10} />}
                        </div>
                    </div>
                </div>

                {/* Agent info & Buttons overlay */}
                <div className="mt-3 pt-3 border-t border-glass-border">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-accent-orange/20 flex items-center justify-center text-[10px] uppercase font-bold text-white overflow-hidden shrink-0">
                            {mainAgent?.avatarUrl ? <img src={mainAgent.avatarUrl} alt="" className="object-cover w-full h-full" /> : mainAgent?.name?.charAt(0)}
                        </div>
                        <p className="text-xs text-gray-400 font-medium truncate flex-1">{mainAgent?.name} {mainAgent?.lastName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleContact} className="flex-1 bg-accent-orange/10 hover:bg-accent-orange text-accent-orange hover:text-white transition-colors border border-accent-orange/30 rounded-lg py-2 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(255,106,0,0.1)]">
                            Contactar
                        </button>
                        <button onClick={handleViewDetails} className="flex-1 bg-white/[0.03] hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-glass-border rounded-lg py-2 text-xs font-medium text-center">
                            Detalles
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Filters Panel (shared) ──────────────────────────────────────
const FiltersPanel = ({
    tipo, setTipo, dormitorios, setDormitorios, banos, setBanos, priceRange, setPriceRange, priceMode, setPriceMode, exactPrice, setExactPrice,
    mascotas, setMascotas, estacionamiento, setEstacionamiento, patio, setPatio, piscina, setPiscina,
    tipoVivienda, setTipoVivienda, terrenoMin, setTerrenoMin, terrenoMax, setTerrenoMax, construccionMin, setConstruccionMin, construccionMax, setConstruccionMax,
    clearFilters, hasActiveFilters
}: any) => (
    <div className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(14,14,20,0.97)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 block">Tipo de Operación</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="w-full border border-glass-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-accent-orange text-white/80"
                    style={{ backgroundColor: 'rgba(14,14,20,0.95)' }}>
                    <option value="" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Todos</option>
                    <option value="venta" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Venta</option>
                    <option value="alquiler" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Alquiler</option>
                    <option value="anticretico" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Anticrético</option>
                </select>
            </div>
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 block">Tipo de Vivienda</label>
                <select value={tipoVivienda} onChange={e => setTipoVivienda(e.target.value)}
                    className="w-full border border-glass-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-accent-orange text-white/80"
                    style={{ backgroundColor: 'rgba(14,14,20,0.95)' }}>
                    <option value="" style={{ backgroundColor: '#0e0e14', color: '#ccc' }}>Cualquiera</option>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 flex items-center gap-1"><Bed size={10} /> Dormitorios</label>
                <div className="flex gap-1">
                    {['', '1', '2', '3', '4'].map(d => (
                        <button key={'bed' + d} onClick={() => setDormitorios(d)}
                            className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${dormitorios === d ? 'bg-accent-orange border-accent-orange text-white' : 'border-glass-border text-gray-500 hover:border-gray-500'}`}>
                            {d === '' ? '∞' : d + '+'}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 flex items-center gap-1"><Bath size={10} /> Baños</label>
                <div className="flex gap-1">
                    {['', '1', '2', '3', '4'].map(d => (
                        <button key={'bath' + d} onClick={() => setBanos(d)}
                            className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${banos === d ? 'bg-accent-orange border-accent-orange text-white' : 'border-glass-border text-gray-500 hover:border-gray-500'}`}>
                            {d === '' ? '∞' : d + '+'}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-1 mb-2">
            <button onClick={() => setMascotas(!mascotas)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] border transition-all ${mascotas ? 'bg-accent-orange/20 border-accent-orange text-accent-orange shadow-[0_0_15px_rgba(255,106,0,0.2)] font-bold' : 'border-glass-border text-gray-500 hover:border-white/20 bg-white/[0.03]'}`}>
                <Dog size={16} className={mascotas ? 'opacity-100' : 'opacity-40'} />
                <span>Pets</span>
            </button>
            <button onClick={() => setEstacionamiento(!estacionamiento)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] border transition-all ${estacionamiento ? 'bg-accent-orange/20 border-accent-orange text-accent-orange shadow-[0_0_15px_rgba(255,106,0,0.2)] font-bold' : 'border-glass-border text-gray-500 hover:border-white/20 bg-white/[0.03]'}`}>
                <Car size={16} className={estacionamiento ? 'opacity-100' : 'opacity-40'} />
                <span>Parqueo</span>
            </button>
            <button onClick={() => setPatio(!patio)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] border transition-all ${patio ? 'bg-accent-orange/20 border-accent-orange text-accent-orange shadow-[0_0_15px_rgba(255,106,0,0.2)] font-bold' : 'border-glass-border text-gray-500 hover:border-white/20 bg-white/[0.03]'}`}>
                <TreePine size={16} className={patio ? 'opacity-100' : 'opacity-40'} />
                <span>Patio</span>
            </button>
            <button onClick={() => setPiscina(!piscina)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] border transition-all ${piscina ? 'bg-accent-orange/20 border-accent-orange text-accent-orange shadow-[0_0_15px_rgba(255,106,0,0.2)] font-bold' : 'border-glass-border text-gray-500 hover:border-white/20 bg-white/[0.03]'}`}>
                <Waves size={16} className={piscina ? 'opacity-100' : 'opacity-40'} />
                <span>Pool</span>
            </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 block">Terreno (m²)</label>
                <div className="flex gap-1.5">
                    <input type="number" placeholder="Min" value={terrenoMin} onChange={e => setTerrenoMin(e.target.value)}
                        className="w-full min-w-0 bg-white/5 border border-glass-border px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-accent-orange" />
                    <input type="number" placeholder="Max" value={terrenoMax} onChange={e => setTerrenoMax(e.target.value)}
                        className="w-full min-w-0 bg-white/5 border border-glass-border px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-accent-orange" />
                </div>
            </div>
            <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-600 mb-1.5 block">Construcción (m²)</label>
                <div className="flex gap-1.5">
                    <input type="number" placeholder="Min" value={construccionMin} onChange={e => setConstruccionMin(e.target.value)}
                        className="w-full min-w-0 bg-white/5 border border-glass-border px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-accent-orange" />
                    <input type="number" placeholder="Max" value={construccionMax} onChange={e => setConstruccionMax(e.target.value)}
                        className="w-full min-w-0 bg-white/5 border border-glass-border px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-accent-orange" />
                </div>
            </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-widest text-gray-600 flex items-center gap-1">
                    <DollarSign size={10} /> Precio
                </label>
                <div className="flex gap-1">
                    {(['range', 'exact'] as const).map(m => (
                        <button key={m} onClick={() => setPriceMode(m)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${priceMode === m ? 'border-accent-orange text-accent-orange' : 'border-glass-border text-gray-600'}`}>
                            {m === 'range' ? 'Rango' : 'Exacto'}
                        </button>
                    ))}
                </div>
            </div>
            {priceMode === 'range' ? (
                <PriceRangeSlider min={0} max={500000}
                    valueMin={priceRange.min} valueMax={priceRange.max}
                    onChange={(mn, mx) => setPriceRange({ min: mn, max: mx })} />
            ) : (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                    <input type="number" value={exactPrice} onChange={e => setExactPrice(e.target.value)}
                        placeholder="Precio exacto" className="w-full bg-white/5 border border-glass-border pl-6 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-accent-orange" />
                </div>
            )}
        </div>

        {hasActiveFilters && (
            <button onClick={clearFilters}
                className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-accent-orange transition-colors">
                <X size={11} /> Limpiar filtros
            </button>
        )}
    </div>
);

type SheetState = 'peek' | 'expanded';

// ── Search Bar Component ────────────────────────────────────────
const SearchBar = ({
    inputValue, setInputValue, handleSearch, handleKeyDown, setQ, showFilters, setShowFilters, hasActiveFilters, fileInputRef, handleImageSearch,
    tipo, setTipo, tipoVivienda, setTipoVivienda, mascotas, setMascotas, piscina, setPiscina, estacionamiento, setEstacionamiento,
    className = ''
}: any) => (
    <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar por zona, barrio, etiquetas..."
                    className="w-full text-sm pl-9 pr-12 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-orange/50 transition-all font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }} />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {inputValue && (
                        <button onClick={() => { setInputValue(''); setQ(''); }} className="p-1 text-gray-500 hover:text-white">
                            <X size={13} />
                        </button>
                    )}
                    <button
                        onClick={handleSearch}
                        className="p-1.5 bg-accent-orange rounded-lg text-white shadow-lg shadow-accent-orange/20 hover:scale-105 transition-transform"
                    >
                        <Search size={13} />
                    </button>
                </div>
            </div>

            <input
                type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageSearch}
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-xl border border-glass-border text-gray-400 hover:border-accent-orange hover:text-accent-orange flex items-center justify-center flex-shrink-0 transition-all"
            >
                <Camera size={16} />
            </button>

            <button onClick={() => setShowFilters(!showFilters)}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 relative transition-all ${showFilters ? 'border-accent-orange text-accent-orange' : 'border-glass-border text-gray-400 hover:border-gray-400'}`}>
                <SlidersHorizontal size={15} />
                {hasActiveFilters && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-orange rounded-full" />}
            </button>
        </div>
        {/* Quick Filters pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide no-scrollbar">
            {QUICK_FILTERS.map(f => {
                const isActive = (f.field === 'tipo' && tipo === f.value) ||
                    (f.field === 'tipoVivienda' && tipoVivienda === f.value) ||
                    (f.field === 'mascotas' && mascotas === f.value) ||
                    (f.field === 'piscina' && piscina === f.value) ||
                    (f.field === 'estacionamiento' && estacionamiento === f.value);

                return (
                    <button
                        key={f.name}
                        onClick={() => {
                            if (f.field === 'tipo') setTipo(tipo === f.value ? '' : f.value as any);
                            if (f.field === 'tipoVivienda') setTipoVivienda(tipoVivienda === f.value ? '' : f.value as any);
                            if (f.field === 'mascotas') setMascotas(!mascotas);
                            if (f.field === 'piscina') setPiscina(!piscina);
                            if (f.field === 'estacionamiento') setEstacionamiento(!estacionamiento);
                        }}
                        className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${isActive ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'border-glass-border text-gray-400 hover:border-gray-500 bg-white/5'}`}
                    >
                        <span>{f.icon}</span>
                        <span className="font-medium whitespace-nowrap">{f.name}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

// ── Map Area Component ──────────────────────────────────────────
const MapArea = ({
    properties, selectProperty, onBoundsReady, className = ''
}: { properties: any[]; selectProperty: (p: any) => void; onBoundsReady: (b: L.LatLngBounds) => void; className?: string }) => (
    <div className={`w-full h-full relative ${className}`}>
        <MapContainer center={SCZ_CENTER as L.LatLngExpression} zoom={12}
            style={{ height: '100%', width: '100%', minHeight: '200px' }} zoomControl={true}
            attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <MapController onBoundsReady={onBoundsReady} />

            <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterCustomIcon}
                maxClusterRadius={40}
                showCoverageOnHover={false}
            >
                {properties.map((p: any) =>
                    p.lat && p.lng && (
                        <Marker key={p.id} position={[p.lat, p.lng] as L.LatLngExpression}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            icon={createPropertyIcon(p._count?.agents ?? 1, p.agents?.[0]?.promocionado ?? false) as any}
                            eventHandlers={{ click: () => selectProperty(p) }} />
                    )
                )}
            </MarkerClusterGroup>
        </MapContainer>
        {/* Cover Leaflet watermark area */}
        <div className="absolute bottom-0 left-0 right-0 h-5 z-[400] pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(11,11,15,0.9), transparent)' }} />
    </div>
);

export default function SearchPage() {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    const [q, setQ] = useState('');
    const [tipo, setTipo] = useState('');
    const [dormitorios, setDormitorios] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 500000 });
    const [priceMode, setPriceMode] = useState<'range' | 'exact'>('range');
    const [exactPrice, setExactPrice] = useState('');

    // New fields
    const [banos, setBanos] = useState('');
    const [mascotas, setMascotas] = useState(false);
    const [estacionamiento, setEstacionamiento] = useState(false);
    const [patio, setPatio] = useState(false);
    const [piscina, setPiscina] = useState(false);
    const [tipoVivienda, setTipoVivienda] = useState('');
    const [terrenoMin, setTerrenoMin] = useState('');
    const [terrenoMax, setTerrenoMax] = useState('');
    const [construccionMin, setConstruccionMin] = useState('');
    const [construccionMax, setConstruccionMax] = useState('');

    const [selected, setSelected] = useState<any>(null);
    const [sheetState, setSheetState] = useState<SheetState>('peek');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Map bounds — only used when user clicks "Buscar aquí"
    const [searchBounds, setSearchBounds] = useState<L.LatLngBounds | null>(null);
    const [showList, setShowList] = useState(false);

    // Called once map is ready — fires initial fetch without bounds
    const handleBoundsReady = useCallback((b: L.LatLngBounds) => {
        (window as any).__mapCurrentBounds = b;
    }, []);

    // Only called when user explicitly presses "Buscar aquí"
    const applySearchHere = () => {
        const currentBounds = (window as any).__mapCurrentBounds as L.LatLngBounds | undefined;
        if (currentBounds) setSearchBounds(currentBounds);
    };


    const handleSearch = () => {
        setQ(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const buildParams = useCallback(() => {
        const p: Record<string, string> = {};
        if (q) p.q = q;
        if (tipo) p.tipo = tipo;
        if (dormitorios) p.dormitorios = dormitorios;
        if (banos) p.banos = banos;
        if (priceMode === 'exact' && exactPrice) { p.minPrecio = exactPrice; p.maxPrecio = exactPrice; }
        else if (priceMode === 'range') {
            if (priceRange.min > 0) p.minPrecio = String(priceRange.min);
            if (priceRange.max < 500000) p.maxPrecio = String(priceRange.max);
        }

        if (mascotas) p.mascotas = 'true';
        if (estacionamiento) p.estacionamiento = 'true';
        if (patio) p.patio = 'true';
        if (piscina) p.piscina = 'true';
        if (tipoVivienda) p.tipoVivienda = tipoVivienda;
        if (terrenoMin) p.terrenoMin = terrenoMin;
        if (terrenoMax) p.terrenoMax = terrenoMax;
        if (construccionMin) p.construccionMin = construccionMin;
        if (construccionMax) p.construccionMax = construccionMax;

        // Add spatial boundaries
        if (searchBounds) {
            p.minLat = String(searchBounds.getSouth());
            p.maxLat = String(searchBounds.getNorth());
            p.minLng = String(searchBounds.getWest());
            p.maxLng = String(searchBounds.getEast());
        }

        return p;
    }, [q, tipo, dormitorios, priceRange, priceMode, exactPrice, searchBounds]);

    const { data: properties = [], isLoading, isFetching } = useQuery({
        // searchBounds only changes when user clicks "Buscar aquí" — no re-fetch on pan/zoom
        queryKey: ['properties', q, tipo, dormitorios, banos, priceRange, priceMode, exactPrice, mascotas, estacionamiento, patio, piscina, tipoVivienda, terrenoMin, terrenoMax, construccionMin, construccionMax, searchBounds?.toBBoxString()],
        queryFn: async () => {
            try {
                const r = await api.get(`/search?${new URLSearchParams(buildParams())}`);
                // Backend now returns { data, total, hasMore } — extract the array
                return Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            }
            catch { return []; }
        },
        staleTime: 5 * 60 * 1000, // Cache 5 minutes
        enabled: true,
    });

    // Always show all markers — no hiding on pan/zoom
    const displayProperties = properties;

    const handleImageSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert('Buscando por imagen: ' + file.name + ' (Funcionalidad IA en desarrollo)');
        }
    };

    const hasActiveFilters = tipo || dormitorios || banos || mascotas || estacionamiento || patio || piscina || tipoVivienda || terrenoMin || terrenoMax || construccionMin || construccionMax ||
        (priceMode === 'range' && (priceRange.min > 0 || priceRange.max < 500000)) ||
        (priceMode === 'exact' && exactPrice);

    const clearFilters = () => {
        setTipo(''); setDormitorios(''); setBanos(''); setPriceRange({ min: 0, max: 500000 }); setExactPrice('');
        setMascotas(false); setEstacionamiento(false); setPatio(false); setPiscina(false); setTipoVivienda(''); setTerrenoMin(''); setTerrenoMax(''); setConstruccionMin(''); setConstruccionMax('');
    };

    // Click on marker — just show panel, DO NOT move/zoom the map
    const selectProperty = (p: any) => {
        setSelected(p);
        // flyTo intentionally removed: map stays put when selecting a property
    };

    /* ════════════════════════════════════════════════
       DESKTOP LAYOUT  (md and above)
    ════════════════════════════════════════════════ */
    return (
        <div className="relative" style={{ height: 'calc(100vh - 10rem)' }}>

            {/* ── DESKTOP (hidden on mobile) ── */}
            <div className="hidden md:flex w-full h-full gap-0">

                {/* Left sidebar panel — collapsible */}
                <AnimatePresence>
                    {showList && (
                        <motion.div
                            initial={{ x: -380, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -380, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                            className="w-96 flex-shrink-0 flex flex-col border-r border-glass-border overflow-hidden relative z-10"
                            style={{ background: 'rgba(11,11,15,0.98)' }}
                        >
                            {/* Sidebar header */}
                            <div className="flex-shrink-0 p-4 border-b border-glass-border">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold">Propiedades ({displayProperties.length})</span>
                                    <button onClick={() => setShowList(false)} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <SearchBar
                                    inputValue={inputValue} setInputValue={setInputValue}
                                    handleSearch={handleSearch} handleKeyDown={handleKeyDown}
                                    q={q} setQ={setQ} showFilters={showFilters} setShowFilters={setShowFilters}
                                    hasActiveFilters={hasActiveFilters} fileInputRef={fileInputRef}
                                    handleImageSearch={handleImageSearch}
                                    tipo={tipo} setTipo={setTipo} tipoVivienda={tipoVivienda} setTipoVivienda={setTipoVivienda}
                                    mascotas={mascotas} setMascotas={setMascotas} piscina={piscina} setPiscina={setPiscina}
                                    estacionamiento={estacionamiento} setSetEstacionamiento={setEstacionamiento}
                                />
                                <AnimatePresence>
                                    {showFilters && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                                            <FiltersPanel
                                                tipo={tipo} setTipo={setTipo} dormitorios={dormitorios} setDormitorios={setDormitorios} banos={banos} setBanos={setBanos}
                                                priceRange={priceRange} setPriceRange={setPriceRange} priceMode={priceMode} setPriceMode={setPriceMode}
                                                exactPrice={exactPrice} setExactPrice={setExactPrice}
                                                mascotas={mascotas} setMascotas={setMascotas} estacionamiento={estacionamiento} setEstacionamiento={setEstacionamiento} patio={patio} setPatio={setPatio} piscina={piscina} setPiscina={setPiscina}
                                                tipoVivienda={tipoVivienda} setTipoVivienda={setTipoVivienda} terrenoMin={terrenoMin} setTerrenoMin={setTerrenoMin} terrenoMax={terrenoMax} setTerrenoMax={terrenoMax}
                                                construccionMin={construccionMin} setConstruccionMin={setConstruccionMin} construccionMax={construccionMax} setConstruccionMax={construccionMax}
                                                clearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-accent-orange" />
                                        <span className="text-xs text-gray-500">
                                            {isLoading ? 'Buscando...' : `${displayProperties.length} propiedades`}
                                        </span>
                                        {tipo && <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${tipoColor[tipo] || ''}`}>{tipo}</span>}
                                    </div>
                                    {isFetching && <LoaderSpinner />}
                                </div>
                            </div>

                            {/* Sidebar property list */}
                            <div className="flex-1 overflow-y-auto p-3">
                                {isLoading && !displayProperties.length ? (
                                    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">Cargando zona actual...</div>
                                ) : displayProperties.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-sm gap-2">
                                        <Search size={22} className="opacity-30" />
                                        Sin resultados en esta zona
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5">
                                        {displayProperties.map((p: any) => (
                                            <PropertyCard key={p.id} p={p} selected={selected?.id === p.id}
                                                onClick={() => selectProperty(p)} layout="sidebar" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Right map area */}
                <div className="flex-1 relative h-full">
                    <MapArea properties={displayProperties} selectProperty={selectProperty}
                        onBoundsReady={handleBoundsReady}
                        className="absolute inset-0 z-0" />

                    {/* "Buscar aquí" — always visible, only fetches on demand */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500]">
                        <button
                            onClick={applySearchHere}
                            className="shadow-xl px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 border bg-bg-dark/90 text-gray-300 border-glass-border hover:border-accent-orange hover:text-accent-orange"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                            Buscar aquí
                        </button>
                    </div>

                    {/* Toggle list button */}
                    {!showList && (
                        <button
                            onClick={() => setShowList(true)}
                            className="absolute top-4 left-4 z-[500] bg-bg-dark/90 border border-glass-border text-gray-300 hover:text-white hover:border-accent-orange px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all shadow-xl"
                        >
                            <ChevronUp size={14} />
                            Ver lista ({displayProperties.length})
                        </button>
                    )}

                    {/* Selected property popup over map */}
                    <AnimatePresence>
                        {selected && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 z-[500] rounded-2xl overflow-hidden shadow-2xl"
                                style={{ background: 'rgba(14,14,20,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                                {selected.images?.[0]?.url && (
                                    <img src={selected.images[0].url} alt={selected.ubicacion} className="w-full h-36 object-cover" />
                                )}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border border-current capitalize ${tipoColor[selected.tipo] || ''}`}>{selected.tipo}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-glass-border text-gray-400 capitalize">{selected.tipoVivienda || 'Vivienda'}</span>
                                            </div>
                                            <p className="font-bold leading-tight text-white">{selected.ubicacion}</p>
                                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{selected.descripcion}</p>
                                            <div className="flex items-center justify-between mt-3 bg-white/5 p-2 rounded-xl border border-glass-border">
                                                <span className="text-xl font-bold text-accent-orange">${Number(selected.precio).toLocaleString()}</span>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                    {selected.dormitorios > 0 && <span className="flex items-center gap-1"><Bed size={11} />{selected.dormitorios}</span>}
                                                    <span className="flex items-center gap-1"><Bath size={11} />{selected.banos}</span>
                                                    {selected.estacionamiento && <Car size={11} />}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0"><X size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            const ag = selected.agents?.[0]?.agent;
                                            if (!ag?.id) return;
                                            navigate(`/chat?agent=${ag.id}&property=${selected.id}`);
                                        }} className="bg-accent-orange text-white rounded-lg py-2 text-sm font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-transform">
                                            Contactar
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/property/${selected.id}`); }} className="bg-white/5 border border-glass-border text-white rounded-lg py-2 text-sm font-medium hover:bg-white/10 transition-colors">
                                            Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                MOBILE LAYOUT (visible only on mobile, hidden on md+)
            ══════════════════════════════════════════════════ */}
            <div className="md:hidden relative w-full h-full">
                {/* Map — always full size behind */}
                <MapArea properties={displayProperties} selectProperty={selectProperty}
                    onBoundsReady={handleBoundsReady}
                    className="absolute inset-0 z-0" />

                {/* "Buscar aquí" — always visible on mobile */}
                <div className="absolute top-[8rem] left-1/2 -translate-x-1/2 z-[400]">
                    <button
                        onClick={applySearchHere}
                        className="shadow-xl px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 border bg-bg-dark/90 text-gray-300 border-glass-border hover:border-accent-orange hover:text-accent-orange"
                    >
                        <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                        Buscar aquí
                    </button>
                </div>

                {/* Floating search bar – compact on mobile */}
                <div className="absolute top-2 left-2 right-2 z-[500]">
                    <div className="shadow-xl rounded-xl overflow-hidden" style={{ background: 'rgba(14,14,20,0.95)', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <div className="p-2 relative">
                            <SearchBar
                                inputValue={inputValue} setInputValue={setInputValue}
                                handleSearch={handleSearch} handleKeyDown={handleKeyDown}
                                q={q} setQ={setQ} showFilters={showFilters} setShowFilters={setShowFilters}
                                hasActiveFilters={hasActiveFilters} fileInputRef={fileInputRef}
                                handleImageSearch={handleImageSearch}
                                tipo={tipo} setTipo={setTipo} tipoVivienda={tipoVivienda} setTipoVivienda={setTipoVivienda}
                                mascotas={mascotas} setMascotas={setMascotas} piscina={piscina} setPiscina={setPiscina}
                                estacionamiento={estacionamiento} setEstacionamiento={setEstacionamiento}
                            />
                        </div>
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    <div className="px-3 pb-3">
                                        <FiltersPanel
                                            tipo={tipo} setTipo={setTipo} dormitorios={dormitorios} setDormitorios={setDormitorios} banos={banos} setBanos={setBanos}
                                            priceRange={priceRange} setPriceRange={setPriceRange} priceMode={priceMode} setPriceMode={setPriceMode}
                                            exactPrice={exactPrice} setExactPrice={setExactPrice}
                                            mascotas={mascotas} setMascotas={setMascotas} estacionamiento={estacionamiento} setEstacionamiento={setEstacionamiento} patio={patio} setPatio={setPatio} piscina={piscina} setPiscina={setPiscina}
                                            tipoVivienda={tipoVivienda} setTipoVivienda={setTipoVivienda} terrenoMin={terrenoMin} setTerrenoMin={setTerrenoMin} terrenoMax={terrenoMax} setTerrenoMax={terrenoMax}
                                            construccionMin={construccionMin} setConstruccionMin={setConstruccionMin} construccionMax={construccionMax} setConstruccionMax={construccionMax}
                                            clearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Selected pin popup (above sheet) */}
                <AnimatePresence>
                    {selected && sheetState === 'peek' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="absolute left-3 right-3 z-[600] rounded-2xl overflow-hidden shadow-2xl"
                            style={{ bottom: showList ? 'calc(42% + 12px)' : '80px', background: 'rgba(14,14,20,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            {selected.images?.[0]?.url && (
                                <img src={selected.images[0].url} alt={selected.ubicacion} className="w-full h-24 object-cover" />
                            )}
                            <div className="p-3">
                                <div className="flex justify-between gap-2 items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${tipoColor[selected.tipo] || ''}`}>{selected.tipo}</span>
                                        </div>
                                        <p className="font-bold text-sm leading-tight">{selected.ubicacion}</p>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <span className="text-base font-bold text-accent-orange">${Number(selected.precio).toLocaleString()}</span>
                                            <div className="flex gap-2 text-xs text-gray-500">
                                                {selected.dormitorios > 0 && <span className="flex items-center gap-0.5"><Bed size={10} />{selected.dormitorios}</span>}
                                                <span className="flex items-center gap-0.5"><Bath size={10} />{selected.banos}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white"><X size={15} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        const ag = selected.agents?.[0]?.agent;
                                        if (!ag?.id) return;
                                        navigate(`/chat?agent=${ag.id}&property=${selected.id}`);
                                    }} className="bg-accent-orange text-white rounded-lg py-2 text-xs font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-transform">
                                        Contactar
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/property/${selected.id}`); }} className="bg-white/5 border border-glass-border text-white rounded-lg py-2 text-xs font-medium hover:bg-white/10 transition-colors">
                                        Ver Detalles
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Sheet — only when showList is true */}
                <AnimatePresence>
                    {showList && (
                        <motion.div
                            initial={{ y: '100%', height: '52%' }}
                            animate={{ y: 0, height: sheetState === 'expanded' ? '80%' : '52%' }}
                            exit={{ y: '100%' }}
                            className="absolute left-0 right-0 bottom-0 z-[500] flex flex-col rounded-t-2xl overflow-hidden"
                            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
                            style={{ background: 'rgba(11,11,15,0.99)', borderTop: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)' }}
                        >
                            <div className="flex-shrink-0 px-4 pt-3 pb-2 cursor-pointer"
                                onClick={() => setSheetState(s => s === 'expanded' ? 'peek' : 'expanded')}>
                                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-3" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-accent-orange" />
                                        <span className="text-sm font-semibold">
                                            {isLoading && !properties.length ? 'Buscando...' : `${properties.length} propiedades`}
                                        </span>
                                        {tipo && <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${tipoColor[tipo] || ''}`}>{tipo}</span>}
                                        {isFetching && <LoaderSpinner />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setShowList(false); }} className="text-gray-500 hover:text-white p-1">
                                            <X size={14} />
                                        </button>
                                        {sheetState === 'expanded' ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 relative">
                                {isLoading && !properties.length ? (
                                    <div className="flex items-center justify-center h-16 text-gray-600 text-sm">Cargando...</div>
                                ) : properties.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-20 text-gray-600 text-sm gap-2">
                                        <Search size={20} className="opacity-30" /> Sin resultados
                                    </div>
                                ) : (
                                    properties.map((p: any) => (
                                        <PropertyCard key={p.id} p={p} selected={selected?.id === p.id}
                                            onClick={() => { setSelected(p); setSheetState('peek'); }} layout="sheet" />
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating "Ver lista" button — when sheet is hidden */}
                <AnimatePresence>
                    {!showList && (
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            onClick={() => { setShowList(true); setSheetState('peek'); }}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] bg-bg-dark/95 border border-glass-border text-sm font-semibold text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:border-accent-orange transition-all active:scale-95"
                            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                        >
                            <MapPin size={14} className="text-accent-orange" />
                            Ver {properties.length > 0 ? `${properties.length} propiedades` : 'lista'}
                            <ChevronUp size={14} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

const LoaderSpinner = () => (
    <svg className="animate-spin h-3 w-3 text-accent-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
