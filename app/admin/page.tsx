'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Lock, KeyRound, Star, CheckCircle, ChevronRight, Trash2, Globe, AlertTriangle, DollarSign, Palette, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { resetGlobalDiscoveries } from '@/lib/discovery';
import { usePlayerStore } from '@/store/usePlayerStore';
import { isAdminAuthenticated, ADMIN_SESSION_KEY } from '@/lib/adminAuth';

// Correos autorizados como administradores
const AUTHORIZED_ADMINS = ['dretty156@gmail.com'];
// Contraseña maestra de admin
const ADMIN_PASSWORD = 'REMIX_MYTHIC_MASTER';

export default function AdminGatePage() {
    const { language, featureFlags, updateFeatureFlag } = usePlayerStore();
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    useEffect(() => {
        // Verificar si ya hay sesión de admin activa
        if (isAdminAuthenticated()) {
            setIsAuthenticated(true);
        }

        // Obtener email del usuario logueado
        supabase.auth.getSession().then(({ data: { session } }) => {
            setEmail(session?.user?.email ?? null);
            setLoading(false);
        });
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Doble verificación: email autorizado + contraseña correcta
        if (!email || !AUTHORIZED_ADMINS.includes(email)) {
            setError('Tu cuenta no tiene permisos de administrador.');
            triggerShake();
            return;
        }

        if (password !== ADMIN_PASSWORD) {
            setError('Contraseña incorrecta.');
            triggerShake();
            return;
        }

        // Guardar sesión admin en sessionStorage
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
            authenticated: true,
            email,
            timestamp: Date.now(),
        }));

        setIsAuthenticated(true);
        toast.success('Acceso de administrador concedido');
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleResetData = () => {
        if (confirm('¿Estás seguro de que quieres borrar todos tus datos? Esto eliminará tu colección, mazos y regalías. Esta acción no se puede deshacer.')) {
            localStorage.removeItem('musictcg-player-storage');
            toast.success('Datos borrados. Recargando...');
            window.location.reload();
        }
    };

    const handleResetGlobal = async () => {
        if (confirm('¿ESTÁS SEGURO? Esto eliminará el progreso de descubrimiento de todos los jugadores. No se puede deshacer.')) {
            toast.info('Borrando colección global...');
            await resetGlobalDiscoveries();
            toast.success('Colección global borrada.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Si no está logueado en Supabase
    if (!email) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acceso Restringido</h1>
                <p className="text-gray-400 mt-2 max-w-md">
                    Debes iniciar sesión con una cuenta autorizada antes de acceder al panel de administración.
                </p>
                <Link href="/profile" className="mt-6 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-bold hover:bg-white/20 transition-colors">
                    Ir a Perfil
                </Link>
            </div>
        );
    }

    // Si el email no está autorizado
    if (!AUTHORIZED_ADMINS.includes(email)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acceso Denegado</h1>
                <p className="text-gray-400 mt-2 max-w-md">
                    La cuenta <span className="text-white font-bold">{email}</span> no tiene permisos de administrador.
                </p>
            </div>
        );
    }

    // Ya autenticado como admin — mostrar panel completo
    if (isAuthenticated) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-white pb-24">
                <div className="mb-8 border-b border-purple-500/20 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <span className="text-green-400 text-xs font-black uppercase tracking-widest">Sesión Admin Activa</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 uppercase">
                        Panel de Administración
                    </h1>
                    <p className="text-gray-400 mt-2 font-bold tracking-widest uppercase text-xs">
                        Conectado como {email}
                    </p>
                </div>

                {/* Sección de Gestión */}
                <div className="mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-gray-300">Gestión de Cartas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link
                            href="/admin/mythic"
                            className="group p-6 bg-gradient-to-br from-purple-950/50 to-purple-900/20 border-2 border-purple-500/30 rounded-2xl hover:border-purple-500/70 transition-all hover:scale-[1.02]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Star className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Rango Mítico</h3>
                                        <p className="text-xs text-gray-400 mt-1">Asignar y gestionar cartas míticas</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-purple-400/50 group-hover:text-purple-400 transition-colors" />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Sección de Monetización */}
                <div className="mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-gray-300 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Control de Monetización
                    </h2>
                    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6">
                        <p className="text-xs text-gray-400 mb-4">Activa o desactiva funciones de monetización globalmente.</p>
                        
                        <div className="space-y-4">
                            {/* Ads Switch */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📺</span>
                                    <div>
                                        <span className="text-sm font-bold block">Publicidad (Ads)</span>
                                        <span className="text-xs text-gray-500">Mostrar anuncios en la app</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={featureFlags.ads}
                                        onChange={(e) => updateFeatureFlag('ads', e.target.checked)}
                                    />
                                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            {/* Cosmetics Switch */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Palette className="w-6 h-6 text-pink-400" />
                                    <div>
                                        <span className="text-sm font-bold block">Cosméticos Skins</span>
                                        <span className="text-xs text-gray-500">Permitir compra de skins</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={featureFlags.cosmetics}
                                        onChange={(e) => updateFeatureFlag('cosmetics', e.target.checked)}
                                    />
                                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            {/* Battle Pass Switch */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Ticket className="w-6 h-6 text-yellow-400" />
                                    <div>
                                        <span className="text-sm font-bold block">Pase de Batalla</span>
                                        <span className="text-xs text-gray-500">Activar sistema de pase de batalla</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={featureFlags.battlePass}
                                        onChange={(e) => updateFeatureFlag('battlePass', e.target.checked)}
                                    />
                                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección Zona de Peligro */}
                <div className="mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Zona de Peligro
                    </h2>
                    <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6">
                        <p className="text-xs text-red-400/70 mb-4">Estas acciones son destructivas y no se pueden deshacer.</p>
                        
                        <div className="space-y-4">
                            {/* Borrar datos locales */}
                            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <Trash2 className="w-5 h-5 text-red-400 mt-0.5" />
                                        <div>
                                            <span className="text-sm font-bold text-red-400 block">Borrar Todos los Datos Locales</span>
                                            <span className="text-xs text-gray-500">Elimina tu colección, mazos y progreso local.</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleResetData}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-black uppercase rounded-lg transition-colors border border-red-500/30 whitespace-nowrap"
                                    >
                                        Borrar Datos
                                    </button>
                                </div>
                            </div>

                            {/* Reiniciar colección global */}
                            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <Globe className="w-5 h-5 text-orange-400 mt-0.5" />
                                        <div>
                                            <span className="text-sm font-bold text-orange-400 block">Reiniciar Colección Global (Supabase)</span>
                                            <span className="text-xs text-gray-500">Borra todas las cartas descubiertas por todos los jugadores.</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleResetGlobal}
                                        className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-black uppercase rounded-lg transition-colors border border-orange-500/30 whitespace-nowrap"
                                    >
                                        Reiniciar Global
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Formulario de contraseña
    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <div className={`w-full max-w-md transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                <div className="bg-[#0a0a0a] border-2 border-purple-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(168,85,247,0.15)]">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto bg-purple-500/10 border-2 border-purple-500/30 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-10 h-10 text-purple-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                            Acceso Admin
                        </h1>
                        <p className="text-gray-500 text-sm mt-2">
                            Ingresa la contraseña maestra para continuar.
                        </p>
                        <p className="text-purple-400/60 text-xs font-bold mt-1">
                            {email}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Contraseña maestra..."
                                className="w-full bg-white/5 border-2 border-white/10 rounded-xl pl-12 pr-4 py-4 text-white font-bold text-lg focus:outline-none focus:border-purple-500 transition-colors tracking-widest"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold px-4 py-3 rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
                        >
                            Verificar Acceso
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
