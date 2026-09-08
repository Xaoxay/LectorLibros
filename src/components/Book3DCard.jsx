import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, MoreVertical, Trash2, CheckCircle2, Flame } from 'lucide-react';

const COVER_GRADIENTS = [
  'from-indigo-950 via-slate-900 to-amber-950',
  'from-emerald-950 via-slate-900 to-teal-950',
  'from-rose-950 via-slate-900 to-purple-950',
  'from-sky-950 via-slate-900 to-indigo-950',
  'from-amber-950 via-slate-900 to-stone-900',
];

export default function Book3DCard({ book, onOpen, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const gradientIndex = Math.abs(
    (book.title || 'Libro').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % COVER_GRADIENTS.length;

  const isCompleted = book.progress >= 99;
  const isStarted = book.progress > 0 && !isCompleted;

  const format = (book.format || 'epub').toUpperCase();
  const formatColors = {
    EPUB: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
    PDF: 'bg-rose-500/25 text-rose-300 border-rose-500/40',
    CBZ: 'bg-purple-500/25 text-purple-200 border-purple-500/40',
  }[format] || 'bg-slate-800 text-slate-200 border-white/10';

  return (
    <div className="relative flex flex-col h-full">
      <motion.div
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.25 }}
        className="book-3d-wrapper relative flex flex-col h-full group cursor-pointer"
        onClick={() => onOpen(book)}
      >
        {/* Portada 3D */}
        <div className="book-3d-cover relative aspect-[2.7/4.0] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0">
          <div className="book-spine-crease" />
          <div className="book-page-edges" />

          {book.cover ? (
            <img
              src={book.cover}
              alt={book.title}
              className="w-full h-full object-cover select-none"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full p-4 flex flex-col justify-between text-center bg-gradient-to-br ${COVER_GRADIENTS[gradientIndex]} relative overflow-hidden`}>
              <div className="absolute inset-2 border border-amber-400/20 rounded-xl pointer-events-none" />

              <div className="pt-1 z-10">
                <span className="text-[11px] tracking-wider uppercase font-bold text-amber-400/90 line-clamp-1">
                  {book.author || 'Libro'}
                </span>
              </div>

              <div className="my-auto z-10 px-1">
                <BookOpen className="w-9 h-9 mx-auto text-amber-400/70 mb-2" />
                <h4 className="font-serif text-xs sm:text-sm font-bold text-white line-clamp-3 leading-snug drop-shadow-md">
                  {book.title}
                </h4>
              </div>

              <div className="pb-1 z-10">
                <div className="h-1 w-8 bg-amber-400/40 mx-auto rounded-full" />
              </div>
            </div>
          )}

          {/* Badges superiores alineados */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 items-start">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg backdrop-blur-md border shadow-md ${formatColors}`}>
              {format === 'CBZ' ? 'MANGA' : format}
            </span>

            {isCompleted ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shadow-lg">
                <CheckCircle2 className="w-3 h-3" />
                <span>Leído</span>
              </span>
            ) : isStarted ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/85 border border-amber-500/50 text-amber-400 text-[10px] font-bold shadow-lg backdrop-blur-md">
                <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{book.progress}%</span>
              </span>
            ) : null}
          </div>

          {/* Botón de opciones */}
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(prev => !prev);
              }}
              className="w-10 h-10 rounded-full bg-slate-950/85 hover:bg-slate-900 active:scale-90 text-slate-200 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-lg"
              title="Opciones"
              aria-label="Opciones del libro"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  className="absolute right-0 top-11 w-40 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 backdrop-blur-xl"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(book.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/15 transition-colors font-bold min-h-[44px]"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Eliminar</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barra de progreso */}
          {isStarted && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Título y Autor: ALTURA FIJA para garantizar alineación uniforme en toda la fila */}
        <div className="mt-2.5 px-0.5 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 group-hover:text-amber-400 transition-colors leading-snug min-h-[2.25rem]">
              {book.title}
            </h3>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
              {book.author || 'Autor desconocido'}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-1.5 border-t border-white/5">
            <span className="truncate font-semibold text-amber-400">
              {book.lastChapter ? book.lastChapter : isStarted ? `${book.progress}% leído` : 'Sin empezar'}
            </span>
            {isCompleted && (
              <span className="text-emerald-400 font-bold">
                ✓ Listo
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
