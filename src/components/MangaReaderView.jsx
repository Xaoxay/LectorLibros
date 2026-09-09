import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ArrowRightLeft, Loader2,
  Volume2, VolumeX 
} from 'lucide-react';
import PageFlipEffect from './PageFlipEffect';
import { playPageTurnSound } from '../utils/soundEffects';
import { updateBookProgress } from '../db/bookStorage';
import { hapticLight } from '../services/haptics';

export default function MangaReaderView({ bookMeta, bookBuffer, onBack }) {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [currentPage, setCurrentPage] = useState(bookMeta.lastPage || 0);
  const [mode, setMode] = useState('rtl'); // 'rtl' (Manga tradicional) | 'ltr' | 'webtoon'
  const [flipState, setFlipState] = useState(null); // 'next' | 'prev' | null
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrubber, setShowScrubber] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(bookMeta.progress >= 99);

  // Gestos táctiles y arrastre interactivo con el dedo
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0, active: false });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const urls = [];

    const loadCbz = async () => {
      try {
        setLoading(true);
        const zip = new JSZip();
        const loaded = await zip.loadAsync(bookBuffer);
        const files = [];

        loaded.forEach((path, entry) => {
          if (!entry.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(entry.name)) {
            files.push(entry);
          }
        });

        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const loadedUrls = [];
        for (const file of files) {
          const blob = await file.async('blob');
          const url = URL.createObjectURL(blob);
          urls.push(url);
          loadedUrls.push(url);
        }

        if (isMounted) {
          setImages(loadedUrls);
          const initial = Math.min(loadedUrls.length - 1, Math.max(0, (bookMeta.lastPage || 1) - 1));
          setCurrentPage(initial);
        }
      } catch (err) {
        console.error('Error al cargar manga/cómic:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCbz();

    return () => {
      isMounted = false;
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [bookBuffer]);

  const totalPages = images.length;

  const goToPage = (idx) => {
    const nextIdx = Math.min(totalPages - 1, Math.max(0, idx));
    if (nextIdx !== currentPage) {
      hapticLight();
      if (mode !== 'webtoon') {
        if (soundEnabled) playPageTurnSound();
        setFlipState(nextIdx > currentPage ? 'next' : 'prev');
        setTimeout(() => setFlipState(null), 440);
      }
      setCurrentPage(nextIdx);

      const percent = Math.round(((nextIdx + 1) / totalPages) * 100);
      updateBookProgress(bookMeta.id, `page_${nextIdx + 1}`, percent, `Página ${nextIdx + 1}`);

      if (percent >= 99 && !hasCelebrated) {
        setHasCelebrated(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  const handlePointerDown = (e) => {
    if (mode === 'webtoon') return;
    const isTouch = !!e.touches;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    touchStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
      active: true,
    };
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;
  };

  const handlePointerMove = (e) => {
    if (mode === 'webtoon' || !touchStartRef.current.active) return;
    const isTouch = !!e.touches;
    if (!isTouch && e.buttons !== 1) {
      touchStartRef.current.active = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const diffX = clientX - touchStartRef.current.x;
    const diffY = clientY - touchStartRef.current.y;

    if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragOffsetRef.current = diffX;
      setDragOffset(diffX);
    }
  };

  const handlePointerUp = (e) => {
    if (mode === 'webtoon') {
      setShowScrubber(prev => !prev);
      return;
    }
    if (!touchStartRef.current.active) return;
    touchStartRef.current.active = false;

    const elapsed = Date.now() - touchStartRef.current.time;
    const diffX = dragOffsetRef.current;
    const wasDragging = isDraggingRef.current;

    setIsDragging(false);
    setDragOffset(0);
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;

    if (wasDragging) {
      if (mode === 'rtl') {
        // En manga japonés (RTL): arrastrar hacia la derecha avanza página
        if (diffX > 38) {
          goToPage(currentPage + 1);
        } else if (diffX < -38) {
          goToPage(currentPage - 1);
        }
      } else {
        // En cómic occidental (LTR): arrastrar hacia la izquierda avanza página
        if (diffX < -38) {
          goToPage(currentPage + 1);
        } else if (diffX > 38) {
          goToPage(currentPage - 1);
        }
      }
      return;
    }

    // Tap directo
    if (elapsed < 380) {
      const clientX = touchStartRef.current.x;
      const width = window.innerWidth;
      if (clientX < width * 0.3) {
        mode === 'rtl' ? goToPage(currentPage + 1) : goToPage(currentPage - 1);
      } else if (clientX > width * 0.7) {
        mode === 'rtl' ? goToPage(currentPage - 1) : goToPage(currentPage + 1);
      } else {
        setShowScrubber(prev => !prev);
      }
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        mode === 'rtl' ? goToPage(currentPage + 1) : goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        mode === 'rtl' ? goToPage(currentPage - 1) : goToPage(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, totalPages, mode]);

  const progressPercent = totalPages ? Math.round(((currentPage + 1) / totalPages) * 100) : 0;

  return (
    <div className="w-full h-full select-none overflow-hidden bg-black flex flex-col items-center justify-center p-0 sm:p-4">
      {/* ESCENARIO DE LIBRO FÍSICO */}
      <div className="book-reader-stage">
        <div className="physical-book paper-dark">
          <div className="book-spine-crease-inner" />
          <div className="book-page-stack-right" />

          {/* 1. ENCABEZADO INTEGRADO (NO SUPERPUESTO) */}
          <header className="h-15 px-3 sm:px-5 flex items-center justify-between border-b border-white/10 z-20 flex-shrink-0 safe-top">
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-2xl hover:bg-white/10 active:scale-90 text-slate-100 flex items-center justify-center transition-all shadow-sm"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 px-2 sm:px-4 text-center min-w-0">
              <span className="font-serif italic text-xs sm:text-sm font-semibold tracking-wider opacity-85 truncate block text-slate-200">
                {bookMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className="w-11 h-11 rounded-2xl hover:bg-white/10 active:scale-90 text-slate-100 flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-sm"
                title={soundEnabled ? 'Silenciar sonido de páginas' : 'Activar sonido de páginas'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-500" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setMode(prev => prev === 'rtl' ? 'ltr' : prev === 'ltr' ? 'webtoon' : 'rtl')}
                className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 text-slate-100 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                title="Modo de lectura"
              >
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span className="uppercase">{mode}</span>
              </button>
            </div>
          </header>

          {/* 2. ÁREA DE PÁGINAS */}
          <main 
            className={`flex-1 w-full h-full ${mode === 'webtoon' ? 'overflow-y-auto' : 'overflow-hidden book-touch-surface'} flex items-center justify-center relative`}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 pointer-events-none">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                <p className="font-serif text-sm font-bold text-white">Cargando manga...</p>
              </div>
            )}

            {/* EFECTO 3D DE PÁGINA DE MANGA / CÓMIC VOLTEÁNDOSE */}
            {mode !== 'webtoon' && (
              <PageFlipEffect 
                flipping={flipState} 
                theme="dark" 
                direction={mode === 'rtl' ? 'rtl' : 'ltr'} 
              />
            )}

            {mode === 'webtoon' ? (
              <div 
                onClick={() => setShowScrubber(prev => !prev)}
                className="w-full max-w-2xl mx-auto flex flex-col items-center py-2 cursor-pointer"
              >
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Página ${idx + 1}`}
                    className="w-full h-auto block select-none mb-1"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : (
              <>
                {/* Contenedor de imagen con deformación y desplazamiento dinámico con el dedo */}
                <div 
                  style={{
                    transform: isDragging 
                      ? `translateX(${Math.max(-140, Math.min(140, dragOffset))}px) rotateY(${Math.max(-16, Math.min(16, dragOffset * -0.1))}deg)` 
                      : 'none',
                    transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    transformOrigin: dragOffset < 0 ? 'left center' : 'right center',
                  }}
                  className="w-full h-full flex items-center justify-center p-1 pointer-events-none"
                >
                  {images[currentPage] && (
                    <img
                      src={images[currentPage]}
                      alt={`Página ${currentPage + 1}`}
                      className="max-w-full max-h-full object-contain select-none shadow-2xl"
                    />
                  )}
                </div>

                {/* SUPERFICIE TÁCTIL ACTIVA: Detecta arrastre continuo de dedo en pantalla y toques */}
                <div 
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                  onTouchCancel={handlePointerUp}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing book-touch-surface"
                />
              </>
            )}
          </main>

          {/* 3. PIE DE PÁGINA INTEGRADO */}
          <footer className="h-15 px-3 sm:px-5 flex items-center justify-between border-t border-white/10 text-xs font-serif opacity-80 z-20 flex-shrink-0 safe-bottom">
            <button
              onClick={() => goToPage(mode === 'rtl' ? currentPage + 1 : currentPage - 1)}
              disabled={mode === 'rtl' ? currentPage >= totalPages - 1 : currentPage <= 0}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-25 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <button 
              onClick={() => setShowScrubber(prev => !prev)}
              className="h-11 px-3 sm:px-4 rounded-2xl hover:bg-white/10 active:scale-95 flex items-center justify-center font-bold tracking-wider text-xs sm:text-sm hover:text-amber-500 transition-all cursor-pointer"
            >
              — {currentPage + 1} / {totalPages} ({progressPercent}%) —
            </button>

            <button
              onClick={() => goToPage(mode === 'rtl' ? currentPage - 1 : currentPage + 1)}
              disabled={mode === 'rtl' ? currentPage <= 0 : currentPage >= totalPages - 1}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-25 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </footer>

          {/* 4. BARRA DE SALTO RÁPIDO */}
          <AnimatePresence>
            {showScrubber && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute bottom-16 left-3 right-3 sm:left-6 sm:right-6 z-40 p-4 bg-slate-900/95 text-white rounded-3xl border border-white/15 shadow-2xl backdrop-blur-2xl flex flex-col gap-3"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-300">
                  <span>Ir a página de manga</span>
                  <span className="text-amber-400 text-sm font-extrabold">Página {currentPage + 1} de {totalPages} ({progressPercent}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => goToPage(mode === 'rtl' ? currentPage + 1 : currentPage - 1)}
                    disabled={mode === 'rtl' ? currentPage >= totalPages - 1 : currentPage <= 0}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-25 active:scale-90 flex items-center justify-center shadow-sm flex-shrink-0 transition-all"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex-1 px-1">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, totalPages - 1)}
                      value={currentPage}
                      onChange={(e) => goToPage(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={() => goToPage(mode === 'rtl' ? currentPage - 1 : currentPage + 1)}
                    disabled={mode === 'rtl' ? currentPage <= 0 : currentPage >= totalPages - 1}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-25 active:scale-90 flex items-center justify-center shadow-sm flex-shrink-0 transition-all"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
