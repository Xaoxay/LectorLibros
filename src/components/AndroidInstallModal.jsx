import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Smartphone, Download, CheckCircle, WifiOff, 
  MoreVertical, ShieldAlert, Sparkles, Globe 
} from 'lucide-react';

export default function AndroidInstallModal({ isOpen, onClose, installPrompt }) {
  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        onClose();
      }
    }
  };

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
          className="w-full sm:max-w-lg bg-slate-900/95 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 shadow-2xl safe-bottom max-h-[90vh] overflow-y-auto backdrop-blur-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Barra de arrastre móvil */}
          <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto mb-3 sm:hidden" />

          {/* Encabezado */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Instalar en tu Celular Android</h3>
                <p className="text-xs text-slate-400">Solución paso a paso para tener la app nativa</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-colors"
              aria-label="Cerrar guía"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Si el navegador detectó la posibilidad de instalación directa con 1 clic */}
          {installPrompt && (
            <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-500/30 text-center">
              <p className="text-xs sm:text-sm text-amber-300 font-semibold mb-3">
                ¡Tu navegador soporta instalación directa con 1 clic!
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full h-13 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Instalar Aplicación Ahora</span>
              </button>
            </div>
          )}

          {/* Pasos claros para Android Chrome */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pasos en Google Chrome (Android):
            </h4>

            <div className="flex gap-3.5 p-4 bg-white/5 border border-white/5 rounded-2xl items-start">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex-shrink-0">
                1
              </span>
              <div>
                <h5 className="text-sm font-semibold text-slate-200">
                  Abre la página en Google Chrome en tu celular
                </h5>
                <p className="text-xs text-slate-400 mt-1">
                  Conéctate al mismo Wi-Fi de tu PC y abre la dirección que aparece en la consola.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 p-4 bg-white/5 border border-white/5 rounded-2xl items-start">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex-shrink-0">
                2
              </span>
              <div>
                <h5 className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                  Toca los 3 puntos <MoreVertical className="w-4 h-4 text-amber-400 inline" /> de Chrome
                </h5>
                <p className="text-xs text-slate-400 mt-1">
                  Arriba a la derecha en la barra de navegación de Chrome.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl items-start">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex-shrink-0">
                3
              </span>
              <div>
                <h5 className="text-sm font-bold text-amber-400">
                  Selecciona "Agregar a la pantalla principal" o "Instalar aplicación"
                </h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <b>Nota importante:</b> En redes locales (HTTP), Chrome suele llamarlo <b>"Agregar a la pantalla principal"</b> en vez de "Instalar". Ambas opciones hacen exactamente lo mismo: crean el icono en tu celular y la abren a pantalla completa sin barras.
                </p>
              </div>
            </div>
          </div>

          {/* Opción permanente recomendada */}
          <div className="mt-5 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h5 className="text-xs sm:text-sm font-bold text-indigo-300">
                ¿Quieres tenerla instalada para siempre con HTTPS?
              </h5>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Puedes publicar este proyecto gratis en <b>Vercel</b> o <b>GitHub Pages</b> en 2 minutos. Te dará una dirección segura <code>https://tu-lector.vercel.app</code> con botón de instalación oficial disponible desde cualquier lugar del mundo.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-5 h-12 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white font-bold text-sm transition-colors flex items-center justify-center"
          >
            Cerrar Guía
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
