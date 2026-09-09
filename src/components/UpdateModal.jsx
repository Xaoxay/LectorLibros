import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, RefreshCw, CheckCircle2, AlertTriangle, Download, 
  Sparkles, ShieldCheck, GitBranch, Settings2, Info, ArrowUpCircle,
  ExternalLink, Copy, Check, Globe
} from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../config/version';
import { 
  checkForUpdates, applyUpdate, openUrl, getUpdateSettings, 
  saveUpdateSettings, getLastCheckTime 
} from '../services/updateService';
import { hapticLight, hapticSuccess } from '../services/haptics';

export default function UpdateModal({ isOpen, onClose, onUpdateAvailableChange }) {
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState('check'); // 'check' | 'settings'
  const [settings, setSettings] = useState({
    autoCheck: true,
    githubRepo: '',
    customUrl: '',
  });
  const [lastCheck, setLastCheck] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadConfig();
  }, [isOpen]);

  const loadConfig = async () => {
    const s = await getUpdateSettings();
    setSettings(s);
    const last = await getLastCheckTime();
    setLastCheck(last);
  };

  const handleCheck = async () => {
    hapticLight();
    setLoading(true);
    try {
      const result = await checkForUpdates(true);
      setUpdateInfo(result);
      setCheckedOnce(true);
      setLastCheck(Date.now());
      if (onUpdateAvailableChange) {
        onUpdateAvailableChange(result.hasUpdate);
      }
      if (result?.hasUpdate) {
        hapticSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    hapticLight();
    setSavingSettings(true);
    await saveUpdateSettings(settings);
    setSavingSettings(false);
    // Ejecutar chequeo con las nuevas configuraciones
    handleCheck();
  };

  const handleApply = async () => {
    if (!updateInfo) return;
    hapticSuccess();
    await applyUpdate(updateInfo);
  };

  const handleOpenGitHub = async () => {
    hapticSuccess();
    const url = updateInfo?.releasePageUrl || updateInfo?.downloadUrl;
    if (url) {
      await openUrl(url);
    }
  };

  const handleCopyLink = async () => {
    const url = updateInfo?.downloadUrl || updateInfo?.releasePageUrl || '';
    if (!url) return;
    hapticLight();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      hapticSuccess();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const formatLastCheck = (timestamp) => {
    if (!timestamp) return 'Nunca';
    const diffMin = Math.round((Date.now() - timestamp) / (1000 * 60));
    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Modo simulación de prueba para que el usuario pueda ver el flujo
  const handleSimulateUpdate = () => {
    setUpdateInfo({
      hasUpdate: true,
      currentVersion: APP_VERSION,
      latestVersion: '1.0.24',
      releaseName: 'Versión 1.0.24 (Nueva actualización)',
      releaseNotes: '• Solución al bucle de descarga de APK en Android\n• Botón directo a página de GitHub y copiar enlace para Chrome\n• Ajustes de navegación y feedback háptico',
      downloadUrl: 'https://github.com/Xaoxay/LectorLibros/releases/download/v1.0.23/LectorLibros.apk',
      releasePageUrl: 'https://github.com/Xaoxay/LectorLibros/releases/tag/v1.0.23',
      isApk: true,
      isPwaUpdate: false,
      publishedAt: '2026-09-09',
      source: 'simulación',
    });
    setCheckedOnce(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 select-none"
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
          className="w-full max-w-lg bg-slate-900/98 border border-white/10 rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 backdrop-blur-2xl safe-bottom"
          onClick={e => e.stopPropagation()}
        >
          {/* Manija táctil de arrastre superior */}
          <div className="w-full pt-3 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden">
            <div className="w-14 h-1.5 bg-slate-600/70 hover:bg-slate-500 rounded-full" />
          </div>

          {/* Encabezado */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Actualizaciones del Sistema</h3>
                <p className="text-xs text-slate-400">
                  Lector Libros <span className="text-amber-400 font-bold">v{APP_VERSION}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => { hapticLight(); onClose(); }}
              className="w-10 h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-white/10 px-5 pt-3 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('check')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'check'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Comprobar Versión
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Canal & Configuración
            </button>
          </div>

          {/* Contenido */}
          <div className="p-5 flex-1 overflow-y-auto max-h-[70vh] space-y-4">
            {activeTab === 'check' ? (
              <>
                {/* Tarjeta de estado actual */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Versión instalada:</span>
                    <span className="text-base font-extrabold text-white">v{APP_VERSION}</span>
                    <span className="text-[11px] text-slate-500 ml-2">(Compilación {BUILD_DATE})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Última comprobación:</span>
                    <span className="text-xs font-semibold text-slate-300">{formatLastCheck(lastCheck)}</span>
                  </div>
                </div>

                {/* Resultado de la búsqueda */}
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-white">Buscando nuevas versiones y parches...</p>
                    <p className="text-xs text-slate-400 mt-1">Verificando en GitHub y servidor de versiones</p>
                  </div>
                ) : updateInfo?.hasUpdate ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-5 h-5 flex-shrink-0 animate-bounce" />
                      <span className="font-extrabold text-sm sm:text-base">¡Nueva versión disponible!</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                        v{updateInfo.latestVersion}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                      <p className="font-bold text-amber-300 mb-1">Notas de la versión / Arreglos:</p>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed">
                        {updateInfo.releaseNotes}
                      </pre>
                    </div>

                    <div className="pt-2 space-y-3">
                      {updateInfo.isPwaUpdate ? (
                        <button
                          onClick={handleApply}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 active:scale-98 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-5 h-5" />
                          <span>Actualizar App Ahora (Recargar)</span>
                        </button>
                      ) : (
                        <>
                          {/* Botón principal recomendado: Abrir en GitHub */}
                          <button
                            onClick={handleOpenGitHub}
                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-5 h-5 stroke-[2.5] flex-shrink-0" />
                            <div className="text-left">
                              <div className="leading-tight font-black">Abrir en GitHub (Sin bucle)</div>
                              <div className="text-[11px] text-amber-950/85 font-semibold leading-tight">
                                Recomendado • Se descarga en Chrome con 1 toque
                              </div>
                            </div>
                          </button>

                          {/* Opciones secundarias: Descarga directa y Copiar enlace */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              onClick={handleApply}
                              className="h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              title="Intentar descarga directa de APK"
                            >
                              <Download className="w-4 h-4 text-amber-400" />
                              <span>Descarga directa</span>
                            </button>

                            <button
                              onClick={handleCopyLink}
                              className="h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              title="Copiar enlace para pegar en Chrome"
                            >
                              {copiedLink ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-400" />
                                  <span className="text-emerald-300">¡Enlace copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 text-slate-300" />
                                  <span>Copiar enlace</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Tarjeta explicativa sobre el bucle en Android */}
                          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/25 text-xs text-slate-300 leading-relaxed space-y-1.5">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>¿Por qué la descarga queda en bucle?</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Android bloquea por seguridad las descargas directas de archivos <span className="text-amber-300 font-mono font-semibold">.apk</span> dentro de pestañas embebidas. 
                              Al tocar <strong className="text-slate-200">"Abrir en GitHub"</strong> o pegar el enlace copiado en tu navegador <strong className="text-slate-200">Google Chrome</strong>, el instalador se descarga sin problemas a tu carpeta de Descargas.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : checkedOnce ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">¡Tu aplicación está actualizada!</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Tienes instalada la última versión con todas las mejoras y correcciones disponibles.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
                    <p className="text-sm text-slate-300 font-medium">Comprueba si hay correcciones o nuevas funciones</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Puedes buscar actualizaciones en cualquier momento con un solo toque.
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCheck}
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{loading ? 'Buscando...' : 'Buscar actualizaciones ahora'}</span>
                  </button>

                  <button
                    onClick={handleSimulateUpdate}
                    className="h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    title="Simular cómo se ve una actualización disponible"
                  >
                    Probar vista
                  </button>
                </div>

                {/* Mensaje de tranquilidad sobre datos */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-slate-300">Tus datos están protegidos:</strong> Al actualizar la aplicación, todos tus libros, notas, subrayados y puntos de lectura se conservan intactos.
                  </p>
                </div>
              </>
            ) : (
              /* Pestaña de Configuración de Actualizaciones */
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Comprobar automáticamente</span>
                      <span className="text-[11px] text-slate-400">Verificar actualizaciones al abrir la app</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCheck}
                      onChange={e => setSettings(prev => ({ ...prev, autoCheck: e.target.checked }))}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-slate-400" />
                    <span>Repositorio de GitHub (opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ej: tu-usuario/LectorLibros"
                    value={settings.githubRepo}
                    onChange={e => setSettings(prev => ({ ...prev, githubRepo: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Si subes la app a tu GitHub, introduce aquí tu usuario/repositorio para que la app lea automáticamente las nuevas versiones y APKs de tus Releases.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    URL de version.json alternativa (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://tu-servidor.com/version.json"
                    value={settings.customUrl}
                    onChange={e => setSettings(prev => ({ ...prev, customUrl: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    {savingSettings ? 'Guardando...' : 'Guardar y Comprobar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
