import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, HardDrive } from 'lucide-react';
import KindleLogo from './KindleLogo';
import { loginUser, registerUser } from '../services/firebase';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';

export default function KindleAuthScreen({ onLoginSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !pass) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      hapticMedium();
      let user;
      if (mode === 'login') {
        user = await loginUser(email, pass);
      } else {
        if (pass.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }
        user = await registerUser(email, pass);
      }
      hapticSuccess();
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    hapticLight();
    const guestUser = {
      uid: 'guest_local',
      email: 'Invitado (Modo Offline)',
      isAnonymous: true,
    };
    localStorage.setItem('lector_current_user', JSON.stringify(guestUser));
    onLoginSuccess(guestUser);
  };

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col justify-between p-6 select-none relative safe-top safe-bottom">
      {/* 1. Barra Superior con botón Volver */}
      <div className="flex items-center justify-between w-full max-w-sm mx-auto">
        {onBack ? (
          <button
            onClick={() => {
              hapticLight();
              onBack();
            }}
            className="w-10 h-10 rounded-full bg-slate-800/40 hover:bg-slate-800/70 border border-slate-750 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* 2. Contenedor Central */}
      <div className="w-full max-w-sm mx-auto my-auto py-4">
        <div className="flex flex-col items-center text-center mb-6">
          <KindleLogo size={68} className="mb-3" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
            Kindle Clone
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {mode === 'login'
              ? 'Inicia sesión o crea una cuenta para continuar'
              : 'Regístrate para guardar y sincronizar tus libros'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Input Correo electrónico */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              className="w-full pl-10 pr-4 py-3.5 bg-[#121824] border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
            />
          </div>

          {/* Input Contraseña */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full pl-10 pr-10 py-3.5 bg-[#121824] border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Botón Principal Azul: Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-[#007aff] hover:bg-[#0066d6] active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-[#007aff]/25 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{mode === 'login' ? 'Entrar' : 'Registrarse'}</span>
            )}
          </button>

          {/* Enlace Olvidaste tu contraseña */}
          {mode === 'login' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => alert('Para restablecer tu contraseña, introduce tu correo y contacta al administrador.')}
                className="text-xs text-[#007aff] hover:underline font-medium cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {/* Separador con "o" */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0b0f19] px-3 text-xs text-slate-500 font-medium">o</span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Botón Secundario Oscuro: Crear cuenta */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800 text-white font-bold text-sm transition-all cursor-pointer"
          >
            {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta (Iniciar sesión)'}
          </button>

          {/* Modo Invitado / Offline */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Continuar como invitado (Modo Offline)</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Footer con Términos y Privacidad */}
      <div className="w-full max-w-sm mx-auto text-center text-[11px] text-slate-600 pb-2">
        <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Lector Libros es de código abierto.'); }} className="hover:text-slate-400 transition-colors">
          Términos y Condiciones
        </a>
        <span className="mx-2">|</span>
        <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Tus lecturas se almacenan de forma privada en tu dispositivo y nube propia.'); }} className="hover:text-slate-400 transition-colors">
          Política de Privacidad
        </a>
      </div>
    </div>
  );
}
