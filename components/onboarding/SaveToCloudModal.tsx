'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, User, Lock, CloudUpload, ArrowRight, X, Sparkles, CheckCircle } from 'lucide-react';
import { migrateGuestToUser } from '@/lib/guest/guestMigration';
import { getGuestId } from '@/lib/guest/guestManager';

interface SaveToCloudModalProps {
    onComplete: () => void;
    onSkip: () => void;
}

export default function SaveToCloudModal({ onComplete, onSkip }: SaveToCloudModalProps) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
    });
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [error, setError] = useState('');

    const handleMigrate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('LOADING');
        setError('');

        try {
            const guestId = getGuestId();
            await migrateGuestToUser(guestId, formData.email, formData.password, formData.username);
            setStatus('SUCCESS');
            setTimeout(onComplete, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al crear la cuenta.');
            setStatus('ERROR');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-black/95 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent_60%)] -z-10 animate-pulse" />

            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-lg bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    {status !== 'SUCCESS' ? (
                        <motion.div key="form">
                            {/* Header */}
                            <div className="flex flex-col items-center gap-6 mb-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                                    <CloudUpload className="w-10 h-10 text-cyan-400" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Guarda tu Legado</h2>
                                    <p className="text-sm text-white/40 font-medium max-w-xs mx-auto">Tu progreso se migrará de la sesión invitada a tu nueva cuenta global.</p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleMigrate} className="space-y-6">
                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4 group-focus-within:text-cyan-400 transition-colors">Nombre de Usuario</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="Leyenda_2026"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4 group-focus-within:text-cyan-400 transition-colors">Email (Opcional)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="tu@esencia.mus"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4 group-focus-within:text-cyan-400 transition-colors">Contraseña Segura</label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            required
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>
                                )}

                                <div className="pt-6 space-y-4">
                                    <button
                                        disabled={status === 'LOADING'}
                                        type="submit"
                                        className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 hover:bg-cyan-500 hover:text-white"
                                    >
                                        {status === 'LOADING' ? 'Procesando...' : (
                                            <>Crear Cuenta Maestra <ArrowRight className="w-5 h-5" /></>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onSkip}
                                        className="w-full py-4 bg-transparent text-white/30 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors"
                                    >
                                        Continuar como Invitado (Sin Nube)
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center gap-8"
                        >
                            <div className="w-32 h-32 rounded-full bg-cyan-500 shadow-[0_0_50px_rgba(34,211,238,0.5)] flex items-center justify-center relative">
                                <CheckCircle className="w-16 h-16 text-white" />
                                <motion.div
                                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="absolute inset-0 bg-white rounded-full"
                                />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">¡LEGADO CREADO!</h2>
                                <p className="text-cyan-400 font-black tracking-widest uppercase">Bienvenido a la red global de MusicTCG</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
