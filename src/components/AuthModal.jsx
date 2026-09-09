import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, LogIn, UserPlus, LogOut, CheckCircle2, Cloud, HardDrive, Loader2, BookOpen } from 'lucide-react';
import { loginUser, registerUser, logoutUser, isFirebaseConfigured } from '../services/firebase';
import { hapticLight } from '../services/haptics';

export default function AuthModal({ isOpen, onClose, currentUser, onUserChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa tu email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      hapticLight();
      const user = await loginUser(email, password);
      onUserChange(user);
      setSuccessMsg('¡Sesión iniciada con éxito!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Por favor completa un email y contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      hapticLight();
      const user = await registerUser(email, password);
      onUserChange(user);
      setSuccessMsg('¡Cuenta creada con éxito!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al crear cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    hapticLight();
    setLoading(true);
    try {
      await logoutUser();
      onUserChange(null);
      setSuccessMsg('Sesión cerrada.');
      setTimeout(() => {
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    hapticLight();
    onUserChange({
      uid: 'guest_local',
      email: 'Modo Invitado (Offline)',
      isAnonymous: true,
    });
    onClose();
  };

  const hasCloud = isFirebaseConfigured();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm rounded-3xl bg-[#1a1d24] border border-white/10 shadow-2xl p-6 text-slate-100 overflow-hidden"
        >
          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 pt-1">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#4a6fff]/15 border border-[#4a6fff]/30 flex items-center justify-center text-[#6e8eff] shadow-lg shadow-[#4a6fff]/10">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              📚 Kindle Clone
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {currentUser && !currentUser.isAnonymous
                ? 'Gestiona tu cuenta y sincronización'
                : 'Inicia sesión para sincronizar tus libros o lee offline'}
            </p>
          </div>

          {/* Mensajes de Estado */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VISTA 1: USUARIO CON SESIÓN INICIADA */}
          {currentUser && !currentUser.isAnonymous ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4a6fff]/20 text-[#4a6fff] flex items-center justify-center font-black">
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conectado como</span>
                  <p className="text-sm font-bold text-white truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#4a6fff]" />
                  <span>Sincronización en la nube</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">Activa</span>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 active:scale-98 text-rose-300 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            /* VISTA 2: FORMULARIO DE LOGIN / CREAR CUENTA */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    autoCapitalize="none"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-white/10 focus:border-[#4a6fff] focus:ring-1 focus:ring-[#4a6fff] text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-white/10 focus:border-[#4a6fff] focus:ring-1 focus:ring-[#4a6fff] text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Botón Principal: Login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-2xl bg-[#4a6fff] hover:bg-[#3d5fe6] active:scale-98 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-[#4a6fff]/25 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 stroke-[2.5]" />}
                <span>Login</span>
              </button>

              {/* Botón Secundario: Crear cuenta */}
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#222] border border-white/10 hover:bg-[#2a2a2a] active:scale-98 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear cuenta</span>
              </button>

              {/* Opción 3: Modo Offline / Invitado */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Continuar como invitado (Modo Offline)</span>
                </button>
              </div>
            </form>
          )}

          {/* Badge informativo de modo local / nube */}
          <div className="mt-5 pt-3 border-t border-white/5 text-center">
            <span className="text-[11px] text-slate-500">
              {hasCloud 
                ? 'Conectado a Firebase Cloud Storage' 
                : 'Modo Offline nativo activo • Tus libros se guardan en el celular'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
