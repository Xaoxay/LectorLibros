import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Bookmark, Sun, Moon, List, 
  ChevronLeft, ChevronRight, Share2, Volume2, VolumeX, Sparkles 
} from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';
import ReaderView from './ReaderView';
import PdfReaderView from './PdfReaderView';
import MangaReaderView from './MangaReaderView';

export default function KindleReaderScreen({
  book,
  bookBuffer,
  onBack,
  onOpenUpdates,
}) {
  const [page, setPage] = useState(0);
  const [theme, setTheme] = useState('paper'); // 'paper' (#f5f1e8) | 'dark' (#000000)
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Si es un archivo real con formato EPUB, PDF o CBZ y tenemos su buffer,
  // delegamos a los visores dedicados que ya cuentan con los motores de renderizado
  if (bookBuffer && (book.format === 'epub' || !book.format)) {
    return (
      <ReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={onBack}
        onOpenUpdates={onOpenUpdates}
      />
    );
  }

  if (bookBuffer && book.format === 'pdf') {
    return (
      <PdfReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={onBack}
      />
    );
  }

  if (bookBuffer && book.format === 'cbz') {
    return (
      <MangaReaderView
        bookMeta={book}
        bookBuffer={bookBuffer}
        onBack={onBack}
      />
    );
  }

  // Páginas para el lector (Muestra fiel a las pantallas 6, 7 y 10 del mockup)
  const pages = book.pages && book.pages.length > 0 
    ? book.pages 
    : [
        `Cuando yo tenía seis años vi una vez una magnífica puesta de sol.\n\nEn aquel momento, yo estaba en la cima de una colina, y veía delante de mí un pequeño planeta que parecía un gigante. El sol se ponía, y el cielo se llenaba de colores...`,
        `Viví así, solo, sin nadie con quien hablar verdaderamente, hasta que tuve una avería en el desierto de Sahara, hace seis años. Algo se había roto en mi motor.\n\nY como no llevaba conmigo ni mecánico ni pasajeros, me dispuse a realizar solo una difícil reparación.`,
        `La primera noche me dormí sobre la arena, a mil millas de toda tierra habitada. Estaba más aislado que un náufrago en una balsa en medio del océano.\n\n¡Imagínense, pues, mi sorpresa cuando, al romper el día, me despertó una extraña vocecita que decía:\n—Por favor... ¡dibújame un cordero!`,
        `—¿Qué?\n—Dibújame un cordero...\n\nMe puse de pie de un salto, como si hubiera sido tocado por un rayo. Me froté los ojos. Miré bien. Y vi un hombrecito extraordinario que me examinaba gravemente.`,
        `He aquí el mejor retrato que, más tarde, logré hacer de él. Aunque mi dibujo es, ciertamente, mucho menos seductor que el modelo.\n\nPero no es culpa mía. Las personas grandes me habían desanimado de mi carrera de pintor a la edad de seis años.`
      ];

  const totalPages = pages.length;

  // Manejadores de arrastre táctil con física 3D de pase de página
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

    // Umbral de pase de página (80px)
    if (translateX < -75 && page < totalPages - 1) {
      hapticLight();
      setPage(p => p + 1);
    } else if (translateX > 75 && page > 0) {
      hapticLight();
      setPage(p => p - 1);
    }

    setTranslateX(0);
  };

  // Alternar entre modo papel cálido (#f5f1e8) y modo oscuro (#000000)
  const toggleTheme = () => {
    hapticLight();
    setTheme(t => (t === 'paper' ? 'dark' : 'paper'));
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-full w-full flex flex-col select-none overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#000000] text-[#e2e8f0]' : 'bg-[#f5f1e8] text-[#1a1714]'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* 1. Barra Superior (Screens 6 & 10) */}
      <header className={`px-5 py-3.5 flex items-center justify-between border-b safe-top ${
        isDark ? 'border-neutral-900 bg-black/90' : 'border-amber-950/10 bg-[#f5f1e8]/95'
      }`}>
        {/* Botón Volver */}
        <button
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className="flex items-center gap-2 font-bold text-sm hover:opacity-75 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="truncate max-w-[180px] sm:max-w-xs">{book.title || book.name}</span>
        </button>

        {/* Herramientas derechas: Tema (Sol/Luna) y Marcador */}
        <div className="flex items-center gap-3">
          {/* Botón Sol/Luna */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isDark ? 'Cambiar a modo papel cálido' : 'Cambiar a modo oscuro'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Marcador */}
          <button
            onClick={() => {
              hapticLight();
              setIsBookmarked(!isBookmarked);
            }}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Marcar página"
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. Área de Lectura con Animación de Hoja 3D (Screens 6, 7 & 10) */}
      <main className="relative flex-1 w-full max-w-xl mx-auto px-6 sm:px-10 py-8 flex flex-col justify-center overflow-hidden" style={{ perspective: '1200px' }}>
        {/* Contenedor de la Hoja en Rotación */}
        <div
          style={{
            transform: `translateX(${translateX}px) rotateY(${Math.max(-35, Math.min(35, translateX / 22))}deg)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.8, 0.25, 1)',
            transformOrigin: translateX < 0 ? 'right center' : 'left center',
          }}
          className={`relative w-full h-full rounded-2xl p-6 sm:p-10 flex flex-col justify-start transition-shadow ${
            isDark 
              ? 'bg-[#0a0d14] shadow-2xl border border-neutral-900' 
              : 'bg-[#faf7f2] shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-amber-950/10'
          }`}
        >
          {/* Sombra de Curvatura de Página 3D (Screen 7: Animación de cambio de página) */}
          {isDragging && Math.abs(translateX) > 10 && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: translateX < 0
                  ? 'linear-gradient(to left, rgba(0,0,0,0.22), transparent 45%)'
                  : 'linear-gradient(to right, rgba(0,0,0,0.22), transparent 45%)',
              }}
            />
          )}

          {/* Título de Capítulo */}
          <div className="text-center mb-8 pt-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight opacity-90">
              Capítulo {page + 1}
            </h2>
          </div>

          {/* Contenido Editorial de la Página */}
          <div className="flex-1 font-serif text-[19px] sm:text-[21px] leading-[34px] sm:leading-[38px] text-justify tracking-wide opacity-95 whitespace-pre-wrap select-none overflow-y-auto no-scrollbar">
            {pages[page]}
          </div>
        </div>
      </main>

      {/* 3. Barra Inferior de Lectura (Screens 6 & 10) */}
      <footer className={`px-6 py-4 flex items-center justify-between gap-4 border-t safe-bottom ${
        isDark ? 'border-neutral-900 bg-black/90' : 'border-amber-950/10 bg-[#f5f1e8]/95'
      }`}>
        {/* Contador de página */}
        <span className="text-xs font-bold font-mono opacity-65 shrink-0">
          {page + 1} / {totalPages}
        </span>

        {/* Deslizador de progreso de lectura */}
        <div className="flex-1 max-w-xs">
          <input
            type="range"
            min="0"
            max={totalPages - 1}
            value={page}
            onChange={(e) => {
              hapticLight();
              setPage(parseInt(e.target.value, 10));
            }}
            className="w-full accent-[#007aff] h-1.5 rounded-lg cursor-pointer bg-black/10 dark:bg-white/20"
          />
        </div>

        {/* Botón de tema/brillo */}
        <button
          onClick={toggleTheme}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Alternar tema"
        >
          {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-600" />}
        </button>
      </footer>
    </div>
  );
}
