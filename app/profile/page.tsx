'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer } from '@/store/useMusicPlayer';
import { Settings, Volume2, User, LogIn, LogOut, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Image from 'next/image';
import { MatchHistory } from '@/components/MatchHistory';

export default function ProfilePage() {
  const { regalias, wildcards, language, setLanguage, playMusicInBattle, setPlayMusicInBattle, discoveryUsername, setDiscoveryUsername, role } = usePlayerStore();
  const { volume, setVolume } = useMusicPlayer();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mounted, setMounted] = useState(false);

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');  // Solo para registro, no para login
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [localUsername, setLocalUsername] = useState(discoveryUsername);

  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Handle password recovery token from URL - only on client side
    if (typeof window === 'undefined') return;
    
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setShowPasswordReset(true);
          toast.success('¡Token de recuperación válido! Puedes cambiar tu contraseña ahora.');
        }
      });
      
      return () => subscription.unsubscribe();
    }
  }, []);

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
        setLanguage(browserLang as any);
      } else {
        setLanguage('en');
      }
    }
  }, [language, setLanguage]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail.trim())) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: 'https://musictcg.vercel.app/profile',
      });

      if (error) {
        if (error.message.includes('User not found')) {
          toast.error('Correo no encontrado. Verifica tu dirección de correo.');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Revisa tu correo electrónico para restablecer tu contraseña.');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      toast.error(error.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Correo electrónico y contraseña son requeridos');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        // En registro, username es opcional (se puede usar el email como fallback)
        const displayUsername = username.trim() || email.trim().split('@')[0];
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: displayUsername,
              username: displayUsername
            }
          }
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
          } else {
            throw error;
          }
          return;
        }
        setDiscoveryUsername(displayUsername);
        toast.success('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            toast.error('Correo o contraseña incorrectos. ¿No tienes cuenta? Regístrate.');
          } else {
            throw error;
          }
          return;
        }
        // Success sign in
        const { data: { user: signedInUser } } = await supabase.auth.getUser();
        if (signedInUser?.user_metadata?.username) {
          setDiscoveryUsername(signedInUser.user_metadata.username);
        } else if (signedInUser?.user_metadata?.full_name) {
          setDiscoveryUsername(signedInUser.user_metadata.full_name);
        }
        toast.success('¡Sesión iniciada! Bienvenido de vuelta.');
      }
      setShowEmailAuth(false);
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (error: any) {
      console.error('Auth Error:', error);
      toast.error(error.message || 'Error al autenticar. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Ambos campos de contraseña son requeridos');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success('¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión.');
      setShowPasswordReset(false);
      setNewPassword('');
      setConfirmPassword('');
      // Limpiar el hash de la URL
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      console.error('Update Password Error:', error);
      toast.error(error.message || 'Error al actualizar la contraseña.');
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
          showPasswordReset ? (
            <form onSubmit={handleUpdatePassword} className="w-full flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-white">Establecer Nueva Contraseña</h3>
                <p className="text-xs text-gray-400 mt-1">Ingresa tu nueva contraseña</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50 mt-2 active:scale-95"
              >
                {isLoading ? '...' : 'ACTUALIZAR CONTRASEÑA'}
              </button>
            </form>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="w-full flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-white">Recuperar Contraseña</h3>
                <p className="text-xs text-gray-400 mt-1">Ingresa tu correo electrónico para recibir instrucciones</p>
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50 mt-2 active:scale-95"
              >
                {isLoading ? '...' : 'ENVIAR CORREO'}
              </button>
              <div className="flex justify-center items-center px-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  VOLVER AL INICIO DE SESIÓN
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                    placeholder="tu@correo.com"
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
                {isRegistering && (
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Nombre de Usuario (opcional)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all font-bold"
                      placeholder="Tu nombre de usuario"
                    />
                  </div>
                )}
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
              {!isRegistering && (
                <div className="flex justify-center items-center px-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    ¿OLVIDASTE TU CONTRASEÑA?
                  </button>
                </div>
              )}
            </form>
          )
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

        {/* Change Password - Solo para usuarios logueados */}
        {user && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LogIn size={18} className="text-gray-400" />
                <span className="text-sm font-bold">Cambiar Contraseña</span>
              </div>
            </div>
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-white/30"
                minLength={6}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                className="w-full bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-white/30"
                minLength={6}
              />
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        )}

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
      </div>
    </div>
  );
}
