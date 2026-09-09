import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Compass, Layers, FileText, CheckCircle2, 
  Upload, ArrowUpCircle, X, Sparkles, Smartphone, ChevronRight
} from 'lucide-react';
import { APP_VERSION } from '../config/version';

export default function SidebarDrawer({
  isOpen,
  onClose,
  activeFilter,
  onSelectFilter,
  totalBooks,
  epubCount,
  pdfCount,
  mangaCount,
  completedCount,
  onOpenCatalog,
  onImportClick,
  onOpenUpdates,
  hasUpdate,
  installPrompt,
  onOpenInstall,
}) {
  const navItems = [
    {
      id: 'all',
      label: 'Todos los Libros',
      icon: BookOpen,
      count: totalBooks,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    },
    {
      id: 'epub',
      label: 'Novelas EPUB',
      icon: BookOpen,
      count: epubCount,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    },
    {
      id: 'pdf',
      label: 'Documentos PDF',
      icon: FileText,
      count: pdfCount,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    },
    {
      id: 'cbz',
      label: 'Manga / Cómics',
      icon: Layers,
      count: mangaCount,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    },
    {
      id: 'completed',
      label: 'Completados',
      icon: CheckCircle2,
      count: completedCount,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fondo oscuro con desenfoque al hacer tap */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Panel lateral deslizante (Drawer) */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-72 sm:w-80 h-full bg-slate-950/95 border-r border-white/10 shadow-2xl flex flex-col justify-between z-10 safe-top safe-bottom backdrop-blur-xl"
          >
            {/* 1. Encabezado del Menú */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 flex-shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">Lector Libros</h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">v{APP_VERSION}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Cuerpo con categorías y accesos directos */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-6 scrollbar-none">
              {/* Acceso directo al Catálogo Online */}
              <div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCatalog();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent border border-indigo-500/30 hover:border-indigo-500/50 active:scale-[0.98] text-left flex items-center justify-between transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        Catálogo Online
                      </h4>
                      <p className="text-[10px] text-slate-400">+70.000 libros libres</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Filtros de la Biblioteca */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2 mb-2 block">
                  Biblioteca
                </span>

                <div className="space-y-1">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectFilter(item.id);
                          onClose();
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isActive 
                            ? `${item.activeBg} font-bold border shadow-sm` 
                            : 'text-slate-300 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span>{item.label}</span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isActive 
                            ? 'bg-amber-400 text-slate-950 font-extrabold' 
                            : 'bg-slate-900 text-slate-400 border border-white/5'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón Importar Libro */}
              <div>
                <button
                  onClick={() => {
                    onClose();
                    onImportClick();
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Importar Archivo</span>
                </button>
              </div>
            </div>

            {/* 3. Pie del Menú (Ajustes, Actualizaciones, Instalación) */}
            <div className="p-3 sm:p-4 border-t border-white/10 space-y-2">
              {/* Botón Buscar Actualizaciones */}
              {onOpenUpdates && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenUpdates();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-850 active:scale-[0.98] text-xs text-slate-300 font-semibold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowUpCircle className={`w-4 h-4 ${hasUpdate ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>Buscar Actualizaciones</span>
                  </div>
                  {hasUpdate ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                      <Sparkles className="w-3 h-3" /> Nueva
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Al día</span>
                  )}
                </button>
              )}

              {/* Botón Instalar si está en navegador */}
              {installPrompt && onOpenInstall && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenInstall();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 active:scale-[0.98] text-xs text-indigo-300 font-semibold flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Instalar en el Teléfono</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
