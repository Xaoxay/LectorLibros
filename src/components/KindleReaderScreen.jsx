import React, { useState, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
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
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Si es un archivo real con formato EPUB, PDF o CBZ, delegamos al visor especializado
  // que cuenta con su motor de renderizado y física 3D integrada:
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

  // Si es un libro de texto o páginas de muestra (como en el código React Native del usuario)
  const pages = book.pages && book.pages.length > 0 
    ? book.pages 
    : [
        `Capítulo 1: Bienvenido a tu Kindle Clone.\n\nEste lector cuenta con física táctil de pase de página en 3D interactiva.\n\nArrastra tu dedo hacia la izquierda o derecha para ver la curvatura y rotación tridimensional en tiempo real.`,
        `Capítulo 2: Sube tus propios libros.\n\nPuedes presionar "⬅ Volver" en la barra superior y tocar el botón azul "Subir libro" para agregar cualquier archivo EPUB, PDF o Manga a tu biblioteca local.`,
        `Capítulo 3: Lectura Offline y en la Nube.\n\nTus libros y tu progreso de lectura se guardan instantáneamente en tu dispositivo. Si inicias sesión con tu cuenta, también se sincronizan automáticamente con Firebase.`
      ];

  const totalPages = pages.length;

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

    // Umbral de 80px del código React Native del usuario
    if (translateX < -80 && page < totalPages - 1) {
      hapticLight();
      setPage((p) => p + 1);
    } else if (translateX > 80 && page > 0) {
      hapticLight();
      setPage((p) => p - 1);
    }

    setTranslateX(0);
  };

  return (
    <div
      className="h-full w-full flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: '#f5f1e8', padding: '20px' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Barra Superior con botón Volver y Contador de Páginas */}
      <div className="flex items-center justify-between pb-3 border-b border-black/10 safe-top">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-slate-800 text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>⬅ Volver</span>
        </button>

        <div className="text-center font-bold text-sm text-slate-700">
          {page + 1}/{totalPages}
        </div>

        <div className="w-16" />
      </div>

      {/* Contenedor del Libro con Física 3D */}
      <div
        className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full my-auto"
        style={{
          perspective: '1000px',
        }}
      >
        <div
          style={{
            transform: `translateX(${translateX}px) rotateY(${translateX / 25}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            transformOrigin: translateX < 0 ? 'right center' : 'left center',
          }}
          className="bg-[#faf7f2] p-8 sm:p-12 rounded-2xl shadow-md border border-amber-950/10 min-h-[360px] flex flex-col justify-center"
        >
          <p
            className="font-serif text-[#1a1a1a] whitespace-pre-wrap select-none leading-relaxed"
            style={{ fontSize: '20px', lineHeight: '34px' }}
          >
            {pages[page]}
          </p>
        </div>
      </div>

      {/* Indicador de Ayuda inferior */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-black/5 safe-bottom">
        <button
          onClick={() => {
            if (page > 0) {
              hapticLight();
              setPage((p) => p - 1);
            }
          }}
          disabled={page === 0}
          className="flex items-center gap-1 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <span className="text-[11px] text-slate-400">
          Desliza para pasar de página
        </span>

        <button
          onClick={() => {
            if (page < totalPages - 1) {
              hapticLight();
              setPage((p) => p + 1);
            }
          }}
          disabled={page >= totalPages - 1}
          className="flex items-center gap-1 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
