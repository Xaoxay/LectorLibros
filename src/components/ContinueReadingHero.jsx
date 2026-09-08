import React from 'react';
import { motion } from 'framer-motion';
import { Play, BookOpen, Clock, Sparkles } from 'lucide-react';

export default function ContinueReadingHero({ book, onOpen }) {
  if (!book) return null;

  const isCompleted = book.progress >= 99;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full rounded-3xl overflow-hidden mb-6 p-5 sm:p-7 border border-white/10 shadow-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-indigo-950/40 backdrop-blur-xl"
    >
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-7">
        {/* Portada 3D */}
        <div 
          onClick={() => onOpen(book)}
          className="book-3d-wrapper flex-shrink-0 cursor-pointer w-32 sm:w-36 aspect-[2.7/4.1]"
        >
          <div className="book-3d-cover w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-white/15 relative shadow-[0_15px_30px_-5px_rgba(0,0,0,0.8)]">
            <div className="book-spine-crease" />
            <div className="book-page-edges" />
            {book.cover ? (
              <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full p-3 bg-gradient-to-br from-indigo-950 via-slate-900 to-amber-950 flex flex-col justify-between text-center relative">
                <div className="absolute inset-1.5 border border-amber-400/20 rounded-lg pointer-events-none" />
                <span className="text-[10px] text-amber-400/90 font-bold uppercase truncate">
                  {book.author}
                </span>
                <BookOpen className="w-7 h-7 text-amber-400/60 mx-auto" />
                <h5 className="font-serif text-xs font-bold text-white line-clamp-2">
                  {book.title}
                </h5>
              </div>
            )}
          </div>
        </div>

        {/* Detalles */}
        <div className="flex-1 flex flex-col justify-between text-center sm:text-left min-w-0 w-full">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCompleted ? 'Volver a leer' : 'Continuar leyendo'}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight line-clamp-2 leading-snug">
              {book.title}
            </h2>
            <p className="text-sm text-slate-300 font-medium truncate mt-1">
              {book.author || 'Autor desconocido'}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 mt-2.5 mb-4">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-xs font-medium">
                {book.lastChapter || 'Lectura activa'}
              </span>
              <span>•</span>
              <span className="font-bold text-amber-400">{book.progress || 0}%</span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full max-w-md mx-auto sm:mx-0 mb-5 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all duration-500"
                style={{ width: `${Math.max(5, book.progress || 0)}%` }}
              />
            </div>
          </div>

          {/* Botón táctil grande de 52px de altura */}
          <button
            onClick={() => onOpen(book)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 h-13 px-7 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-extrabold text-base shadow-xl shadow-amber-500/25 transition-all"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Reanudar Lectura</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
