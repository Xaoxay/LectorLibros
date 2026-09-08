import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, ChevronRight, Clock } from 'lucide-react';

export default function BookmarksModal({ 
  isOpen, 
  onClose, 
  bookmarks, 
  onSelectBookmark, 
  onDeleteBookmark,
  onToggleCurrentBookmark,
  isCurrentPageBookmarked,
}) {
  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          className="w-full sm:max-w-md h-[75vh] sm:h-[65vh] bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col text-slate-100 shadow-2xl safe-bottom backdrop-blur-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Barra de arrastre móvil */}
          <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Encabezado */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Marcadores Guardados</h3>
            </div>
            <button 
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-colors"
              aria-label="Cerrar marcadores"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Botón rápido para marcar / desmarcar la página actual */}
          {onToggleCurrentBookmark && (
            <div className="p-4 pb-1 border-b border-white/5">
              <button
                onClick={onToggleCurrentBookmark}
                className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98 ${
                  isCurrentPageBookmarked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isCurrentPageBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-950'}`} />
                <span>{isCurrentPageBookmarked ? 'Quitar marcador de esta página' : 'Marcar esta página actual'}</span>
              </button>
            </div>
          )}

          {/* Lista de marcadores */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(!bookmarks || bookmarks.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <Bookmark className="w-8 h-8 stroke-1 text-slate-500 opacity-60" />
                </div>
                <p className="text-base font-semibold text-slate-300">Sin marcadores todavía</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  Toca el icono de marcador en la barra superior mientras lees para guardar esta página.
                </p>
              </div>
            ) : (
              bookmarks.map(bm => (
                <div 
                  key={bm.id}
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-2xl transition-all group min-h-[64px]"
                >
                  <div 
                    className="flex-1 cursor-pointer pr-3"
                    onClick={() => {
                      onSelectBookmark(bm.cfi);
                      onClose();
                    }}
                  >
                    <h4 className="text-sm sm:text-base font-bold text-amber-400 truncate">
                      {bm.chapterTitle || 'Página marcada'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(bm.createdAt)}</span>
                      {bm.percentage != null && (
                        <span className="font-bold text-amber-400">• {bm.percentage}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        onSelectBookmark(bm.cfi);
                        onClose();
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-amber-500/20 active:bg-amber-500/30 text-slate-300 hover:text-amber-400 transition-colors"
                      title="Ir al marcador"
                      aria-label="Ir al marcador"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 active:bg-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Eliminar marcador"
                      aria-label="Eliminar marcador"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
