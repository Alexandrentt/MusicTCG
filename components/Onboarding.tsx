'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CardData, generateCard } from '@/lib/engine/generator';
import Pack from '@/components/store/Pack';
import { Music } from 'lucide-react';

const INITIAL_SONGS: Record<string, { songs: string[]; genre: string }> = {
    rock: {
        songs: [
            'Bohemian Rhapsody', 'Stairway to Heaven', 'Hotel California', 'Sweet Child O\' Mine',
            'Smells Like Teen Spirit', 'Back In Black', 'Imagine', 'Hey Jude', 'Comfortably Numb',
            'Wish You Were Here'
        ],
        genre: 'Rock',
    },
    pop: {
        songs: [
            'Thriller', 'Billie Jean', 'Like a Prayer', 'Toxic', 'Bad Romance',
            'Oops I Did It Again', 'Shake It Off', 'Blinding Lights', 'Watermelon Sugar',
            'Levitating'
        ],
        genre: 'Pop',
    },
    urban: {
        songs: [
            'Gasolina', 'Despacito', 'Danza Kuduro', 'Mi Gente', 'Tusa',
            'Dakiti', 'Ella Baila Sola', 'Callaita', 'Safaera', 'Ginza'
        ],
        genre: 'Hip-Hop',
    },
};

export default function Onboarding() {
    const { hasCompletedOnboarding, completeOnboarding } = usePlayerStore();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // If user already completed onboarding, don't render at all
    if (hasCompletedOnboarding) return null;

    const handleChooseDeck = async (genreKey: string) => {
        if (loading) return;
        setLoading(true);

        const config = INITIAL_SONGS[genreKey] || INITIAL_SONGS.pop;
        const cards: CardData[] = [];

        // Create 40 cards: 4 copies of 10 songs
        config.songs.forEach((song, songIdx) => {
            for (let copy = 0; copy < 4; copy++) {
                const trackData = {
                    trackId: `onboard_${genreKey}_${songIdx}_${copy}`,
                    trackName: song,
                    artistName: genreKey === 'rock' ? 'Rock Classics' : genreKey === 'pop' ? 'Pop Hits' : 'Urban Beats',
                    collectionName: genreKey === 'rock' ? 'Furia Rockera' : genreKey === 'pop' ? 'Pop Star' : 'Bajo Urbano',
                    primaryGenreName: config.genre,
                    artworkUrl100: `https://picsum.photos/seed/${genreKey}${songIdx}/300/300`,
                };

                const card = generateCard(trackData, copy < 2 ? 'BRONZE' : 'SILVER');
                cards.push(card);
            }
        });

        completeOnboarding(
            genreKey === 'rock' ? 'Furia Rockera' : genreKey === 'pop' ? 'Pop Star' : 'Bajo Urbano',
            cards,
        );
        setLoading(false);
        setStep(3); // Show hook step
    };

    return (
        <AnimatePresence>
            {step < 4 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.4 } }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl"
                >
                    <div className="max-w-4xl w-full p-8 relative flex flex-col items-center justify-center text-center">

                        {/* Step 0: Welcome */}
                        {step === 0 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
                                    <Music className="w-12 h-12 text-white" />
                                </div>
                                <h1 className="text-5xl font-black italic uppercase tracking-tighter">Bienvenido a MusicTCG</h1>
                                <p className="text-xl text-gray-400">Es hora de fundar tu sello discográfico.</p>

                                <button
                                    onClick={() => setStep(1)}
                                    className="mt-8 bg-white text-black font-black py-4 px-12 rounded-full text-xl hover:scale-105 transition-transform"
                                >
                                    Comenzar
                                </button>
                            </motion.div>
                        )}

                        {/* Step 1: Choose Deck */}
                        {step === 1 && (
                            <motion.div
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="flex flex-col items-center w-full"
                            >
                                <h2 className="text-4xl font-black mb-2">Elige tu Estilo</h2>
                                <p className="text-gray-400 mb-8">Selecciona tu primer mazo preconstruido (40 cartas).</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                    <div
                                        onClick={() => handleChooseDeck('rock')}
                                        className="bg-red-900/30 border-2 border-red-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 hover:bg-red-900/50 transition-all"
                                    >
                                        <h3 className="text-2xl font-black text-red-500 mb-2">Furia Rockera</h3>
                                        <p className="text-sm text-gray-300">Agresivo y daño directo. Destruye la escena.</p>
                                    </div>

                                    <div
                                        onClick={() => handleChooseDeck('pop')}
                                        className="bg-pink-900/30 border-2 border-pink-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 hover:bg-pink-900/50 transition-all"
                                    >
                                        <h3 className="text-2xl font-black text-pink-500 mb-2">Pop Star</h3>
                                        <p className="text-sm text-gray-300">Hype y curación. Carga a tus fans y gana tiempo.</p>
                                    </div>

                                    <div
                                        onClick={() => handleChooseDeck('urban')}
                                        className="bg-purple-900/30 border-2 border-purple-500/50 rounded-2xl p-6 cursor-pointer hover:scale-105 hover:bg-purple-900/50 transition-all"
                                    >
                                        <h3 className="text-2xl font-black text-purple-500 mb-2">Bajo Urbano</h3>
                                        <p className="text-sm text-gray-300">Control y robo. Domina el beat por completo.</p>
                                    </div>
                                </div>

                                {loading && <p className="mt-8 animate-pulse text-amber-500 font-bold">Creando tu mazo...</p>}
                            </motion.div>
                        )}

                        {/* Step 3: Hook (rewards) */}
                        {step === 3 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <Pack type="GOLD" className="scale-150 my-10 animate-bounce" />
                                <h2 className="text-4xl font-black text-amber-500">¡Toma este Comodín de Oro!</h2>
                                <p className="text-xl text-gray-300 max-w-lg">
                                    Se ha añadido a tu inventario. Ve a la Disquera, escribe el nombre de tu canción favorita en el mundo y fírmala ahora mismo.
                                </p>
                                <div className="text-gray-400 text-sm mt-4">
                                    Recibiste: Mazo base (40 cartas) + Comodines (5 Bronce, 2 Plata, 1 Oro).
                                </div>
                                <button
                                    onClick={() => setStep(4)}
                                    className="mt-8 bg-amber-500 text-black font-black py-4 px-12 rounded-full text-xl hover:scale-105 transition-transform"
                                >
                                    Entrar al Estudio
                                </button>
                            </motion.div>
                        )}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
