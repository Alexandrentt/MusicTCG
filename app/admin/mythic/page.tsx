'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SearchIcon, Star, Trash2, Plus, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import Link from 'next/link';
import Image from 'next/image';

export default function MythicAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mythics, setMythics] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Verificar si la sesión admin está activa
    if (isAdminAuthenticated()) {
      setIsAdmin(true);
      loadMythics();
    }
    setLoading(false);
  }, []);

  const loadMythics = async () => {
    const { data } = await supabase.from('mythic_songs').select('*').order('added_at', { ascending: false });
    if (data) setMythics(data);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(search)}&entity=song&limit=10`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      toast.error('Error buscando en iTunes');
    } finally {
      setIsSearching(false);
    }
  };

  const addMythic = async (track: any) => {
    try {
      const { error } = await supabase.from('mythic_songs').insert({
        track_id: String(track.trackId),
        track_name: track.trackName,
        artist_name: track.artistName,
        reason: 'Added via Admin Panel',
      });
      if (error) throw error;
      toast.success('Canción Mítica añadida con éxito');
      loadMythics();
      // Remover de los resultados de búsqueda para feedback visual
      setSearchResults(prev => prev.filter(t => String(t.trackId) !== String(track.trackId)));
    } catch (error: any) {
      toast.error('Error al añadir: ' + error.message);
    }
  };

  const removeMythic = async (id: string) => {
    try {
      const { error } = await supabase.from('mythic_songs').delete().eq('track_id', id);
      if (error) throw error;
      toast.success('Rango Mítico revocado');
      loadMythics();
    } catch (error: any) {
      toast.error('Error al revocar: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Acceso Denegado</h1>
        <p className="text-gray-400 mt-2 mb-6">Debes autenticarte como administrador primero.</p>
        <Link
          href="/admin"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
        >
          Ir al Panel de Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      {/* Header */}
      <div className="mb-8 border-b border-purple-500/20 pb-6">
        <Link href="/admin" className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-bold mb-4 w-fit">
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </Link>
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 uppercase flex items-center gap-4">
          <Star className="w-10 h-10 text-purple-500" />
          Rango Mítico
        </h1>
        <p className="text-gray-400 mt-2 font-bold tracking-widest uppercase text-xs">Administración de Cartas Exclusivas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Buscar y asignar */}
        <div>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-cyan-400">Asignar Nuevo</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar canción en iTunes..."
              className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-cyan-500 transition-colors text-white"
            />
            <button type="submit" disabled={isSearching} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50">
              {isSearching ? '...' : <SearchIcon className="w-5 h-5" />}
            </button>
          </form>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {searchResults.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  {t.artworkUrl100 && (
                    <Image src={t.artworkUrl100} alt={t.trackName} width={40} height={40} className="rounded-md flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-black text-sm line-clamp-1">{t.trackName}</h3>
                    <p className="text-xs text-gray-400 line-clamp-1">{t.artistName} — {t.collectionName}</p>
                  </div>
                </div>
                <button
                  onClick={() => addMythic(t)}
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-lg transition-colors flex-shrink-0 ml-2"
                  title="Elevar a Mítica"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
            {searchResults.length === 0 && search && !isSearching && (
              <p className="text-gray-500 text-sm italic text-center py-4">Busca una canción para elevarla a rango Mítico.</p>
            )}
          </div>
        </div>

        {/* Lista de Míticas activas */}
        <div>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-purple-400 flex items-center gap-2">
            Cartas Míticas Activas <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs">{mythics.length}</span>
          </h2>
          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-2">
            {mythics.map((m) => (
              <div key={m.track_id} className="flex items-center justify-between p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl group">
                <div className="min-w-0">
                  <h3 className="font-black text-sm uppercase line-clamp-1">{m.track_name}</h3>
                  <p className="text-xs text-gray-400 font-bold line-clamp-1">{m.artist_name}</p>
                  {m.reason && <p className="text-[10px] text-purple-400/50 mt-1">{m.reason}</p>}
                </div>
                <button
                  onClick={() => removeMythic(m.track_id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg transition-colors border border-red-500/20 hover:border-red-500/50 opacity-30 group-hover:opacity-100 flex-shrink-0 ml-2"
                  title="Revocar Rango Mítico"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {mythics.length === 0 && <p className="text-gray-500 italic text-center py-8">No hay cartas míticas asignadas aún.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
