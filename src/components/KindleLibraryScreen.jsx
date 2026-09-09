import React, { useState, useRef } from 'react';
import { 
  Upload, Search, BookOpen, Trash2, LogOut, Loader2, 
  Sparkles, CheckCircle2, ArrowUpCircle, HardDrive, User, RefreshCw
} from 'lucide-react';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile, deleteBook } from '../db/bookStorage';
import { uploadBookToCloud } from '../services/firebase';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';
import { createSampleEpub } from '../utils/sampleBook';
import { createSampleManga } from '../utils/sampleManga';

export default function KindleLibraryScreen({
  books = [],
  onOpenBook,
  onRefreshBooks,
  currentUser,
  onLogout,
  onOpenUpdates,
  hasUpdate,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  // Procesar archivo seleccionado (EPUB, PDF, CBZ)
  const processBookFile = async (file) => {
    if (!file) return;

    setUploading(true);
    setErrorMessage('');
    try {
      hapticMedium();
      const buffer = await file.arrayBuffer();
      const meta = await extractUniversalMetadata(buffer, file.name);

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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

      // Sincronización en la nube opcional en segundo plano
      if (currentUser && !currentUser.isAnonymous) {
        uploadBookToCloud(file, bookData, currentUser.uid).catch((err) => {
          console.warn('Subida a nube (background):', err);
        });
      }
    } catch (err) {
      console.error('Error al procesar libro:', err);
      setErrorMessage(err.message || 'Error al procesar el archivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processBookFile(file);
  };

  const handleDelete = async (e, bookId) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas eliminar este libro de tu biblioteca?')) {
      hapticLight();
      await deleteBook(bookId);
      await onRefreshBooks();
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
        title = 'El Principito (Muestra)';
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
        cover: null,
        progress: 0,
        lastRead: Date.now(),
      });

      hapticSuccess();
      await onRefreshBooks();
    } catch (err) {
      console.error(err);
      setErrorMessage('No se pudo generar el libro de prueba.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Filtrar libros por búsqueda
  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    const title = (b.title || b.name || '').toLowerCase();
    const author = (b.author || '').toLowerCase();
    return title.includes(q) || author.includes(q);
  });

  return (
    <div className="min-h-full w-full bg-[#f8f9fa] text-slate-900 flex flex-col">
      {/* Header Superior Kindle */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>📚 Kindle Clone</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
            {currentUser?.isAnonymous ? (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <HardDrive className="w-3 h-3" /> Modo Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 truncate max-w-[200px]">
                <User className="w-3 h-3" /> {currentUser?.email || 'Usuario'}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUpdate && (
            <button
              onClick={onOpenUpdates}
              className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Actualización disponible"
            >
              <ArrowUpCircle className="w-5 h-5 animate-pulse" />
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar sesión / Cambiar cuenta"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 pb-24">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Botón Principal: Subir libro (Exacto al diseño del usuario) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-[#4a6fff] hover:bg-[#3d5fe6] active:scale-[0.98] text-white p-4 sm:p-5 rounded-2xl font-extrabold text-base shadow-lg shadow-[#4a6fff]/25 flex items-center justify-center gap-2.5 mb-5 cursor-pointer transition-all disabled:opacity-75"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando libro...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Subir libro</span>
            </>
          )}
        </button>

        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,.pdf,.cbz,application/epub+zip,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Buscador de libros (aparece si hay libros en la biblioteca) */}
        {books.length > 0 && (
          <div className="relative mb-5">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4a6fff] focus:ring-2 focus:ring-[#4a6fff]/15 transition-all shadow-xs"
            />
          </div>
        )}

        {/* Lista de Libros (Estilo FlatList del usuario) */}
        {books.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#4a6fff] flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Tu biblioteca está vacía
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
              Presiona el botón "Subir libro" de arriba para agregar tus lecturas en EPUB, PDF o CBZ.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => handleLoadSample('epub')}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingSample ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                <span>Muestra: El Principito</span>
              </button>

              <button
                onClick={() => handleLoadSample('manga')}
                disabled={loadingSample}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingSample ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-rose-500" />}
                <span>Muestra: Manga Demo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mis Libros ({filteredBooks.length})
              </span>
            </div>

            {filteredBooks.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenBook(item)}
                role="button"
                tabIndex={0}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-[#4a6fff]/40 hover:shadow-md transition-all flex items-center gap-3.5 text-left cursor-pointer group select-none active:scale-[0.99]"
              >
                {/* Miniatura o Icono de Libro */}
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 shadow-xs flex items-center justify-center">
                  {item.cover ? (
                    <img src={item.cover} alt={item.title || item.name} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-[#4a6fff]/70" />
                  )}
                </div>

                {/* Info del Libro */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#4a6fff] transition-colors truncate">
                    {item.title || item.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {item.author || 'Autor desconocido'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {item.format || 'epub'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.progress ? `${Math.round(item.progress)}% leído` : 'Sin empezar'}
                    </span>
                  </div>
                </div>

                {/* Botón eliminar libro */}
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                  title="Eliminar libro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {filteredBooks.length === 0 && searchQuery && (
              <div className="text-center py-8 text-xs text-slate-400">
                No se encontraron libros con "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
