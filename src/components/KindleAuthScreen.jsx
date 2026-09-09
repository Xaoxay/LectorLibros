import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, HardDrive, Loader2 } from 'lucide-react';
import { loginUser, registerUser } from '../services/firebase';
import { hapticLight } from '../services/haptics';

export default function KindleAuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !pass) {
      setError('Ingresa tu email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      hapticLight();
      const user = await loginUser(email, pass);
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !pass) {
      setError('Completa un email y contraseña.');
      return;
    }
    if (pass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      hapticLight();
      const user = await registerUser(email, pass);
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al crear cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    hapticLight();
    const guestUser = {
      uid: 'guest_local',
      email: 'Invitado (Offline)',
      isAnonymous: true,
    };
    localStorage.setItem('lector_current_user', JSON.stringify(guestUser));
    onLoginSuccess(guestUser);
  };

  return (
    <div className="min-h-full w-full bg-[#f8f9fa] flex items-center justify-center p-5 select-none text-slate-900">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            📚 Kindle Clone
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Inicia sesión o crea una cuenta para tus lecturas
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 pl-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                className="w-full p-3 pl-3.5 rounded-xl border border-slate-300 text-sm focus:border-[#4a6fff] focus:ring-2 focus:ring-[#4a6fff]/20 outline-none text-slate-900 placeholder:text-slate-400 transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 pl-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full p-3 pl-3.5 rounded-xl border border-slate-300 text-sm focus:border-[#4a6fff] focus:ring-2 focus:ring-[#4a6fff]/20 outline-none text-slate-900 placeholder:text-slate-400 transition-all bg-white"
              />
            </div>
          </div>

          {/* Botón Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#4a6fff] hover:bg-[#3d5fe6] active:scale-[0.98] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#4a6fff]/25 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>Login</span>
          </button>

          {/* Botón Crear Cuenta */}
          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#222] hover:bg-[#111] active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear cuenta</span>
          </button>

          {/* Modo Invitado / Offline */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span>Continuar sin cuenta (Modo Offline)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
