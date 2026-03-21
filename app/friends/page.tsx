'use client';

import { useState, useEffect } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { UserPlus, UserMinus, Check, X, Search, Users, Circle, ShieldBan } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function FriendsPage() {
    const { friends, requests, loading, addFriend, acceptRequest, rejectRequest, removeFriend, blockUser } = useFriends();
    const { language } = usePlayerStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<SupabaseUser | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            addFriend(searchQuery.trim());
            setSearchQuery('');
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <Users size={64} className="text-gray-600 mb-4" />
                <h2 className="text-xl font-bold mb-2">Inicia sesión</h2>
                <p className="text-gray-400 text-sm">Debes iniciar sesión en tu Perfil para gestionar tu lista de amigos.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 min-h-screen pb-24">
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-white/5">
                <h1 className="text-3xl font-black uppercase tracking-widest flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    Amigos
                </h1>
                <p className="text-gray-400 text-sm mt-1">Conecta con otros coleccionistas y retalos a duelo.</p>
            </div>

            {/* Añadir Amigo */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por Nombre de Usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#242424] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/30 text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!searchQuery.trim()}
                        className="px-6 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Añadir</span>
                    </button>
                </form>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lista de Solicitudes */}
                    {requests.length > 0 && (
                        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                            <h2 className="text-lg font-bold flex items-center justify-between">
                                Solicitudes Pendientes
                                <span className="text-xs bg-blue-500 text-black px-2 py-0.5 rounded-full font-black">{requests.length}</span>
                            </h2>
                            <div className="flex flex-col gap-2">
                                {requests.map(req => (
                                    <div key={req.requestId} className="flex items-center justify-between bg-[#242424] p-3 rounded-xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{req.fromUsername}</span>
                                            <span className="text-xs text-gray-500">quiere ser tu amigo</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => acceptRequest(req.requestId, req.fromUserId, req.fromUsername)}
                                                className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black rounded-lg transition-colors border border-green-500/30"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={() => rejectRequest(req.requestId)}
                                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-black rounded-lg transition-colors border border-red-500/30"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de Amigos */}
                    <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 md:col-span-full">
                        <h2 className="text-lg font-bold flex items-center justify-between">
                            Mis Amigos
                            <span className="text-xs bg-white text-black px-2 py-0.5 rounded-full font-black">{friends.length}</span>
                        </h2>

                        {friends.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">Aún no tienes amigos. ¡Empieza a buscarlos!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {friends.map(friend => (
                                    <div key={friend.userId} className="flex items-center justify-between bg-[#242424] p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 bg-[#333] rounded-full flex items-center justify-center font-bold text-xl uppercase text-gray-400">
                                                    {friend.username.charAt(0)}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#242424] ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{friend.username}</span>
                                                <span className="text-[10px] text-gray-500">{friend.isOnline ? 'En línea' : (friend.lastSeen ? `Visto: ${new Date(friend.lastSeen).toLocaleDateString()}` : 'Visto recientemente')}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {friend.isOnline && (
                                                <button
                                                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                                    title="Invitar a Combate"
                                                >
                                                    <Circle size={16} fill="currentColor" className="opacity-50" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => removeFriend(friend.userId)}
                                                className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Eliminar amigo"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

