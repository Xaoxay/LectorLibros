import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Sun, Moon, Loader2, Volume2, VolumeX 
} from 'lucide-react';
import PageFlipEffect from './PageFlipEffect';
import { playPageTurnSound } from '../utils/soundEffects';
import { updateBookProgress } from '../db/bookStorage';

export default function PdfReaderView({ bookMeta, bookBuffer, onBack }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(bookMeta.lastPage || 1);
  const [totalPages, setTotalPages] = useState(bookMeta.totalPages || 1);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [colorMode, setColorMode] = useState('dark');
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
    setLoading(true);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: bookBuffer });
        const doc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        
        const initialPage = Math.min(doc.numPages, Math.max(1, bookMeta.lastPage || 1));
        setCurrentPage(initialPage);
        renderPage(doc, initialPage, zoomScale);
      } catch (err) {
        console.error('Error al cargar PDF:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }
    };
  }, [bookBuffer]);

  const renderPage = async (doc, pageNum, scaleMultiplier = 1.0) => {
    if (!doc || !canvasRef.current || !containerRef.current) return;

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (e) {}
    }

    try {
      const page = await doc.getPage(pageNum);
      const containerWidth = containerRef.current.clientWidth || window.innerWidth;
      const initialViewport = page.getViewport({ scale: 1.0 });

      const baseScale = (containerWidth - 24) / initialViewport.width;
      const scale = Math.max(0.6, baseScale * scaleMultiplier);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;

      const progressPercent = Math.round((pageNum / doc.numPages) * 100);
      updateBookProgress(bookMeta.id, `page_${pageNum}`, progressPercent, `Página ${pageNum}`);

      if (progressPercent >= 99 && !hasCelebrated) {
        setHasCelebrated(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(err);
      }
    }
  };

  const changePage = (delta) => {
    if (!pdfDocRef.current) return;
    const newPage = Math.min(totalPages, Math.max(1, currentPage + delta));
    if (newPage !== currentPage) {
      if (soundEnabled) playPageTurnSound();
      setFlipState(delta > 0 ? 'next' : 'prev');
      setTimeout(() => setFlipState(null), 440);
      setCurrentPage(newPage);
      renderPage(pdfDocRef.current, newPage, zoomScale);
    }
  };

  const handlePointerDown = (e) => {
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
    if (!touchStartRef.current.active) return;
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

    // Desplazamiento horizontal para arrastrar la hoja con el dedo
    if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragOffsetRef.current = diffX;
      setDragOffset(diffX);
    }
  };

  const handlePointerUp = (e) => {
    if (!touchStartRef.current.active) return;
    touchStartRef.current.active = false;

    const elapsed = Date.now() - touchStartRef.current.time;
    const diffX = dragOffsetRef.current;
    const wasDragging = isDraggingRef.current;

    setIsDragging(false);
    setDragOffset(0);
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;

    // Si fue arrastre con el dedo
    if (wasDragging) {
      if (diffX < -38) {
        changePage(1); // Deslizar hacia la izquierda = página siguiente
      } else if (diffX > 38) {
        changePage(-1); // Deslizar hacia la derecha = página anterior
      }
      return;
    }

    // Si fue toque directo (tap)
    if (elapsed < 380) {
      const clientX = touchStartRef.current.x;
      const width = window.innerWidth;
      if (clientX < width * 0.3) {
        changePage(-1);
      } else if (clientX > width * 0.7) {
        changePage(1);
      } else {
        setShowScrubber(prev => !prev);
      }
    }
  };

  const handleZoom = (factor) => {
    const newScale = Math.min(2.5, Math.max(0.7, zoomScale * factor));
    setZoomScale(newScale);
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage, newScale);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') changePage(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') changePage(-1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, totalPages, zoomScale]);

  const getFilterStyle = () => {
    if (colorMode === 'dark') {
      return { filter: 'invert(0.92) hue-rotate(180deg) brightness(0.88)' };
    }
    if (colorMode === 'sepia') {
      return { filter: 'sepia(0.4) brightness(0.96) contrast(0.95)' };
    }
    return {};
  };

  const progressPercent = Math.round((currentPage / totalPages) * 100);

  return (
    <div className="w-full h-full select-none overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-4">
      {/* ESCENARIO DEL LIBRO FÍSICO */}
      <div className="book-reader-stage">
        <div className={`physical-book paper-${colorMode === 'normal' ? 'light' : colorMode}`}>
          <div className="book-spine-crease-inner" />
          <div className="book-page-stack-right" />

          {/* 1. ENCABEZADO INTEGRADO (NO SUPERPUESTO) */}
          <header className="h-15 px-3 sm:px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10 z-20 flex-shrink-0 safe-top">
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 px-2 sm:px-4 text-center min-w-0">
              <span className="font-serif italic text-xs sm:text-sm font-semibold tracking-wider opacity-85 truncate block">
                {bookMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-sm"
                title={soundEnabled ? 'Silenciar sonido de páginas' : 'Activar sonido de páginas'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-500" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setColorMode(prev => prev === 'dark' ? 'sepia' : prev === 'sepia' ? 'normal' : 'dark')}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm"
                title="Modo de color"
              >
                {colorMode === 'dark' ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5" />}
              </button>

              <button
                onClick={() => handleZoom(0.85)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm"
                title="Alejar"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleZoom(1.15)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm"
                title="Acercar"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 2. ÁREA DEL DOCUMENTO PDF CON ARRASTRE TÁCTIL */}
          <main 
            ref={containerRef}
            className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 relative book-touch-surface"
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-inherit z-30 pointer-events-none">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                <p className="font-serif text-sm font-bold opacity-80">Cargando PDF...</p>
              </div>
            )}

            {/* EFECTO DE HOJA DE PAPEL VOLTEÁNDOSE EN 3D */}
            <PageFlipEffect flipping={flipState} theme={colorMode === 'normal' ? 'light' : colorMode} />

            {/* Hoja del PDF con deformación y desplazamiento dinámico con el dedo */}
            <div
              style={{
                transform: isDragging 
                  ? `translateX(${Math.max(-140, Math.min(140, dragOffset))}px) rotateY(${Math.max(-16, Math.min(16, dragOffset * -0.1))}deg)` 
                  : 'none',
                transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transformOrigin: dragOffset < 0 ? 'left center' : 'right center',
              }}
              className="w-full h-full flex items-center justify-center pointer-events-none"
            >
              <canvas 
                ref={canvasRef} 
                style={getFilterStyle()} 
                className="block rounded-lg max-w-full shadow-lg"
              />
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
          </main>

          {/* 3. PIE DE PÁGINA INTEGRADO */}
          <footer className="h-15 px-3 sm:px-5 flex items-center justify-between border-t border-black/10 dark:border-white/10 z-20 flex-shrink-0 safe-bottom">
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-25 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <button 
              onClick={() => setShowScrubber(prev => !prev)}
              className="h-11 px-3 sm:px-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center font-bold tracking-wider text-xs sm:text-sm hover:text-amber-500 transition-all cursor-pointer"
            >
              — {currentPage} / {totalPages} ({progressPercent}%) —
            </button>

            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= totalPages}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-25 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm"
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
                  <span>Ir a página de PDF</span>
                  <span className="text-amber-400 text-sm font-extrabold">Página {currentPage} de {totalPages} ({progressPercent}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changePage(-1)}
                    disabled={currentPage <= 1}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-25 active:scale-90 flex items-center justify-center shadow-sm flex-shrink-0 transition-all"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex-1 px-1">
                    <input
                      type="range"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        setCurrentPage(page);
                        if (pdfDocRef.current) renderPage(pdfDocRef.current, page, zoomScale);
                      }}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={() => changePage(1)}
                    disabled={currentPage >= totalPages}
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
