'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CardData } from '@/lib/engine/generator';
import { getCoverArtVariants } from '@/lib/engine/artworkEnricher';
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AltArtToggle({ card }: { card: CardData }) {
    const { inventory, setCardAltArt } = usePlayerStore();
    const item = inventory[card.id];
    const isAlt = item?.useAltArt ?? false;
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (isAlt) {
            // Volver a portada oficial
            setCardAltArt(card.id, false);
            toast.info('Volviendo a la portada oficial');
            return;
        }

        setLoading(true);
        try {
            // 1. Intentar YouTube thumbnail primero
            if (card.videoId) {
                const ytUrl = `https://img.youtube.com/vi/${card.videoId}/hqdefault.jpg`;
                // Intento simple por fetch para ver si existe el video
                const probe = await fetch(ytUrl, { method: 'HEAD', mode: 'no-cors' }).catch(() => null);
                // Nota: no-cors no nos deja ver ok, pero si el card tiene videoId es altamente probable que exista
                setCardAltArt(card.id, true, ytUrl, 'youtube');
                toast.success('Arte del videoclip activado 🎬');
                setLoading(false);
                return;
            }

            // 2. Intentar Cover Art Archive (booklet/back cover)
            const variants = await getCoverArtVariants(card.artist, card.album || card.name);
            // Buscar algo que NO sea el front cover (índice > 0)
            const altImage = variants.find((url) => !url.includes(card.artworkUrl)) || variants[1] || variants[0];

            if (altImage && altImage !== card.artworkUrl) {
                setCardAltArt(card.id, true, altImage, 'caa');
                toast.success('Arte alternativo del disco activado 📀');
                setLoading(false);
                return;
            }

            // 3. Fallback: variante CSS generativa
            setCardAltArt(card.id, true, undefined, 'generative');
            toast.success('Variante visual activada ✨');
        } catch (err) {
            console.error('Error finding alt art:', err);
            toast.error('No se encontró arte alternativo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading || !item}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-lg active:scale-95 ${!item
                ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5 text-gray-600'
                : isAlt
                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isAlt ? (
                <Sparkles className="w-3.5 h-3.5 fill-current" />
            ) : (
                <ImageIcon className="w-3.5 h-3.5" />
            )}
            <span>{loading ? 'Buscando Frecuencia...' : isAlt ? 'Arte Alt. On' : 'Arte Alternativo'}</span>
        </button>
    );
}
