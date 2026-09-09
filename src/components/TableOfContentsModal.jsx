import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Search, ChevronRight } from 'lucide-react';
import { hapticLight } from '../services/haptics';

export default function TableOfContentsModal({ isOpen, onClose, toc, onSelectChapter, currentChapter }) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filterToc = (items) => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(item => {
      const matchLabel = item.label?.toLowerCase().includes(query);
      const matchSub = item.subitems && filterToc(item.subitems).length > 0;
      return matchLabel || matchSub;
    });
  };

  const filteredToc = filterToc(toc || []);

  const renderItems = (items, depth = 0) => {
    return items.map((item, idx) => {
      const isCurrent = currentChapter && item.label?.trim() === currentChapter.trim();
      return (
        <div key={item.id || item.href || idx} className="w-full">
          <button
            onClick={() => {
              hapticLight();
              onSelectChapter(item.href);
              onClose();
            }}
            className={`w-full text-left py-3.5 px-4 rounded-xl flex items-center justify-between text-sm sm:text-base min-h-[48px] active:scale-[0.99] transition-all cursor-pointer ${
              isCurrent
                ? 'bg-amber-500/15 text-amber-400 font-bold border-l-4 border-amber-500 shadow-sm'
                : 'text-slate-200 hover:bg-white/5 active:bg-white/10 hover:text-white'
            }`}
            style={{ paddingLeft: `${16 + depth * 16}px` }}
          >
            <span className="truncate pr-2 font-medium">{item.label?.trim() || `Sección ${idx + 1}`}</span>
            <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isCurrent ? 'text-amber-400' : 'text-slate-500'}`} />
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <div className="border-l border-white/5 ml-4">
              {renderItems(item.subitems, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.4 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 110 || info.velocity.y > 350) {
              hapticLight();
              onClose();
            }
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="w-full sm:max-w-md h-[82vh] sm:h-[72vh] bg-slate-900/98 border border-white/10 rounded-t-[32px] sm:rounded-3xl flex flex-col text-slate-100 shadow-2xl safe-bottom backdrop-blur-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Barra táctil de arrastre superior */}
          <div className="w-full pt-3 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden">
            <div className="w-14 h-1.5 bg-slate-600/70 hover:bg-slate-500 rounded-full" />
          </div>

          {/* Encabezado */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Índice de Capítulos</h3>
            </div>
            <button 
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-colors"
              aria-label="Cerrar índice"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Buscador */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar capítulo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-slate-800/80 border border-white/10 rounded-xl text-base sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Lista de capítulos */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filteredToc.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {search ? 'No se encontraron capítulos' : 'Este libro no incluye índice estructurado'}
              </div>
            ) : (
              renderItems(filteredToc)
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
