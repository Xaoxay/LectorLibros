// Library Screen from kindle-clone/App.js
import React, { useState } from 'react';
import { BookOpen, Search, UploadCloud, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';
import { createSampleEpub } from '../utils/sampleBook';
import { saveBookFile, saveBookMetadata } from '../db/bookStorage';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

// Componente BookCard de kindle-clone/App.js
export function BookCard({ book, onPress, onDelete }) {
  return (
    <div
      onClick={onPress}
      role="button"
      tabIndex={0}
      className="flex flex-col p-3 rounded-xl border border-slate-800/80 hover:border-[#4A6FFF]/50 hover:shadow-lg transition-all cursor-pointer select-none text-left relative group active:scale-[0.99]"
      style={{ backgroundColor: COLORS.card }}
    >
      {/* Portada */}
      <div className="w-full h-48 sm:h-52 rounded-lg overflow-hidden mb-2 bg-[#25313b] flex items-center justify-center relative">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.name || book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <BookOpen className="w-8 h-8 text-[#4A6FFF]/70 mb-2" />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>
              {(book.type || book.format || 'LIBRO').toUpperCase()}
            </span>
          </div>
        )}

        {/* Botón eliminar */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(book.id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Eliminar libro"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Título */}
      <h3
        className="font-semibold text-sm line-clamp-2 mb-1"
        style={{ color: COLORS.text }}
      >
        {book.name || book.title}
      </h3>

      {/* Barra de progreso */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden mt-auto mb-1"
        style={{ backgroundColor: '#12202b' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            backgroundColor: COLORS.accent,
            width: `${Math.min(100, Math.max(0, book.progress || 0))}%`,
          }}
        />
      </div>

      {/* Meta */}
      <span className="text-xs" style={{ color: COLORS.muted }}>
        {Math.round(book.progress || 0)}% leído
      </span>
    </div>
  );
}

export default function KindleCloneLibrary({
  books = [],
  loading = false,
  navigation,
  onRefreshBooks,
  onDeleteBook,
}) {
  const [loadingSample, setLoadingSample] = useState(false);

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      hapticMedium();
      const buffer = await createSampleEpub();
      const bookId = `sample_${Date.now()}`;
      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        name: 'El Principito',
        title: 'El Principito',
        author: 'Antoine de Saint-Exupéry',
        type: 'epub',
        format: 'epub',
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        progress: 0,
        createdAt: Date.now(),
      });
      await onRefreshBooks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div
      className="min-h-full w-full flex flex-col p-4 pb-20 select-none safe-top"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      {/* Header Row from kindle-clone */}
      <div className="flex items-center justify-between pb-4 pt-2 border-b border-slate-800/80 mb-4">
        <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
          Mi Biblioteca
        </h2>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              hapticLight();
              navigation.navigate('Search');
            }}
            className="text-sm font-semibold cursor-pointer transition-colors hover:text-white"
            style={{ color: COLORS.muted }}
          >
            Buscar
          </button>

          <button
            onClick={() => {
              hapticLight();
              navigation.navigate('Upload');
            }}
            className="text-sm font-bold cursor-pointer transition-colors hover:opacity-80"
            style={{ color: COLORS.accent }}
          >
            Subir
          </button>

          <button
            onClick={() => {
              hapticLight();
              navigation.navigate('Profile');
            }}
            className="w-8 h-8 rounded-full bg-[#121824] border border-slate-750 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Mi perfil"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: COLORS.accent }} />
          <span className="text-xs" style={{ color: COLORS.muted }}>Cargando libros...</span>
        </div>
      ) : books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" style={{ color: COLORS.muted }} />
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            No hay libros aún — sube alguno.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigation.navigate('Upload')}
              className="px-5 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
              style={{ backgroundColor: COLORS.accent }}
            >
              Subir mi primer libro
            </button>

            <button
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="px-4 py-3 rounded-xl border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              style={{ backgroundColor: COLORS.card }}
            >
              {loadingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              <span>Cargar muestra (El Principito)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onPress={() => {
                hapticLight();
                navigation.navigate('Reader', { book });
              }}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
