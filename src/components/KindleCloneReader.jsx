// Reader screen from kindle-clone/App.js
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';
import ReaderView from './ReaderView';
import PdfReaderView from './PdfReaderView';
import MangaReaderView from './MangaReaderView';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

export default function KindleCloneReader({
  book,
  bookBuffer,
  navigation,
  onOpenUpdates,
}) {
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [darkMode, setDarkMode] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    setPage(0);
  }, [book]);

  // Si tenemos el archivo real (EPUB, PDF, CBZ) en memoria local,
  // delegamos al visor de alta fidelidad:
  if (bookBuffer && (book.type === 'epub' || book.format === 'epub' || (!book.type && !book.format))) {
    return (
      <ReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={() => navigation.goBack()}
        onOpenUpdates={onOpenUpdates}
      />
    );
  }

  if (bookBuffer && (book.type === 'pdf' || book.format === 'pdf')) {
    return (
      <PdfReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={() => navigation.goBack()}
      />
    );
  }

  if (bookBuffer && (book.type === 'cbz' || book.format === 'cbz')) {
    return (
      <MangaReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={() => navigation.goBack()}
      />
    );
  }

  // Fallback de texto / páginas (como en kindle-clone/App.js)
  const pages = book.pages && book.pages.length > 0
    ? book.pages
    : [
        `Capítulo 1: ${book.name || book.title || 'Lectura'}\n\nBienvenido a tu Kindle Clone.\n\nEste lector reproduce fielmente la experiencia táctil con rotación tridimensional en tiempo real (perspective: 1000, rotateY: \${translateX / 25}deg).\n\nDesliza tu dedo hacia la izquierda para avanzar de página, o hacia la derecha para retroceder.`,
        `Capítulo 2: Sincronización y formatos\n\nPuedes volver a la biblioteca pulsando "Volver" en la esquina superior izquierda.\n\nUsa la opción "Subir" para agregar tus archivos PDF y EPUB personales, o "Buscar" para explorar millones de libros en Google Books.`,
        `Capítulo 3: Modos de visualización\n\nPuedes alternar entre el tono papel cálido (#f5f1e8) y el modo oscuro con el botón superior derecho.`
      ];

  const totalPages = pages.length;

  // Gesto Pan con física 3D de kindle-clone
  const handleTouchStart = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const diffX = touch.clientX - touchStartRef.current.x;
    setTranslateX(diffX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Umbral de 80px de kindle-clone/App.js
    if (translateX < -80 && page < totalPages - 1) {
      hapticLight();
      setPage((p) => p + 1);
    } else if (translateX > 80 && page > 0) {
      hapticLight();
      setPage((p) => Math.max(0, p - 1));
    }

    setTranslateX(0);
  };

  return (
    <div
      className="h-full w-full flex flex-col justify-between select-none overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: darkMode ? '#020617' : COLORS.paper,
        color: darkMode ? COLORS.text : '#1a1714',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* readerTop de kindle-clone */}
      <div className="h-16 px-4 flex items-center justify-between border-b safe-top" style={{ borderColor: darkMode ? '#121824' : 'rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => navigation.goBack()}
          className="font-bold text-sm cursor-pointer transition-colors"
          style={{ color: COLORS.accent }}
        >
          Volver
        </button>

        <h3
          className="font-bold text-sm truncate max-w-[200px] text-center"
          style={{ color: darkMode ? COLORS.text : '#1a1714' }}
        >
          {book.name || book.title}
        </h3>

        <button
          onClick={() => {
            hapticLight();
            setDarkMode(!darkMode);
          }}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          title="Alternar modo oscuro / papel"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>
      </div>

      {/* reader body con transform 3D */}
      <div
        className="flex-1 max-w-xl mx-auto w-full p-6 flex flex-col justify-center overflow-hidden"
        style={{ perspective: '1000px' }}
      >
        <div
          style={{
            transform: `translateX(${translateX}px) rotateY(${translateX / 25}deg)`,
            transition: isDragging ? 'none' : 'transform 250ms ease-out',
            transformOrigin: translateX < 0 ? 'right center' : 'left center',
          }}
          className={`p-8 sm:p-12 rounded-2xl shadow-sm min-h-[350px] flex flex-col justify-center select-none ${
            darkMode ? 'bg-[#080d16] border border-slate-900' : 'bg-[#faf7f2] border border-amber-950/5'
          }`}
        >
          <p
            className="font-serif leading-relaxed whitespace-pre-wrap select-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '32px',
              color: darkMode ? COLORS.text : '#222222',
            }}
          >
            {pages[page]}
          </p>
        </div>
      </div>

      {/* readerFooter de kindle-clone */}
      <div
        className="h-14 px-6 flex items-center justify-between border-t safe-bottom"
        style={{
          borderColor: darkMode ? '#121824' : 'rgba(0,0,0,0.06)',
          color: COLORS.muted,
        }}
      >
        <button
          onClick={() => {
            if (page > 0) {
              hapticLight();
              setPage((p) => p - 1);
            }
          }}
          disabled={page === 0}
          className="text-xs font-semibold flex items-center gap-1 disabled:opacity-20 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <span className="text-xs font-mono font-bold">
          {page + 1} / {totalPages}
        </span>

        <button
          onClick={() => {
            if (page < totalPages - 1) {
              hapticLight();
              setPage((p) => p + 1);
            }
          }}
          disabled={page >= totalPages - 1}
          className="text-xs font-semibold flex items-center gap-1 disabled:opacity-20 cursor-pointer"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
