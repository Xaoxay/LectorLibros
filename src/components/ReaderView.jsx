import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Settings, List, Bookmark as BookmarkIcon, 
  ChevronLeft, ChevronRight, Loader2, Sparkles, Volume2, VolumeX,
  Highlighter
} from 'lucide-react';
import ReaderSettingsModal from './ReaderSettingsModal';
import TableOfContentsModal from './TableOfContentsModal';
import BookmarksModal from './BookmarksModal';
import AnnotationsModal from './AnnotationsModal';
import SelectionToolbar from './SelectionToolbar';
import PageFlipEffect from './PageFlipEffect';
import { playPageTurnSound } from '../utils/soundEffects';
import { 
  updateBookProgress, getSettings, saveSettings, 
  getBookmarks, addBookmark, removeBookmark,
  getAnnotations, saveAnnotation, deleteAnnotation, updateAnnotationNote
} from '../db/bookStorage';

const HIGHLIGHT_STYLES = {
  yellow: { fill: '#fde047', 'fill-opacity': '0.38', 'mix-blend-mode': 'multiply' },
  green: { fill: '#86efac', 'fill-opacity': '0.38', 'mix-blend-mode': 'multiply' },
  blue: { fill: '#7dd3fc', 'fill-opacity': '0.38', 'mix-blend-mode': 'multiply' },
  pink: { fill: '#f472b6', 'fill-opacity': '0.38', 'mix-blend-mode': 'multiply' },
};

export default function ReaderView({ bookMeta, bookBuffer, onBack, onOpenUpdates }) {
  const viewerRef = useRef(null);
  const bookInstance = useRef(null);
  const renditionRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [progressPercent, setProgressPercent] = useState(bookMeta.progress || 0);
  const [currentChapter, setCurrentChapter] = useState(bookMeta.lastChapter || '');
  const [toc, setToc] = useState([]);
  const [hasCelebrated, setHasCelebrated] = useState(bookMeta.progress >= 99);
  const [flipState, setFlipState] = useState(null); // 'next' | 'prev' | null
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrubber, setShowScrubber] = useState(false);
  
  // Modales
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const [settings, setSettings] = useState({
    theme: 'sepia',
    fontSize: 18,
    fontFamily: 'serif',
    lineHeight: 1.7,
  });
  const [bookmarks, setBookmarks] = useState([]);
  const [isCurrentPageBookmarked, setIsCurrentPageBookmarked] = useState(false);

  // Citas y Anotaciones
  const [annotations, setAnnotations] = useState([]);
  const [activeSelection, setActiveSelection] = useState(null);

  // Gestos táctiles y arrastre interactivo con el dedo
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function loadData() {
      const savedSettings = await getSettings();
      setSettings(savedSettings);
      const savedBookmarks = await getBookmarks(bookMeta.id);
      setBookmarks(savedBookmarks);
      const savedAnnotations = await getAnnotations(bookMeta.id);
      setAnnotations(savedAnnotations);
    }
    loadData();
  }, [bookMeta.id]);

  const applySavedAnnotations = (rendition, anns) => {
    if (!rendition || !anns || !anns.length) return;
    anns.forEach(ann => {
      try {
        const colorKey = ann.color || 'yellow';
        const styles = HIGHLIGHT_STYLES[colorKey] || HIGHLIGHT_STYLES.yellow;
        rendition.annotations.add(
          'highlight',
          ann.cfiRange,
          { id: ann.id, color: colorKey, note: ann.note },
          () => setShowAnnotations(true),
          `hl-${colorKey}`,
          styles
        );
      } catch (e) {
        // Ignorar si ya fue agregado
      }
    });
  };

  useEffect(() => {
    if (!bookBuffer || !viewerRef.current) return;

    let isMounted = true;
    setLoading(true);

    try {
      const book = ePub(bookBuffer);
      bookInstance.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none',
      });
      renditionRef.current = rendition;

      registerEpubThemes(rendition);

      book.loaded.navigation.then(nav => {
        if (isMounted && nav.toc) {
          setToc(nav.toc);
        }
      });

      book.ready.then(() => {
        return book.locations.generate(1000);
      }).then(() => {
        if (!isMounted) return;
        if (rendition.location) {
          updateLocationState(rendition.location);
        }
      }).catch(err => {});

      // Escuchar selecciones de texto dentro del libro
      rendition.on('selected', (cfiRange, contents) => {
        book.getRange(cfiRange).then(range => {
          const text = range?.toString()?.trim();
          if (text && text.length > 0) {
            setActiveSelection({
              cfiRange,
              text,
            });
          }
        }).catch(() => {
          try {
            const win = contents?.window || rendition.getContents()?.[0]?.window;
            const text = win?.getSelection()?.toString()?.trim();
            if (text && text.length > 0) {
              setActiveSelection({ cfiRange, text });
            }
          } catch (e) {}
        });
      });

      // Eventos táctiles, clics y estilos en el iframe del libro
      rendition.hooks.content.register(contents => {
        const doc = contents.document;
        const win = contents.window;
        if (!doc) return;

        // Inyectar estilos para selecciones y resaltados
        const style = doc.createElement('style');
        style.textContent = `
          ::selection {
            background-color: rgba(245, 158, 11, 0.35) !important;
            color: inherit !important;
          }
          .hl-yellow { fill: #fde047 !important; fill-opacity: 0.38 !important; }
          .hl-green { fill: #86efac !important; fill-opacity: 0.38 !important; }
          .hl-blue { fill: #7dd3fc !important; fill-opacity: 0.38 !important; }
          .hl-pink { fill: #f472b6 !important; fill-opacity: 0.38 !important; }
          svg.epubjs-hl { cursor: pointer !important; }
        `;
        doc.head.appendChild(style);

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let hasDragged = false;

        doc.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            hasDragged = false;
          }
        }, { passive: true });

        doc.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1) {
            const diffX = e.touches[0].clientX - touchStartX;
            const diffY = e.touches[0].clientY - touchStartY;
            // Solo arrastre si es horizontal y evidente
            if (Math.abs(diffX) > 25 && Math.abs(diffX) > Math.abs(diffY) * 1.6) {
              hasDragged = true;
              setDragOffset(diffX);
              setIsDragging(true);
            }
          }
        }, { passive: true });

        doc.addEventListener('touchend', (e) => {
          setIsDragging(false);
          setDragOffset(0);

          if (e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            const elapsed = Date.now() - touchStartTime;

            // Si el usuario acaba de seleccionar texto, no pasar página
            const sel = win?.getSelection?.();
            if (sel && sel.toString().trim().length > 0) {
              return;
            }

            // Swipe horizontal
            if ((Math.abs(diffX) > 40 && Math.abs(diffY) < 70 && elapsed < 600) || (hasDragged && Math.abs(diffX) > 40)) {
              if (diffX < 0) {
                turnPageNext();
              } else {
                turnPagePrev();
              }
              return;
            }

            // Toque rápido sin arrastre
            if (Math.abs(diffX) < 15 && Math.abs(diffY) < 15 && elapsed < 350) {
              handleZoneClick(touchEndX, win?.innerWidth || doc.documentElement.clientWidth);
            }
          }
        }, { passive: true });

        doc.addEventListener('click', (e) => {
          const sel = win?.getSelection?.();
          if (sel && sel.toString().trim().length > 0) {
            return;
          }
          handleZoneClick(e.clientX, win?.innerWidth || doc.documentElement.clientWidth);
        });

        doc.addEventListener('keydown', handleKeyNav);
      });

      rendition.on('relocated', (location) => {
        if (!isMounted) return;
        updateLocationState(location);
        // Volver a aplicar los resaltados cuando cambia de página
        getAnnotations(bookMeta.id).then(anns => {
          if (isMounted) {
            setAnnotations(anns);
            applySavedAnnotations(rendition, anns);
          }
        });
      });

      const targetCfi = bookMeta.lastCfi || undefined;
      rendition.display(targetCfi).then(() => {
        if (isMounted) {
          setLoading(false);
          applyCurrentSettings(rendition, settings);
          getAnnotations(bookMeta.id).then(anns => {
            if (isMounted) applySavedAnnotations(rendition, anns);
          });
        }
      }).catch(() => {
        if (isMounted) {
          rendition.display();
          setLoading(false);
        }
      });

    } catch (err) {
      console.error(err);
      setLoading(false);
    }

    window.addEventListener('keydown', handleKeyNav);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyNav);
      try {
        if (renditionRef.current) renditionRef.current.destroy();
        if (bookInstance.current) bookInstance.current.destroy();
      } catch (e) {}
    };
  }, [bookBuffer]);

  // ANIMACIÓN DE PASAR PÁGINA EN 3D
  const turnPageNext = () => {
    if (soundEnabled) playPageTurnSound();
    setFlipState('next');
    setTimeout(() => setFlipState(null), 440);
    renditionRef.current?.next();
  };

  const turnPagePrev = () => {
    if (soundEnabled) playPageTurnSound();
    setFlipState('prev');
    setTimeout(() => setFlipState(null), 440);
    renditionRef.current?.prev();
  };

  const handleZoneClick = (clientX, width = window.innerWidth) => {
    if (clientX < width * 0.25) {
      turnPagePrev();
    } else if (clientX > width * 0.75) {
      turnPageNext();
    } else {
      setShowScrubber(prev => !prev);
    }
  };

  const handleKeyNav = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      turnPageNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      turnPagePrev();
    }
  };

  const updateLocationState = (location) => {
    setCurrentLocation(location);
    const startCfi = location?.start?.cfi;
    if (!startCfi) return;

    let percent = 0;
    if (bookInstance.current?.locations?.length()) {
      percent = Math.round(bookInstance.current.locations.percentageFromCfi(startCfi) * 100);
      setProgressPercent(percent);

      if (percent >= 99 && !hasCelebrated) {
        setHasCelebrated(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }

    let chapterName = '';
    try {
      const item = bookInstance.current?.spine?.get(location.start.href);
      if (item) {
        const found = toc.find(t => t.href.includes(item.href) || item.href.includes(t.href));
        if (found) chapterName = found.label?.trim() || '';
      }
    } catch (e) {}

    if (chapterName) setCurrentChapter(chapterName);
    updateBookProgress(bookMeta.id, startCfi, percent, chapterName);

    const isMarked = bookmarks.some(b => b.cfi === startCfi);
    setIsCurrentPageBookmarked(isMarked);
  };

  const registerEpubThemes = (rendition) => {
    rendition.themes.register('light', {
      body: {
        background: '#fbfbf8 !important',
        color: '#1a1a1a !important',
        padding: '16px 22px 20px 22px !important',
        'font-family': 'Lora, Merriweather, Georgia, serif !important',
      },
      'p, span, div, h1, h2, h3, h4, blockquote': {
        color: '#1a1a1a !important',
      }
    });

    rendition.themes.register('sepia', {
      body: {
        background: '#f6eedb !important',
        color: '#3b2d1d !important',
        padding: '16px 22px 20px 22px !important',
        'font-family': 'Lora, Merriweather, Georgia, serif !important',
      },
      'p, span, div, h1, h2, h3, h4, blockquote': {
        color: '#3b2d1d !important',
      }
    });

    rendition.themes.register('dark', {
      body: {
        background: '#1a1c23 !important',
        color: '#d1d5db !important',
        padding: '16px 22px 20px 22px !important',
        'font-family': 'Lora, Merriweather, Georgia, serif !important',
      },
      'p, span, div, h1, h2, h3, h4, blockquote': {
        color: '#d1d5db !important',
      }
    });

    rendition.themes.register('amoled', {
      body: {
        background: '#000000 !important',
        color: '#c0c4cc !important',
        padding: '16px 22px 20px 22px !important',
        'font-family': 'Lora, Merriweather, Georgia, serif !important',
      },
      'p, span, div, h1, h2, h3, h4, blockquote': {
        color: '#c0c4cc !important',
      }
    });
  };

  const applyCurrentSettings = (rendition, currentSettings) => {
    if (!rendition) return;
    rendition.themes.select(currentSettings.theme || 'sepia');
    rendition.themes.fontSize(`${currentSettings.fontSize || 18}px`);

    const fonts = {
      serif: 'Lora, Merriweather, Georgia, serif',
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      monospace: 'monospace',
    };
    rendition.themes.font(fonts[currentSettings.fontFamily] || 'serif');
  };

  const handleUpdateSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    if (renditionRef.current) {
      applyCurrentSettings(renditionRef.current, newSettings);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentLocation?.start?.cfi) return;
    const cfi = currentLocation.start.cfi;
    const existing = bookmarks.find(b => b.cfi === cfi);

    if (existing) {
      const updated = await removeBookmark(bookMeta.id, existing.id);
      setBookmarks(updated);
      setIsCurrentPageBookmarked(false);
    } else {
      const newBm = {
        cfi,
        chapterTitle: currentChapter || 'Página marcada',
        percentage: progressPercent,
      };
      const updated = await addBookmark(bookMeta.id, newBm);
      setBookmarks(updated);
      setIsCurrentPageBookmarked(true);
    }
  };

  // Guardar resaltado y nota opcional
  const handleApplyHighlight = async (color = 'yellow', note = '') => {
    if (!activeSelection || !renditionRef.current) return;
    const { cfiRange, text } = activeSelection;

    const styles = HIGHLIGHT_STYLES[color] || HIGHLIGHT_STYLES.yellow;

    try {
      renditionRef.current.annotations.add(
        'highlight',
        cfiRange,
        { color, note },
        () => setShowAnnotations(true),
        `hl-${color}`,
        styles
      );
    } catch (e) {
      console.warn('Error adding highlight:', e);
    }

    const newAnn = {
      color,
      note,
      text,
      cfiRange,
      chapterTitle: currentChapter || 'Lectura',
      percentage: progressPercent,
    };

    const updated = await saveAnnotation(bookMeta.id, newAnn);
    setAnnotations(updated);
    clearActiveSelection();
  };

  const clearActiveSelection = () => {
    setActiveSelection(null);
    try {
      const win = renditionRef.current?.getContents()?.[0]?.window;
      win?.getSelection()?.removeAllRanges();
    } catch (e) {}
  };

  const handleDeleteAnnotation = async (annId) => {
    const target = annotations.find(a => a.id === annId || a.cfiRange === annId);
    if (target && renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(target.cfiRange, 'highlight');
      } catch (e) {}
    }
    const updated = await deleteAnnotation(bookMeta.id, annId);
    setAnnotations(updated);
  };

  const handleUpdateAnnotationNote = async (annId, noteText) => {
    const updated = await updateAnnotationNote(bookMeta.id, annId, noteText);
    setAnnotations(updated);
  };

  return (
    <div className="w-full h-full select-none overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-4">
      {/* ESCENARIO DEL LIBRO FÍSICO REAL */}
      <div className="book-reader-stage">
        <div className={`physical-book paper-${settings.theme}`}>
          {/* Lomo y relieve interior de libro */}
          <div className="book-spine-crease-inner" />
          <div className="book-page-stack-right" />

          {/* 1. ENCABEZADO INTEGRADO DE PÁGINA DE LIBRO */}
          <header className="h-15 px-3 sm:px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10 z-20 flex-shrink-0 safe-top">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={onBack}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm cursor-pointer"
                title="Volver a la biblioteca"
                aria-label="Volver a la biblioteca"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowToc(true)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm cursor-pointer"
                title="Índice de capítulos"
                aria-label="Índice de capítulos"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-2 sm:px-4 text-center min-w-0">
              <span className="font-serif italic text-xs sm:text-sm font-semibold tracking-wider opacity-85 truncate block">
                {currentChapter || bookMeta.title}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-sm cursor-pointer"
                title={soundEnabled ? 'Silenciar sonido de páginas' : 'Activar sonido de páginas'}
                aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-500" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Botón Citas y Anotaciones */}
              <button
                onClick={() => setShowAnnotations(true)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all relative shadow-sm cursor-pointer"
                title="Ver citas y notas guardadas"
                aria-label="Ver citas y notas"
              >
                <Highlighter className={`w-5 h-5 ${annotations.length > 0 ? 'text-amber-500' : ''}`} />
                {annotations.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 flex items-center justify-center ring-2 ring-slate-900">
                    {annotations.length}
                  </span>
                )}
              </button>

              {/* Botón Marcadores */}
              <button
                onClick={() => setShowBookmarks(true)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all relative shadow-sm cursor-pointer"
                title="Ver lista de marcadores guardados"
                aria-label="Ver marcadores"
              >
                <BookmarkIcon className={`w-5 h-5 ${isCurrentPageBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                {bookmarks.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900" />
                )}
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-11 h-11 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all shadow-sm cursor-pointer"
                title="Ajustes de lectura"
                aria-label="Ajustes de lectura"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 2. ÁREA DE PÁGINA DE LIBRO CON VOLTEO 3D REALISTA Y SELECCIÓN DE TEXTO FLUIDA */}
          <main className="relative flex-1 w-full h-full overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-inherit z-30 pointer-events-none">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                <p className="font-serif text-sm font-bold opacity-80">Abriendo página...</p>
              </div>
            )}

            {/* EFECTO DE HOJA DE PAPEL VOLTEÁNDOSE EN 3D */}
            <PageFlipEffect flipping={flipState} theme={settings.theme} />

            {/* Contenedor del EPUB con deformación dinámica al arrastrar con el dedo */}
            <div 
              ref={viewerRef} 
              className="epub-container w-full h-full"
              style={{ 
                opacity: loading ? 0 : 1,
                transform: isDragging 
                  ? `translateX(${Math.max(-140, Math.min(140, dragOffset))}px) rotateY(${Math.max(-16, Math.min(16, dragOffset * -0.1))}deg)` 
                  : 'none',
                transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transformOrigin: dragOffset < 0 ? 'left center' : 'right center',
              }}
            />

            {/* CINTA MARCAPÁGINAS FÍSICA ELEGANTE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (soundEnabled) playPageTurnSound();
                handleToggleBookmark();
              }}
              className="bookmark-ribbon-btn group z-30 cursor-pointer"
              title={isCurrentPageBookmarked ? 'Página marcada (toca la cinta para quitar)' : 'Toca la cinta para marcar esta página'}
              aria-label={isCurrentPageBookmarked ? 'Quitar marcador de esta página' : 'Marcar esta página'}
            >
              <div className={`bookmark-ribbon-strip ${isCurrentPageBookmarked ? 'marked' : 'unmarked'}`}>
                {isCurrentPageBookmarked && (
                  <BookmarkIcon className="w-3 h-3 text-amber-950 fill-amber-950 stroke-[2.5]" />
                )}
              </div>
            </button>
          </main>

          {/* 3. PIE DE PÁGINA INTEGRADO */}
          <footer className="h-15 px-3 sm:px-5 flex items-center justify-between border-t border-black/10 dark:border-white/10 z-20 flex-shrink-0 safe-bottom">
            <button
              onClick={() => turnPagePrev()}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <button 
              onClick={() => setShowScrubber(prev => !prev)}
              className="h-11 px-3 sm:px-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center font-bold tracking-wider text-xs sm:text-sm hover:text-amber-500 transition-all cursor-pointer"
            >
              — {progressPercent}% —
            </button>

            <button
              onClick={() => turnPageNext()}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-90 flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
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
                  <span>Ir a página / porcentaje</span>
                  <span className="text-amber-400 text-sm font-extrabold">{progressPercent}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => turnPagePrev()}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center shadow-sm flex-shrink-0 transition-all cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex-1 px-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressPercent}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (bookInstance.current?.locations?.length()) {
                          const cfi = bookInstance.current.locations.cfiFromPercentage(val / 100);
                          if (cfi) renditionRef.current?.display(cfi);
                        }
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => turnPageNext()}
                    className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center shadow-sm flex-shrink-0 transition-all cursor-pointer"
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

      {/* BARRA FLOTANTE DE TEXTO SELECCIONADO */}
      <SelectionToolbar
        selection={activeSelection}
        onHighlight={(color) => handleApplyHighlight(color, '')}
        onAddNote={(color, note) => handleApplyHighlight(color, note)}
        onCopy={(text) => {
          navigator.clipboard?.writeText(text);
        }}
        onClose={clearActiveSelection}
      />

      {/* MODAL DE CITAS Y ANOTACIONES */}
      <AnnotationsModal
        isOpen={showAnnotations}
        onClose={() => setShowAnnotations(false)}
        annotations={annotations}
        onSelectAnnotation={(cfiRange) => {
          renditionRef.current?.display(cfiRange);
        }}
        onDeleteAnnotation={handleDeleteAnnotation}
        onUpdateNote={handleUpdateAnnotationNote}
      />

      {/* Modales existentes */}
      <ReaderSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenUpdates={onOpenUpdates}
      />

      <TableOfContentsModal
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        toc={toc}
        currentChapter={currentChapter}
        onSelectChapter={(href) => renditionRef.current?.display(href)}
      />

      <BookmarksModal
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        bookmarks={bookmarks}
        onSelectBookmark={(cfi) => renditionRef.current?.display(cfi)}
        onDeleteBookmark={async (bmId) => {
          const updated = await removeBookmark(bookMeta.id, bmId);
          setBookmarks(updated);
        }}
        onToggleCurrentBookmark={handleToggleBookmark}
        isCurrentPageBookmarked={isCurrentPageBookmarked}
      />
    </div>
  );
}
