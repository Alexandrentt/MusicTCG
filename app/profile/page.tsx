'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { Settings, Volume2, Trash2, User, LogIn, LogOut, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { t, Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Image from 'next/image';
import { resetGlobalDiscoveries } from '@/lib/discovery';
import { MatchHistory } from '@/components/MatchHistory';

export default function ProfilePage() {
  const { regalias, wildcards, language, setLanguage, playMusicInBattle, setPlayMusicInBattle, discoveryUsername, setDiscoveryUsername, role, featureFlags, updateFeatureFlag } = usePlayerStore();
  const { volume, setVolume } = useMusicPlayer();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mounted, setMounted] = useState(false);

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [localUsername, setLocalUsername] = useState(discoveryUsername);

  useEffect(() => {
    setLocalUsername(discoveryUsername);
  }, [discoveryUsername]);

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setDiscoveryUsername(localUsername);
    toast.success('Nombre de descubridor actualizado.');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    setMounted(true);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Detect browser language on first load if not set
    if (!language) {
      const browserLang = navigator.language.split('-')[0];
      if (['es', 'en', 'it', 'fr', 'ja'].includes(browserLang)) {
        setLanguage(browserLang as Language);
      } else {
        setLanguage('en');
      }
    }
  }, [language, setLanguage]);

  const handleResetData = () => {
    if (confirm(t(language, 'profile', 'resetConfirm'))) {
      localStorage.removeItem('musictcg-player-storage');
      window.location.reload();
    }
  };

  const handleResetGlobal = async () => {
    if (confirm(t(language, 'profile', 'resetGlobalConfirm'))) {
      toast.info('Borrando colección global...');
      await resetGlobalDiscoveries();
      toast.success('Colección global borrada. Todas las nuevas cartas usarán el sistema 1.5.');
    }
  };

  // handleAuth for Google is removed. Standard Email/Password auth handles everything via handleEmailAuth.


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !password.trim()) {
      toast.error('Nombre de usuario y contraseña son requeridos');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      // Build deterministic ghost email from username
      const cleanUsername = displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const ghostEmail = `${cleanUsername}@gmail.com`;

      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: ghostEmail,
          password,
          options: {
            data: {
              full_name: displayName.trim(),
              username: displayName.trim()
            }
          }
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este nombre de usuario ya está en uso. Intenta con otro.');
          } else {
            throw error;
          }
          return;
        }
        setDiscoveryUsername(displayName.trim());
        toast.success('¡Cuenta creada! Bienvenido a MusicTCG.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: ghostEmail,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            toast.error('Usuario o contraseña incorrectos. ¿No tienes cuenta? Regístrate.');
          } else {
            throw error;
          }
          return;
        }
        toast.success('¡Sesión iniciada! Bienvenido de vuelta.');
      }
      setShowEmailAuth(false);
    } catch (error: any) {
      console.error('Auth Error:', error);
      toast.error(error.message || 'Error al autenticar. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative min-h-screen pb-24">
      <h1 className="text-3xl font-bold">{t(language, 'profile', 'title')}</h1>
      <p className="text-gray-400 text-sm -mt-4">{t(language, 'profile', 'subtitle')}</p>

      {/* User Profile Section */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4">
        <div className="w-24 h-24 bg-[#242424] rounded-full flex items-center justify-center border-4 border-[#333] overflow-hidden relative">
          {user?.user_metadata?.avatar_url ? (
            <Image src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={48} className="text-gray-500" />
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{user ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : t(language, 'profile', 'guest')}</h2>
          <p className="text-sm text-gray-400">{user ? user.email : t(language, 'profile', 'loginPrompt')}</p>
        </div>

        {!user ? (
          <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                  placeholder="Tu nombre de usuario"
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50 mt-2 active:scale-95"
            >
              {isLoading ? '...' : (isRegistering ? 'CREAR CUENTA' : 'INICIAR SESIÓN')}
            </button>
            <div className="flex justify-center items-center px-2 mt-4">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-gray-400 hover:text-white underline font-bold"
              >
                {isRegistering ? '¿YA TIENES CUENTA? INICIA SESIÓN' : '¿NO TIENES CUENTA? REGÍSTRATE'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success('Sesión cerrada.');
              }}
              className="w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 bg-[#242424] text-white hover:bg-[#333] transition-colors border border-white/10"
            >
              <LogOut size={18} />
              <span>{t(language, 'profile', 'logout') || 'Cerrar Sesión'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl hover:border-purple-500/30 transition-all group">
          <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-2 group-hover:text-purple-400">{t(language, 'profile', 'regalias') || 'REGALÍAS'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{mounted ? regalias.toLocaleString() : '---'}</span>
            <span className="text-purple-500 font-bold text-sm">✦</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-xl hover:border-cyan-500/30 transition-all group">
          <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-2 group-hover:text-cyan-400">CARTAS OWNED</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {mounted ? (Object.keys(usePlayerStore.getState().inventory || {}).length) : '---'}
            </span>
            <span className="text-cyan-500 font-bold text-sm">🗂️</span>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="text-gray-400" size={20} />
          <h2 className="text-lg font-bold">{t(language, 'profile', 'settings')}</h2>
        </div>

        {/* Volume Control */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-gray-400" />
              <span className="text-sm font-bold">{t(language, 'profile', 'volume')}</span>
            </div>
            <span className="text-xs text-gray-400">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-white"
          />
        </div>

        {/* Discovery Username Control */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User size={18} className="text-gray-400" />
              <span className="text-sm font-bold">{t(language, 'profile', 'discoveryUsername')}</span>
            </div>
          </div>
          <form onSubmit={handleUpdateUsername} className="flex gap-2">
            <input
              type="text"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              placeholder={user?.user_metadata?.full_name || 'Nombre de descubridor'}
              className="flex-1 bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-white/30"
            />
            <button
              type="submit"
              className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Guardar
            </button>
          </form>
          <p className="text-[10px] text-gray-500">{t(language, 'profile', 'discoveryUsernameDesc')}</p>
        </div>

        {/* Language Control */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gray-400" />
              <span className="text-sm font-bold">{t(language, 'profile', 'language')}</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#242424] text-white text-sm rounded-lg px-3 py-1 border border-white/10 outline-none"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="fr">Français</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>

        {/* Music in Battle Control */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-gray-400" />
              <span className="text-sm font-bold">Música en Combate</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={playMusicInBattle}
                onChange={(e) => setPlayMusicInBattle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>

        {/* Historial de Partidas */}
        {user && (
          <>
            <hr className="border-white/10" />
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-bold">Historial de Partidas</h2>
            </div>
            <MatchHistory userId={user.id} />
          </>
        )}

        <hr className="border-white/10" />

        {/* Danger Zone */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-red-500">{t(language, 'profile', 'dangerZone')}</h3>
          <button
            onClick={handleResetData}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            <Trash2 size={18} />
            <span>{t(language, 'profile', 'resetData')}</span>
          </button>
          <p className="text-xs text-gray-500 text-center">
            {t(language, 'profile', 'resetWarning')}
          </p>

          <hr className="border-white/5 my-2" />

          <h3 className="text-sm font-bold text-orange-500">{t(language, 'profile', 'resetGlobal')}</h3>
          <button
            onClick={handleResetGlobal}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
          >
            <Globe size={18} />
            <span>{t(language, 'profile', 'resetGlobal')}</span>
          </button>
          <p className="text-xs text-gray-500 text-center">
            {t(language, 'profile', 'resetGlobalWarning')}
          </p>
        </div>
      </div>
      {/* Admin Panel (Visible only to Admin role) */}
      {(role === 'ADMIN' || user?.email === 'admin@musictcg.com') && (
        <div className="bg-red-900/10 border border-red-500/30 rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
            <Settings className="w-5 h-5" /> PANEL DE CONTROL
          </h3>
          <p className="text-xs text-gray-400">Control modular de funciones del juego (ADMIN).</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {[
              { id: 'ads', label: 'Publicidad (Ads)', icon: '📺' },
              { id: 'cosmetics', label: 'Cosméticos Skins', icon: '🎨' },
              { id: 'battlePass', label: 'Pase de Batalla', icon: '🎟️' },
            ].map((flag) => (
              <div key={flag.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{flag.icon}</span>
                  <span className="text-sm font-bold">{flag.label}</span>
                </div>
                <button
                  onClick={() => updateFeatureFlag(flag.id as any, !featureFlags[flag.id as keyof typeof featureFlags])}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${featureFlags[flag.id as keyof typeof featureFlags] ? 'bg-green-500 text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                >
                  {featureFlags[flag.id as keyof typeof featureFlags] ? 'Activado' : 'Desactivado'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      <MatchHistory userId={user?.id || 'local-guest'} />
    </div>
  );
}
