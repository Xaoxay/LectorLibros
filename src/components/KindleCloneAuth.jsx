// AuthScreen from kindle-clone/App.js
import React, { useState } from 'react';
import { Mail, Lock, Loader2, HardDrive } from 'lucide-react';
import { loginUser, registerUser } from '../services/firebase';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

export default function KindleCloneAuth({ navigation }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !pass) {
      setError('Introduce tu correo y contraseña');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      hapticMedium();
      const user = await loginUser(email.trim(), pass);
      hapticSuccess();
      navigation.replace('Library', { user });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!email.trim() || !pass) {
      setError('Introduce tu correo y contraseña');
      return;
    }
    if (pass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      hapticMedium();
      const user = await registerUser(email.trim(), pass);
      hapticSuccess();
      navigation.replace('Library', { user });
    } catch (err) {
      setError(err.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const continueOffline = () => {
    hapticLight();
    const guestUser = {
      uid: 'guest_local',
      email: 'Invitado (Modo Offline)',
      isAnonymous: true,
    };
    localStorage.setItem('lector_current_user', JSON.stringify(guestUser));
    navigation.replace('Library', { user: guestUser });
  };

  return (
    <div
      className="min-h-full w-full flex flex-col justify-center items-center p-6 select-none"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="text-4xl font-extrabold text-center mb-1 tracking-tight"
          style={{ color: COLORS.accent }}
        >
          Kindle Clone
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: COLORS.muted }}>
          Tus libros, siempre contigo.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={login} className="space-y-3.5">
          <div className="relative">
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              className="w-full p-3.5 rounded-xl border text-sm outline-none transition-all"
              style={{
                backgroundColor: '#0b1620',
                color: COLORS.text,
                borderColor: '#0a1218',
              }}
            />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full p-3.5 rounded-xl border text-sm outline-none transition-all"
              style={{
                backgroundColor: '#0b1620',
                color: COLORS.text,
                borderColor: '#0a1218',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] transition-all"
            style={{ backgroundColor: COLORS.accent }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Iniciar sesión</span>
            )}
          </button>

          <button
            type="button"
            onClick={register}
            disabled={loading}
            className="w-full py-2.5 text-center text-sm font-semibold transition-colors cursor-pointer hover:underline"
            style={{ color: COLORS.muted }}
          >
            Crear cuenta
          </button>

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={continueOffline}
              className="text-xs text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Continuar como invitado (Modo Offline)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
