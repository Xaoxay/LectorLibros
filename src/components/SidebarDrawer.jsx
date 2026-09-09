import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Compass, Layers, FileText, CheckCircle2, Heart,
  Upload, ArrowUpCircle, X, Sparkles, Smartphone, ChevronRight, HardDrive
} from 'lucide-react';
import { APP_VERSION } from '../config/version';

export default function SidebarDrawer({
  isOpen,
  onClose,
  activeFilter,
  onSelectFilter,
  totalBooks = 0,
  favoritesCount = 0,
  completedCount = 0,
  epubCount = 0,
  pdfCount = 0,
  mangaCount = 0,
  onOpenCatalog,
  onImportClick,
  onOpenUpdates,
  hasUpdate,
  installPrompt,
  onOpenInstall,
}) {
  const librarySections = [
    {
      id: 'all',
      label: 'Mi Biblioteca',
      icon: BookOpen,
      count: totalBooks,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      badgeClass: 'bg-amber-400 text-slate-950 font-extrabold',
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      icon: Heart,
      count: favoritesCount,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      badgeClass: 'bg-rose-500 text-white font-extrabold',
    },
    {
      id: 'completed',
      label: 'Libros Leídos',
      icon: CheckCircle2,
      count: completedCount,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      badgeClass: 'bg-emerald-500 text-white font-extrabold',
    },
  ];

  const formatSections = [
    {
      id: 'epub',
      label: 'Novelas EPUB',
      icon: BookOpen,
      count: epubCount,
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      badgeClass: 'bg-amber-400 text-slate-950 font-extrabold',
    },
    {
      id: 'pdf',
      label: 'Documentos PDF',
      icon: FileText,
      count: pdfCount,
      color: 'text-rose-400',
      activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      badgeClass: 'bg-rose-400 text-slate-950 font-extrabold',
    },
    {
      id: 'cbz',
      label: 'Manga / Cómics',
      icon: Layers,
      count: mangaCount,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
      badgeClass: 'bg-purple-400 text-slate-950 font-extrabold',
    },
  ];

  const renderNavGroup = (items) => (
    <div className="space-y-1.5">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelectFilter(item.id);
              onClose();
            }}
            className={`w-full h-12 px-3.5 rounded-2xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
              isActive 
                ? `${item.activeBg} font-bold border shadow-sm` 
                : 'text-slate-300 hover:bg-white/5 border border-transparent active:scale-[0.99]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${item.color} ${item.id === 'favorites' && isActive ? 'fill-rose-400' : ''}`} />
              <span>{item.label}</span>
            </div>

            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-colors ${
              isActive 
                ? item.badgeClass 
                : 'bg-slate-900 text-slate-400 border border-white/10'
            }`}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );

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

          {/* Panel lateral deslizante (Drawer) ancho y espacioso */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-[86vw] max-w-sm h-full bg-slate-950/98 border-r border-white/10 shadow-2xl flex flex-col justify-between z-10 safe-top safe-bottom backdrop-blur-2xl"
          >
            {/* 1. Encabezado del Menú */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex-shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-amber-400" />
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-white tracking-tight">Lector Libros</h2>
                  <span className="text-xs text-amber-400/90 font-mono font-semibold">v{APP_VERSION}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Cuerpo con categorías y accesos directos aprovechando el alto */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scrollbar-none flex flex-col">
              {/* Acceso directo destacado al Catálogo Online */}
              <div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCatalog();
                  }}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-indigo-900/30 to-purple-900/20 border border-indigo-500/30 hover:border-indigo-500/50 active:scale-[0.98] text-left flex items-center justify-between transition-all group cursor-pointer shadow-lg shadow-indigo-950/30"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-indigo-200 transition-colors">
                        Catálogo Online
                      </h4>
                      <p className="text-xs text-indigo-300/80 mt-0.5">+70.000 libros gratuitos</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Sección 1: Mi Biblioteca */}
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase px-2 mb-2 block">
                  Mi Biblioteca
                </span>
                {renderNavGroup(librarySections)}
              </div>

              {/* Sección 2: Formatos */}
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase px-2 mb-2 block">
                  Formatos de Lectura
                </span>
                {renderNavGroup(formatSections)}
              </div>

              {/* Botón Importar Libro */}
              <div>
                <button
                  onClick={() => {
                    onClose();
                    onImportClick();
                  }}
                  className="w-full h-12 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <Upload className="w-5 h-5 stroke-[2.5]" />
                  <span>Importar Archivo</span>
                </button>
              </div>

              {/* Tarjeta de información de almacenamiento (llena el espacio vacío con valor) */}
              <div className="mt-auto pt-4">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 text-xs text-slate-400">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className="font-bold text-slate-200 block truncate">Almacenamiento Local</span>
                    <span className="text-[11px] text-slate-500">Tus libros se guardan en tu celular para leer offline.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Pie del Menú (Ajustes, Actualizaciones, Instalación) */}
            <div className="p-4 sm:p-5 border-t border-white/10 space-y-2.5 safe-bottom bg-slate-950/80">
              {/* Botón Buscar Actualizaciones */}
              {onOpenUpdates && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenUpdates();
                  }}
                  className="w-full h-12 px-4 rounded-2xl bg-slate-900 border border-white/10 hover:bg-slate-850 active:scale-[0.98] text-xs text-slate-300 font-semibold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpCircle className={`w-5 h-5 ${hasUpdate ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="font-medium text-slate-200">Buscar Actualizaciones</span>
                  </div>
                  {hasUpdate ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/25">
                      <Sparkles className="w-3.5 h-3.5" /> Nueva
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Al día</span>
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
                  className="w-full h-12 px-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 active:scale-[0.98] text-xs text-indigo-300 font-semibold flex items-center gap-3 transition-all cursor-pointer"
                >
                  <Smartphone className="w-5 h-5 text-indigo-400" />
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
