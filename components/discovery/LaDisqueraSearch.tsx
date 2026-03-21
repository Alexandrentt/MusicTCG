// components/discovery/LaDisqueraSearch.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, X, Filter, Loader2 } from 'lucide-react';
import { SearchResult, SearchFilters, SearchEngine } from '@/lib/search/searchEngine';
import SearchCardResult from './SearchCardResult';
import useDebounce from '@/hooks/useDebounce';
import { generateCard } from '@/lib/engine/generator';

interface LaDisqueraSearchProps {
    onClose?: () => void;
    onCardDiscovered?: (cardId: string) => void;
    isOpen?: boolean;
}

export default function LaDisqueraSearch({
    onClose,
    onCardDiscovered,
    isOpen = true,
}: LaDisqueraSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({ type: 'ALL' });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debouncedQuery = useDebounce(query, 300); // 300ms debounce

    const handleSelectCard = useCallback(
        (result: SearchResult) => {
            if (onCardDiscovered && result.id) {
                onCardDiscovered(result.id);
            }
            // Opcional: Cerrar después de seleccionar?
            // onClose?.();
        },
        [onCardDiscovered]
    );

    // ════════════════════════════════════════════════════════════════════════════
    // ESC HANDLER & KEYBOARD NAV
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ESC = cerrar
            if (e.key === 'Escape') {
                if (query) {
                    setQuery('');
                    setResults([]);
                } else {
                    onClose?.();
                }
            }

            // Arrow Down = siguiente resultado
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    Math.min(prev + 1, results.length - 1)
                );
            }

            // Arrow Up = resultado anterior
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            }

            // Enter = seleccionar
            if (e.key === 'Enter' && results[selectedIndex]) {
                handleSelectCard(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [query, results, selectedIndex, onClose, handleSelectCard]);

    // Focus input al abrir
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    // ════════════════════════════════════════════════════════════════════════════
    // BÚSQUEDA (Debounced)
    // ════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            setSelectedIndex(0);

            try {
                // En producción: Buscamos en iTunes API para "descubrir" música nueva
                let url = `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedQuery)}&entity=song&limit=40`;
                const res = await fetch(url);
                const data = await res.json();

                // Convertir resultados de iTunes a SearchResults mediante el generador de cartas
                const mappedResults: SearchResult[] = (data.results || []).map((track: any) => {
                    const card = generateCard(track);
                    return {
                        id: String(track.trackId),
                        trackId: String(track.trackId),
                        name: track.trackName,
                        artist: track.artistName,
                        album: track.collectionName,
                        genre: track.primaryGenreName,
                        artworkUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
                        matchScore: 0.9, // Valor base para resultados de API externa
                        matchType: 'FUZZY',
                        cardData: card,
                    };
                });

                // Aplicar filtros locales si es necesario
                let filtered = mappedResults;
                if (filters.type === 'SONG') {
                    // Ya estamos filtrando por entity=song en el fetch, pero podemos filtrar por género
                }
                if (filters.genre) {
                    filtered = filtered.filter(r => r.genre === filters.genre);
                }

                setResults(filtered);
            } catch (error) {
                console.error('La Disquera Search Error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery, filters]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-10 px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="w-full max-w-5xl mx-auto flex flex-col h-[90vh]"
            >
                {/* ════════════════════════════════════════════════════════════════════ */}
                {/* SEARCH BAR */}
                {/* ════════════════════════════════════════════════════════════════════ */}

                <div className="space-y-4 bg-[#111] p-6 rounded-t-2xl border-x border-t border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">La Disquera</h2>
                            <p className="text-white/40 text-xs tracking-widest uppercase mt-1">
                                Deep Space Search Engine • Universal Music Discovery
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-white/40" />
                        </button>
                    </div>

                    {/* Search box */}
                    <div className="relative">
                        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500/50 focus-within:bg-white/10 transition-all shadow-inner">
                            <SearchIcon className="absolute left-4 w-6 h-6 text-white/30" />

                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Busca por canción, banda o género cósmico..."
                                className="w-full pl-14 pr-14 py-5 bg-transparent text-white text-lg placeholder:text-white/20 focus:outline-none font-medium"
                                autoFocus
                            />

                            {/* Clear button */}
                            {query && (
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    onClick={() => {
                                        setQuery('');
                                        setResults([]);
                                    }}
                                    className="absolute right-4 p-1.5 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-white/60 hover:text-white" />
                                </motion.button>
                            )}
                        </div>

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="absolute right-14 top-1/2 -translate-y-1/2">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                                    <Loader2 className="w-5 h-5 text-cyan-500" />
                                </motion.div>
                            </div>
                        )}
                    </div>

                    {/* Filters Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${showFilters
                                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/30'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            {showFilters ? 'Ocultar Filtros' : 'Filtros Pro'}
                        </button>

                        {/* Quick selectors */}
                        <div className="h-6 w-[1px] bg-white/10 mx-1" />

                        {['ALL', 'SONG', 'ARTIST', 'ALBUM'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilters({ ...filters, type: type as any })}
                                className={`px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${filters.type === type
                                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Expanded filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white/5 border border-white/10 rounded-xl mt-4 backdrop-blur-xl"
                            >
                                <div>
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest pl-1">Filtro Género</label>
                                    <select
                                        value={filters.genre || ''}
                                        onChange={(e) =>
                                            setFilters({ ...filters, genre: e.target.value || undefined })
                                        }
                                        className="w-full mt-2 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500/50 transition-colors"
                                    >
                                        <option value="">Todo el Multiverso</option>
                                        <option value="Rock">Rock</option>
                                        <option value="Pop">Pop</option>
                                        <option value="Electronic">Electronic</option>
                                        <option value="Hip-Hop">Hip-Hop / Rap</option>
                                        <option value="Jazz">Jazz</option>
                                        <option value="Heavy Metal">Heavy Metal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest pl-1">Rango Rareza</label>
                                    <select
                                        value={filters.rarity || ''}
                                        onChange={(e) =>
                                            setFilters({ ...filters, rarity: e.target.value as any })
                                        }
                                        className="w-full mt-2 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-cyan-500/50 transition-colors"
                                    >
                                        <option value="">Cualquier Rareza</option>
                                        <option value="BRONZE">Bronze</option>
                                        <option value="SILVER">Silver</option>
                                        <option value="GOLD">Gold</option>
                                        <option value="PLATINUM">Platinum</option>
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ════════════════════════════════════════════════════════════════════ */}
                {/* RESULTADOS COMO CARTAS */}
                {/* ════════════════════════════════════════════════════════════════════ */}

                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] border-x border-b border-white/10 p-6 rounded-b-2xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <AnimatePresence mode="wait">
                        {results.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20"
                            >
                                {results.map((result, idx) => (
                                    <motion.div
                                        key={result.id + idx}
                                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 300,
                                            damping: 30,
                                            delay: idx * 0.03
                                        }}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        <SearchCardResult
                                            result={result}
                                            isSelected={selectedIndex === idx}
                                            onClick={() => handleSelectCard(result)}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : query && !isLoading ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center py-20"
                            >
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <SearchIcon className="w-10 h-10 text-white/10" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Sin ondas detectadas</h3>
                                <p className="text-white/40 max-w-xs">
                                    No pudimos encontrar &quot;{query}&quot; en esta frecuencia. Prueba con algo más universal.
                                </p>
                            </motion.div>
                        ) : !query && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center py-20"
                            >
                                <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em]">
                                    Universal Music Discovery Engine
                                </p>
                                <div className="mt-8 flex gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 text-xs font-bold">ESC</kbd>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-wider">Cerrar</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 text-xs font-bold">↑↓</kbd>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-wider">Navegar</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 text-xs font-bold">ENTER</kbd>
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-wider">Seleccionar</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
