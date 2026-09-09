import React from 'react';
import { 
  User, Settings, BookOpen, Download, Heart, 
  Clock, LogOut, ChevronRight, ArrowUpCircle, HardDrive 
} from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';
import { APP_VERSION } from '../config/version';

export default function KindleProfileScreen({
  currentUser,
  booksCount = 0,
  onLogout,
  onOpenSettings,
  onOpenUpdates,
  hasUpdate,
  onFilterFavorites,
  onGoToLibrary,
}) {
  const isGuest = !currentUser || currentUser.isAnonymous;
  const userName = isGuest ? 'Usuario Demo' : (currentUser.displayName || currentUser.email?.split('@')[0] || 'Lector');
  const userEmail = isGuest ? 'usuario@ejemplo.com (Modo Offline)' : currentUser.email;

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col p-5 pb-24 select-none safe-top">
      {/* 1. Encabezado */}
      <header className="flex items-center justify-between pt-2 pb-5 border-b border-slate-800/80">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Mi Perfil
        </h1>

        <button
          onClick={() => {
            hapticLight();
            onOpenSettings?.();
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Configuración de la app"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* 2. Tarjeta del Usuario */}
      <div className="my-6 p-4 rounded-3xl bg-[#121824] border border-slate-800/80 flex items-center gap-4 shadow-sm">
        {/* Avatar Circular */}
        <div className="w-16 h-16 rounded-full bg-[#1e293b] border-2 border-[#007aff]/60 flex items-center justify-center text-[#007aff] shrink-0 shadow-inner">
          <User className="w-8 h-8" />
        </div>

        {/* Información */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-white truncate">
            {userName}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {userEmail}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
            {isGuest ? (
              <span className="text-amber-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Offline Local
              </span>
            ) : (
              <span className="text-emerald-400">● Conectado a la nube</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Lista de Opciones de Menú */}
      <div className="space-y-2">
        {/* Mis Libros */}
        <button
          onClick={() => {
            hapticLight();
            onGoToLibrary?.();
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <BookOpen className="w-5 h-5 text-[#007aff]" />
            <span className="text-sm font-bold text-white">Mis libros</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">{booksCount}</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </button>

        {/* Descargas */}
        <button
          onClick={() => {
            hapticLight();
            alert(`Tienes ${booksCount} libros guardados localmente en la memoria de tu dispositivo.`);
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <Download className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white">Descargas</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Favoritos */}
        <button
          onClick={() => {
            hapticLight();
            onFilterFavorites?.();
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <Heart className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-bold text-white">Favoritos</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Historial de Lectura */}
        <button
          onClick={() => {
            hapticLight();
            onGoToLibrary?.();
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white">Historial de lectura</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Configuración / Actualizaciones */}
        <button
          onClick={() => {
            hapticLight();
            onOpenUpdates?.();
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-white">Configuración y Actualizaciones</span>
          </div>
          <div className="flex items-center gap-2">
            {hasUpdate && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-400 animate-pulse">
                Nueva versión
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </button>

        {/* Cerrar Sesión */}
        <button
          onClick={() => {
            hapticMedium();
            if (window.confirm('¿Deseas cerrar tu sesión actual?')) {
              onLogout();
            }
          }}
          className="w-full p-4 rounded-2xl bg-[#121824] hover:bg-rose-500/10 border border-slate-800/80 hover:border-rose-500/30 flex items-center justify-between text-left transition-colors cursor-pointer text-slate-400 hover:text-rose-400 mt-4"
        >
          <div className="flex items-center gap-3.5">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">Cerrar sesión</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Versión de la app */}
      <div className="mt-auto pt-6 text-center text-[11px] text-slate-600">
        Lector Libros · Versión {APP_VERSION} (Kindle Clone)
      </div>
    </div>
  );
}
