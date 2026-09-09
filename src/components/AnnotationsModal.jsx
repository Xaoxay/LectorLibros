import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Highlighter, Trash2, ChevronRight, Clock, 
   Edit3, Check, Copy, MessageSquare, Search 
 } from 'lucide-react';

const COLOR_MAP = {
  yellow: {
    bg: 'bg-amber-400/20',
    border: 'border-amber-400/40',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    name: 'Amarillo',
  },
  green: {
    bg: 'bg-emerald-400/20',
    border: 'border-emerald-400/40',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    name: 'Verde',
  },
  blue: {
    bg: 'bg-sky-400/20',
    border: 'border-sky-400/40',
    text: 'text-sky-300',
    dot: 'bg-sky-400',
    name: 'Azul',
  },
  pink: {
    bg: 'bg-rose-400/20',
    border: 'border-rose-400/40',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    name: 'Rosa',
  },
};

export default function AnnotationsModal({ 
  isOpen, 
  onClose, 
  annotations = [], 
  onSelectAnnotation, 
  onDeleteAnnotation,
  onUpdateNote,
}) {
  const [filterColor, setFilterColor] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditNote = (ann) => {
    setEditingId(ann.id);
    setNoteDraft(ann.note || '');
  };

  const saveNote = async (id) => {
    await onUpdateNote(id, noteDraft.trim());
    setEditingId(null);
    setNoteDraft('');
  };

  const filtered = annotations.filter(ann => {
    if (filterColor !== 'all' && ann.color !== filterColor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (ann.text || '').toLowerCase().includes(q);
      const matchNote = (ann.note || '').toLowerCase().includes(q);
      const matchChapter = (ann.chapterTitle || '').toLowerCase().includes(q);
      return matchText || matchNote || matchChapter;
    }
    return true;
  });

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          className="w-full sm:max-w-xl max-h-[85vh] bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col text-slate-100 shadow-2xl safe-bottom backdrop-blur-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Barra de arrastre móvil */}
          <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Encabezado */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400">
                <Highlighter className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Citas y Anotaciones</h3>
                <p className="text-xs text-slate-400">
                  {annotations.length} {annotations.length === 1 ? 'fragmento resaltado' : 'fragmentos resaltados'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-colors"
              aria-label="Cerrar anotaciones"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Buscador de citas */}
          <div className="px-4 pt-3 pb-2 border-b border-white/5 flex flex-col gap-2.5">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar en tus citas y notas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-800/80 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-9 h-9 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtros de color */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterColor('all')}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  filterColor === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'bg-slate-800/70 border border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>Todas ({annotations.length})</span>
              </button>

              {Object.entries(COLOR_MAP).map(([colorKey, cfg]) => {
                const count = annotations.filter(a => a.color === colorKey).length;
                if (count === 0 && filterColor !== colorKey) return null;
                const isSel = filterColor === colorKey;
                return (
                  <button
                    key={colorKey}
                    onClick={() => setFilterColor(isSel ? 'all' : colorKey)}
                    className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                      isSel 
                        ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ring-amber-400`
                        : 'bg-slate-800/70 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span>{cfg.name} ({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de citas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <Highlighter className="w-8 h-8 stroke-1 text-slate-500 opacity-60" />
                </div>
                <p className="text-base font-semibold text-slate-300">
                  {searchQuery ? 'No se encontraron citas con esa búsqueda' : 'Aún no has resaltado ningún texto'}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  {searchQuery 
                    ? 'Intenta buscar con otras palabras.' 
                    : 'Selecciona cualquier frase con el dedo mientras lees para subrayarla en colores y añadir notas personales.'}
                </p>
              </div>
            ) : (
              filtered.map(ann => {
                const colorCfg = COLOR_MAP[ann.color] || COLOR_MAP.yellow;
                const isEditing = editingId === ann.id;

                return (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-2xl border transition-all ${colorCfg.bg} ${colorCfg.border} flex flex-col gap-3 group`}
                  >
                    {/* Encabezado de la cita: Capítulo, color y fecha */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className={`w-2 h-2 rounded-full ${colorCfg.dot} flex-shrink-0`} />
                        <span className="font-semibold text-slate-300 truncate">
                          {ann.chapterTitle || 'Capítulo'}
                        </span>
                        {ann.percentage != null && (
                          <span className="text-amber-400/90 font-bold">• {ann.percentage}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(ann.createdAt)}</span>
                      </div>
                    </div>

                    {/* Texto resaltado (Cita) */}
                    <blockquote
                      onClick={() => {
                        onSelectAnnotation(ann.cfiRange);
                        onClose();
                      }}
                      className="cursor-pointer italic font-serif text-sm sm:text-base text-slate-100 hover:text-amber-300 transition-colors border-l-2 border-white/20 pl-3 leading-relaxed"
                    >
                      "{ann.text}"
                    </blockquote>

                    {/* Nota adjunta (si tiene o si está en edición) */}
                    {isEditing ? (
                      <div className="mt-1 flex flex-col gap-2 bg-slate-900/90 p-3 rounded-xl border border-white/15">
                        <textarea
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          placeholder="Escribe tu reflexión o nota personal..."
                          className="w-full h-20 p-2.5 bg-slate-800/80 border border-white/10 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveNote(ann.id)}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Guardar Nota</span>
                          </button>
                        </div>
                      </div>
                    ) : ann.note ? (
                      <div className="bg-slate-950/40 rounded-xl p-2.5 border border-white/10 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-slate-200 flex-1 leading-snug">
                          {ann.note}
                        </p>
                        <button
                          onClick={() => startEditNote(ann)}
                          className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                          title="Editar nota"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {/* Barra de acciones de la cita */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectAnnotation(ann.cfiRange);
                            onClose();
                          }}
                          className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                        >
                          <span>Ir a la página</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {!ann.note && !isEditing && (
                          <button
                            onClick={() => startEditNote(ann)}
                            className="h-9 px-3 rounded-xl hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>+ Nota</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(ann.text, ann.id)}
                          className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                          title="Copiar cita"
                        >
                          {copiedId === ann.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteAnnotation(ann.id)}
                          className="w-9 h-9 rounded-xl hover:bg-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
                          title="Eliminar subrayado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
