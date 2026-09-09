import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Type, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../config/version';
import { hapticLight } from '../services/haptics';

export default function ReaderSettingsModal({ isOpen, onClose, settings, onUpdateSettings, onOpenUpdates }) {
  if (!isOpen) return null;

  const themes = [
    { id: 'light', label: 'Claro', bg: '#fbfbf8', text: '#1a1a1a', border: '#d4d4ce' },
    { id: 'sepia', label: 'Kindle Sepia', bg: '#f5f1e8', text: '#2b251f', border: '#d8cbb0' },
    { id: 'dark', label: 'Oscuro', bg: '#15181e', text: '#d8dee9', border: '#2e3440' },
    { id: 'amoled', label: 'AMOLED', bg: '#000000', text: '#e2e8f0', border: '#333333' },
  ];

  const fonts = [
    { id: 'serif', label: 'Serif (Novela)', font: 'Lora, Merriweather, Georgia, serif' },
    { id: 'sans', label: 'Sans (Limpio)', font: 'Inter, system-ui, sans-serif' },
    { id: 'monospace', label: 'Monospace', font: 'monospace' },
  ];

  const handleFontSizeChange = (delta) => {
    hapticLight();
    const newSize = Math.min(32, Math.max(12, (settings.fontSize || 18) + delta));
    onUpdateSettings({ ...settings, fontSize: newSize });
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
          className="w-full sm:max-w-md bg-slate-900/98 border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 text-slate-100 shadow-2xl safe-bottom backdrop-blur-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Barra táctil para arrastrar y cerrar */}
          <div className="w-14 h-1.5 bg-slate-600/70 hover:bg-slate-500 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing sm:hidden" />

          {/* Encabezado */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Ajustes de Lectura</h3>
            </div>
            <button 
              onClick={() => { hapticLight(); onClose(); }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-90 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Tema de color */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Tema de Fondo
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {themes.map(t => {
                const isSelected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      hapticLight();
                      onUpdateSettings({ ...settings, theme: t.id });
                    }}
                    className={`h-14 sm:h-16 flex flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 shadow-md cursor-pointer ${
                      isSelected 
                        ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-slate-900 font-extrabold scale-[1.02]' 
                        : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: t.bg,
                      color: t.text,
                      borderColor: isSelected ? '#f59e0b' : t.border
                    }}
                  >
                    <span className="text-xs sm:text-sm font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tamaño de letra */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Tamaño de Letra
            </label>
            <div className="flex items-center justify-between bg-slate-800/90 rounded-2xl p-2 border border-white/10 shadow-inner">
              <button
                onClick={() => handleFontSizeChange(-2)}
                disabled={settings.fontSize <= 12}
                className="w-14 h-12 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xl font-black transition-all active:scale-90 flex items-center justify-center shadow-sm cursor-pointer"
                title="Reducir letra"
              >
                A-
              </button>
              <div className="flex items-center gap-2 font-black text-amber-400">
                <Type className="w-5 h-5 text-slate-400" />
                <span className="text-base sm:text-lg">{settings.fontSize || 18} px</span>
              </div>
              <button
                onClick={() => handleFontSizeChange(2)}
                disabled={settings.fontSize >= 32}
                className="w-14 h-12 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xl font-black transition-all active:scale-90 flex items-center justify-center shadow-sm cursor-pointer"
                title="Aumentar letra"
              >
                A+
              </button>
            </div>
          </div>

          {/* 3. Tipografía */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Tipografía
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {fonts.map(f => {
                const isSelected = settings.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      hapticLight();
                      onUpdateSettings({ ...settings, fontFamily: f.id });
                    }}
                    className={`h-13 px-3 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all text-center active:scale-95 flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Interlineado */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Espaciado de Líneas
            </label>
            <div className="flex gap-2.5">
              {[
                { val: 1.4, label: 'Compacto' },
                { val: 1.6, label: 'Normal' },
                { val: 1.9, label: 'Amplio' }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => onUpdateSettings({ ...settings, lineHeight: item.val })}
                  className={`flex-1 h-13 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all active:scale-95 flex items-center justify-center ${
                    settings.lineHeight === item.val
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Versión y Actualizaciones del Sistema */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-400">Lector Libros v{APP_VERSION}</span>
            {onOpenUpdates && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpdates();
                }}
                className="text-amber-400 hover:text-amber-300 active:scale-95 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizaciones</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
