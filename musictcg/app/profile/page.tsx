'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { Settings, Volume2, Trash2, User, LogIn, LogOut, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { t, Language } from '@/lib/i18n';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import Image from 'next/image';

export default function ProfilePage() {
  const { regalias, wildcards, language, setLanguage, playMusicInBattle, setPlayMusicInBattle, discoveryUsername, setDiscoveryUsername } = usePlayerStore();
  const { volume, setVolume } = useMusicPlayer();
  const [user, setUser] = useState<FirebaseUser | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    setMounted(true);
    return () => unsubscribe();
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

  const handleAuth = async () => {
    try {
      if (user) {
        await signOut(auth);
        toast.success(t(language, 'profile', 'logoutSuccess') || 'Sesión cerrada correctamente.');
      } else {
        await signInWithPopup(auth, googleProvider);
        toast.success(t(language, 'profile', 'loginSuccess') || 'Sesión iniciada correctamente.');
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      toast.error(error.message || 'Error de autenticación');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        toast.success('Cuenta creada correctamente.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Sesión iniciada correctamente.');
      }
      setShowEmailAuth(false);
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      toast.error(error.message || 'Error de autenticación');
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
          {user?.photoURL ? (
            <Image src={user.photoURL} alt={user.displayName || 'User'} fill className="object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={48} className="text-gray-500" />
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{user ? user.displayName : t(language, 'profile', 'guest')}</h2>
          <p className="text-sm text-gray-400">{user ? user.email : t(language, 'profile', 'loginPrompt')}</p>
        </div>
        
        {!user && showEmailAuth ? (
          <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
            {isRegistering && (
              <input 
                type="text" 
                placeholder="Nombre de usuario" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                required
              />
            )}
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
              required
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Cargando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
            </button>
            <div className="flex justify-between items-center px-2">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </button>
              <button 
                type="button"
                onClick={() => setShowEmailAuth(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 w-full mt-2">
            <button 
              onClick={handleAuth}
              className={`w-full py-2 rounded-full font-bold flex items-center justify-center gap-2 transition-colors ${user ? 'bg-[#242424] text-white hover:bg-[#333]' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              {user ? (
                <>
                  <LogOut size={18} />
                  <span>{t(language, 'profile', 'logout')}</span>
                </>
              ) : (
                <>
                  <Image src="https://www.google.com/favicon.ico" alt="Google" width={18} height={18} className="rounded-full" />
                  <span>Continuar con Google</span>
                </>
              )}
            </button>
            
            {!user && (
              <button 
                onClick={() => setShowEmailAuth(true)}
                className="w-full py-2 rounded-full font-bold flex items-center justify-center gap-2 bg-[#242424] text-white hover:bg-[#333] transition-colors border border-white/5"
              >
                <LogIn size={18} />
                <span>Iniciar con Correo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
          <span className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{t(language, 'profile', 'regalias')}</span>
          <span className="text-2xl font-bold text-white">{mounted ? regalias.toLocaleString() : '---'}</span>
        </div>
        <div className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
          <span className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{t(language, 'profile', 'wildcards')}</span>
          <span className="text-2xl font-bold text-white">
            {mounted ? (wildcards.BRONZE + wildcards.SILVER + wildcards.GOLD + wildcards.PLATINUM) : '---'}
          </span>
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
              placeholder={user?.displayName || 'Nombre de descubridor'}
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
        </div>
      </div>
    </div>
  );
}
