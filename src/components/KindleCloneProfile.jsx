// Profile screen from kindle-clone/App.js
import React from 'react';
import { ArrowLeft, BookOpen, LogOut, Settings, ArrowUpCircle } from 'lucide-react';
import { logoutUser } from '../services/firebase';
import { hapticLight, hapticMedium } from '../services/haptics';
import { APP_VERSION } from '../config/version';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

export default function KindleCloneProfile({ navigation, currentUser, onOpenUpdates, hasUpdate }) {
  const logout = async () => {
    try {
      hapticMedium();
      await logoutUser();
      navigation.replace('Auth');
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div
      className="min-h-full w-full flex flex-col p-6 select-none safe-top safe-bottom"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <button
          onClick={() => navigation.goBack()}
          className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
          style={{ color: COLORS.muted }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
        <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
          Mi perfil
        </h2>
        <div className="w-12" />
      </div>

      <div className="my-auto max-w-sm mx-auto w-full py-6">
        <div className="p-5 rounded-2xl border border-slate-800/80 mb-6" style={{ backgroundColor: COLORS.card }}>
          <span className="text-xs uppercase tracking-wider font-bold block mb-1" style={{ color: COLORS.muted }}>
            Cuenta activa
          </span>
          <p className="text-base font-bold text-white truncate">
            {currentUser?.email || 'Usuario Demo (Modo Offline)'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              hapticLight();
              navigation.navigate('Library');
            }}
            className="w-full p-4 rounded-xl border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
            style={{ backgroundColor: COLORS.card }}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" style={{ color: COLORS.accent }} />
              <span className="font-bold text-sm text-white">Mi Biblioteca</span>
            </div>
          </button>

          {/* Actualizaciones */}
          <button
            onClick={() => {
              hapticLight();
              onOpenUpdates?.();
            }}
            className="w-full p-4 rounded-xl border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
            style={{ backgroundColor: COLORS.card }}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-sm text-white">Comprobar Actualizaciones</span>
            </div>
            {hasUpdate && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold animate-pulse">
                v1.0.30
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full p-4 rounded-xl border border-slate-800/80 hover:bg-rose-500/10 flex items-center justify-center gap-2 font-bold text-sm transition-colors cursor-pointer mt-6"
            style={{ backgroundColor: '#111827', color: COLORS.muted }}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs pb-2" style={{ color: COLORS.muted }}>
        Kindle Clone · Versión {APP_VERSION}
      </div>
    </div>
  );
}
