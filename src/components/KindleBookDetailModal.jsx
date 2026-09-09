import React from 'react';
import { 
  ArrowLeft, MoreVertical, BookOpen, Heart, 
  Download, Trash2, Play, Sparkles 
} from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';

export default function KindleBookDetailModal({
  book,
  onClose,
  onRead,
  onDelete,
  onToggleFavorite,
}) {
  if (!book) return null;

  const progress = Math.round(book.progress || 0);

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f19] text-white flex flex-col justify-between p-6 select-none overflow-y-auto safe-top safe-bottom">
      {/* 1. Barra Superior con Volver y Opciones */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <button
          onClick={() => {
            hapticLight();
            onClose();
          }}
          className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="truncate max-w-[200px]">{book.title || book.name}</span>
        </button>

        <button
          onClick={() => alert('Opciones del libro')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Portada Grande Centrada */}
      <div className="my-auto py-6 flex flex-col items-center text-center max-w-sm mx-auto w-full">
        <div className="w-48 h-68 sm:w-52 sm:h-72 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-slate-700/60 bg-[#121824] flex items-center justify-center mb-6">
          {book.cover ? (
            <img
              src={book.cover}
              alt={book.title || book.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-slate-500">
              <BookOpen className="w-16 h-16 text-[#007aff]/60 mb-3" />
              <span className="text-xs font-bold text-center uppercase tracking-wider text-slate-400">
                {book.format || 'LIBRO'}
              </span>
            </div>
          )}
        </div>

        {/* Título y Autor */}
        <h2 className="text-2xl font-black tracking-tight text-white mb-1.5 px-4 leading-snug">
          {book.title || book.name}
        </h2>
        <p className="text-sm font-medium text-slate-400 mb-3">
          {book.author || 'Autor desconocido'}
        </p>

        {/* Pastilla de Formato */}
        <div className="inline-block px-3 py-1 rounded-md bg-[#161f30] border border-slate-700/80 text-[11px] font-extrabold uppercase tracking-wider text-blue-400 mb-6">
          {book.format || 'EPUB'}
        </div>

        {/* Barra de Progreso */}
        <div className="w-full max-w-xs mb-8">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-semibold">
            <span>Progreso de lectura</span>
            <span className="text-[#007aff] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-[#007aff] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Botón Principal Azul: Continuar leyendo */}
        <button
          onClick={() => {
            hapticMedium();
            onRead(book);
          }}
          className="w-full max-w-xs py-4 px-6 rounded-2xl bg-[#007aff] hover:bg-[#0066d6] active:scale-[0.98] text-white font-extrabold text-base shadow-xl shadow-[#007aff]/30 flex items-center justify-center gap-2 transition-all cursor-pointer mb-6"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{progress > 0 ? 'Continuar leyendo' : 'Comenzar a leer'}</span>
        </button>

        {/* Lista de Acciones */}
        <div className="w-full max-w-xs space-y-2 text-left">
          {/* Agregar a Favoritos */}
          <button
            onClick={() => {
              hapticLight();
              onToggleFavorite(book.id);
            }}
            className="w-full p-3.5 rounded-xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800 flex items-center gap-3 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${book.favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{book.favorite ? 'En favoritos' : 'Agregar a favoritos'}</span>
          </button>

          {/* Descargar / Sincronizar */}
          <button
            onClick={() => {
              hapticLight();
              alert('Este libro ya está guardado de forma permanente en tu dispositivo (Modo Offline activo).');
            }}
            className="w-full p-3.5 rounded-xl bg-[#121824] hover:bg-[#1a2334] border border-slate-800 flex items-center gap-3 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Guardado en dispositivo (Offline)</span>
          </button>

          {/* Eliminar */}
          <button
            onClick={() => {
              hapticLight();
              if (window.confirm('¿Seguro que deseas eliminar este libro?')) {
                onDelete(book.id);
                onClose();
              }
            }}
            className="w-full p-3.5 rounded-xl bg-[#121824] hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 flex items-center gap-3 text-slate-400 hover:text-rose-400 text-sm font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
