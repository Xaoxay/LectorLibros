import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Highlighter, MessageSquare, Copy, X, Check } from 'lucide-react';

const COLORS = [
  { id: 'yellow', label: 'Amarillo', hex: '#fef08a', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-300' },
  { id: 'green', label: 'Verde', hex: '#bbf7d0', bgClass: 'bg-emerald-400', borderClass: 'border-emerald-300' },
  { id: 'blue', label: 'Azul', hex: '#bae6fd', bgClass: 'bg-sky-400', borderClass: 'border-sky-300' },
  { id: 'pink', label: 'Rosa', hex: '#fbcfe8', bgClass: 'bg-pink-400', borderClass: 'border-pink-300' },
];

export default function SelectionToolbar({ 
  selection, 
  onHighlight, 
  onAddNote, 
  onCopy, 
  onClose 
}) {
  const [copied, setCopied] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  if (!selection) return null;

  const handleCopyClick = () => {
    onCopy(selection.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleColorClick = (colorId) => {
    setSelectedColor(colorId);
    onHighlight(colorId);
  };

  const handleSaveNoteSubmit = (e) => {
    e.preventDefault();
    onAddNote(selectedColor, noteText.trim());
    setShowNoteInput(false);
    setNoteText('');
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-x-0 bottom-16 sm:bottom-20 z-50 flex justify-center px-3 pointer-events-none safe-bottom"
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="pointer-events-auto bg-slate-900/98 border border-white/20 rounded-3xl p-3 shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Vista previa pequeña del texto seleccionado */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Highlighter className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate italic font-serif">"{selection.text}"</span>
            </div>
            <button 
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex-shrink-0"
              title="Cerrar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!showNoteInput ? (
            /* Botones de acción principales */
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              {/* Paleta de 4 colores */}
              <div className="flex items-center gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleColorClick(c.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 hover:scale-110 shadow-md"
                    title={`Resaltar en ${c.label}`}
                    aria-label={`Resaltar en ${c.label}`}
                  >
                    <span className={`w-7 h-7 rounded-full ${c.bgClass} border-2 border-slate-900 shadow-inner block`} />
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-white/10 mx-0.5" />

              {/* Botón Nota y Copiar */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="h-10 px-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-amber-400 flex items-center gap-1.5 transition-all"
                  title="Añadir nota personal"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Nota</span>
                </button>

                <button
                  onClick={handleCopyClick}
                  className="w-10 h-10 rounded-2xl hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  title="Copiar cita"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Formulario rápido para escribir nota */
            <form onSubmit={handleSaveNoteSubmit} className="flex flex-col gap-2 pt-1 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Escribe tu nota para esta cita:
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  {COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedColor === c.id ? 'ring-2 ring-white' : 'opacity-60'}`}
                    >
                      <span className={`w-4 h-4 rounded-full ${c.bgClass}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Escribe tu reflexión o apunte aquí..."
                className="w-full h-20 p-2.5 bg-slate-800/90 border border-white/15 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoteInput(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Guardar Resaltado y Nota</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
