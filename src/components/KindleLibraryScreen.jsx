import React, { useState, useRef } from 'react';
import { 
  Search, Plus, BookOpen, Sparkles, Loader2, User, 
  CheckCircle2, ArrowUpCircle 
} from 'lucide-react';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile } from '../db/bookStorage';
import { uploadBookToCloud } from '../services/firebase';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';
import { createSampleEpub } from '../utils/sampleBook';
import { createSampleManga } from '../utils/sampleManga';

export default function KindleLibraryScreen({
  books = [],
  onSelectBook,
  onRefreshBooks,
  currentUser,
  onGoToProfile,
  onGoToUpload,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos'); // 'Todos' | 'PDF' | 'EPUB' | 'Favoritos'
  const [loadingSample, setLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  // Procesar archivo rápido con el botón "+"
  const handleQuickAddFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      hapticMedium();
      const buffer = await file.arrayBuffer();
      const meta = await extractUniversalMetadata(buffer, file.name);

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await saveBookFile(bookId, buffer);

      const bookData = {
        id: bookId,
        title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        name: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        author: meta.author || 'Autor desconocido',
        format: meta.format || 'epub',
        cover: meta.cover || null,
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastRead: Date.now(),
      };

      await saveBookMetadata(bookData);
      hapticSuccess();
      await onRefreshBooks();

      if (currentUser && !currentUser.isAnonymous) {
        uploadBookToCloud(file, bookData, currentUser.uid).catch(err => {
          console.warn('Subida en segundo plano:', err);
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al procesar el archivo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Cargar libro de muestra instantáneo
  const handleLoadSample = async (type = 'epub') => {
    setLoadingSample(true);
    try {
      hapticMedium();
      let buffer;
      let title;
      let author;
      let format;

      if (type === 'manga') {
        buffer = await createSampleManga();
        title = 'Capítulo 1 - Manga Demo';
        author = 'Shonen Jump Style';
        format = 'cbz';
      } else {
        buffer = await createSampleEpub();
        title = 'El Principito';
        author = 'Antoine de Saint-Exupéry';
        format = 'epub';
      }

      const bookId = `sample_${Date.now()}`;
      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        title,
        name: title,
        author,
        format,
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
        progress: 45,
        lastRead: Date.now(),
      });

      hapticSuccess();
      await onRefreshBooks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSample(false);
    }
  };

  // Filtrado de libros por búsqueda y formato
  const filteredBooks = books.filter((book) => {
    const title = (book.title || book.name || '').toLowerCase();
    const author = (book.author || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = title.includes(query) || author.includes(query);

    if (!matchesSearch) return false;

    if (activeFilter === 'Todos') return true;
    if (activeFilter === 'PDF') return (book.format || '').toLowerCase() === 'pdf';
    if (activeFilter === 'EPUB') return (book.format || '').toLowerCase() === 'epub';
    if (activeFilter === 'Favoritos') return !!book.favorite;
    return true;
  });

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col p-5 pb-24 select-none safe-top">
      {/* 1. Encabezado con Título y Avatar de Usuario */}
      <header className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Mi Biblioteca
        </h1>

        <button
          onClick={() => {
            hapticLight();
            onGoToProfile?.();
          }}
          className="w-10 h-10 rounded-full bg-[#162032] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md"
          title="Ver perfil y configuración"
        >
          <User className="w-5 h-5 text-[#007aff]" />
        </button>
      </header>

      {/* 2. Barra de Búsqueda y Botón "+" */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar libros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#121824] border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all shadow-xs"
          />
        </div>

        {/* Botón Circular "+" para Carga Rápida */}
        <button
          onClick={() => {
            hapticLight();
            fileInputRef.current?.click();
          }}
          className="w-10 h-10 rounded-xl bg-[#162032] hover:bg-[#1f2d47] border border-slate-750 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          title="Agregar libro rápidamente"
        >
          <Plus className="w-5 h-5 text-[#007aff]" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf,.cbz,application/epub+zip,application/pdf"
          onChange={handleQuickAddFile}
          className="hidden"
        />
      </div>

      {/* 3. Chips de Filtro (Todos, PDF, EPUB, Favoritos) */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar py-1">
        {['Todos', 'PDF', 'EPUB', 'Favoritos'].map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => {
                hapticLight();
                setActiveFilter(filter);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#007aff] text-white shadow-md shadow-[#007aff]/30'
                  : 'bg-[#121824] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* 4. Cuadrícula de Libros (2 Columnas) */}
      {filteredBooks.length === 0 ? (
        <div className="my-auto py-12 px-6 text-center bg-[#121824]/60 rounded-3xl border border-slate-800/80">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">
            Tu biblioteca está vacía
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
            Puedes presionar el botón <b>+</b> de arriba o la pestaña <b>Subir</b> para importar tus libros.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleLoadSample('epub')}
              disabled={loadingSample}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#007aff] hover:bg-[#0066d6] text-white text-xs font-extrabold shadow-lg shadow-[#007aff]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Cargar muestra (El Principito)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => {
                hapticLight();
                onSelectBook(book);
              }}
              role="button"
              tabIndex={0}
              className="flex flex-col text-left group cursor-pointer select-none"
            >
              {/* Tarjeta de Portada Redondeada */}
              <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-slate-800/90 group-hover:border-[#007aff]/60 group-hover:shadow-[#007aff]/15 transition-all bg-[#121824] flex items-center justify-center relative mb-2.5">
                {book.cover ? (
                  <img
                    src={book.cover}
                    alt={book.title || book.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="p-4 flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-8 h-8 text-[#007aff]/70 mb-2" />
                    <span className="text-[11px] font-bold text-slate-400 line-clamp-2">
                      {book.title || book.name}
                    </span>
                  </div>
                )}

                {/* Badge de Progreso si se ha leído */}
                {book.progress > 0 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-black text-[#007aff] border border-slate-700/50">
                    {Math.round(book.progress)}%
                  </div>
                )}
              </div>

              {/* Título del Libro en Blanco Nítido */}
              <h3 className="text-sm font-bold text-white group-hover:text-[#007aff] transition-colors truncate">
                {book.title || book.name}
              </h3>

              {/* Etiqueta de Formato */}
              <div className="mt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#162032] text-slate-400 border border-slate-750">
                  {book.format || 'EPUB'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
