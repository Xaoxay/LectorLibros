import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Upload, Search, Smartphone, 
  Sparkles, Compass, Download, X, Layers, Loader2, AlertCircle,
  ArrowUpCircle
} from 'lucide-react';
import Book3DCard from './Book3DCard';
import ContinueReadingHero from './ContinueReadingHero';
import AndroidInstallModal from './AndroidInstallModal';
import CatalogModal from './CatalogModal';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile, deleteBook } from '../db/bookStorage';

export default function LibraryView({ 
  books, 
  onOpenBook, 
  onRefreshBooks, 
  installPrompt,
  hasUpdate,
  onOpenUpdates,
}) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processBookFile = async (file) => {
    if (!file) return;

    setUploading(true);
    setErrorMessage('');

    try {
      const meta = await extractUniversalMetadata(file, file.name);
      const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      await saveBookFile(bookId, meta.arrayBuffer);
      await saveBookMetadata({
        id: bookId,
        title: meta.title,
        author: meta.author,
        cover: meta.cover,
        description: meta.description || '',
        fileSize: meta.fileSize,
        format: meta.format || 'epub',
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastCfi: null,
        lastChapter: '',
      });

      await onRefreshBooks();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'No se pudo leer el archivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processBookFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processBookFile(file);
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm('¿Deseas eliminar este libro de tu biblioteca?')) {
      await deleteBook(bookId);
      await onRefreshBooks();
    }
  };

  const epubCount = books.filter(b => !b.format || b.format === 'epub').length;
  const pdfCount = books.filter(b => b.format === 'pdf').length;
  const mangaCount = books.filter(b => b.format === 'cbz').length;

  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'epub') return !book.format || book.format === 'epub';
    if (activeFilter === 'pdf') return book.format === 'pdf';
    if (activeFilter === 'cbz') return book.format === 'cbz';
    if (activeFilter === 'completed') return book.progress >= 99;
    return true;
  });

  const heroBook = books.find(b => b.progress > 0 && b.progress < 99) || books[0];

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-full w-full ambient-glow text-slate-100 flex flex-col relative transition-colors duration-300 pb-24 sm:pb-12"
    >
      {/* Overlay Drag & Drop */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 border-4 border-dashed border-amber-500 flex flex-col items-center justify-center p-6 backdrop-blur-md"
          >
            <Upload className="w-16 h-16 text-amber-400 animate-bounce mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Suelta tu archivo aquí</h3>
            <p className="text-slate-400 text-sm text-center">EPUB, PDF y Manga/Cómics (CBZ o ZIP)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. BARRA SUPERIOR LIMPIA Y ESPACIOSA */}
      <header className="sticky top-0 z-40 glass-panel safe-top px-4 py-3.5 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                Lector Digital
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {books.length} {books.length === 1 ? 'libro en tu colección' : 'libros en tu colección'}
              </p>
            </div>
          </div>

          {/* Botones de acción laterales */}
          <div className="flex items-center gap-2.5">
            {/* Botón Catálogo */}
            <button
              onClick={() => setShowCatalog(true)}
              className="h-11 px-3.5 sm:px-4 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              title="Descargar libros gratis"
            >
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              <span className="hidden sm:inline">Descargar Libros</span>
              <span className="sm:hidden">Descargar</span>
            </button>

            {/* Botón Instalar */}
            <button
              onClick={() => setShowInstallGuide(true)}
              className={`h-11 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 active:scale-95 shadow-sm cursor-pointer ${
                installPrompt
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 font-extrabold animate-pulse'
                  : 'bg-slate-800 border border-white/10 text-slate-200 hover:bg-slate-750 active:bg-slate-700'
              }`}
              title="Instalar en celular"
            >
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{installPrompt ? 'Instalar App' : 'Instalar'}</span>
              <span className="sm:hidden">Instalar</span>
            </button>

            {/* Botón Actualizaciones */}
            {onOpenUpdates && (
              <button
                onClick={onOpenUpdates}
                className="h-11 px-3 rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-750 active:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm relative cursor-pointer"
                title="Comprobar y buscar actualizaciones"
              >
                <ArrowUpCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${hasUpdate ? 'text-amber-400 animate-bounce' : 'text-slate-300'}`} />
                <span className="hidden sm:inline">Actualizar</span>
                {hasUpdate && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,.cbz,.zip"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {errorMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* BOTÓN PRINCIPAL DEDICADO: AGREGAR LIBRO (Fila propia amplia para que NUNCA se deforme) */}
        <div className="mb-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-14 sm:h-15 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-amber-300 active:scale-[0.98] text-slate-950 font-extrabold text-base sm:text-lg shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Plus className="w-6 h-6 stroke-[3]" />
            )}
            <span>{uploading ? 'Procesando archivo...' : 'Agregar Libro o Manga (EPUB, PDF, CBZ)'}</span>
          </button>
        </div>

        {/* Hero si hay libros */}
        {books.length > 0 && !search && activeFilter === 'all' && (
          <ContinueReadingHero book={heroBook} onOpen={onOpenBook} />
        )}

        {/* Buscador de libros con altura completa y bien alineado */}
        <div className="mb-4">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar en tu biblioteca por título o autor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-13 pl-12 pr-12 bg-slate-900/90 border border-white/10 rounded-2xl text-base sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="w-11 h-11 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 flex items-center justify-center rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de formato en fila horizontal con scroll */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {[
            { id: 'all', label: 'Todos', count: books.length },
            { id: 'epub', label: 'EPUB', count: epubCount },
            { id: 'pdf', label: 'PDF', count: pdfCount },
            { id: 'cbz', label: 'Manga / Cómic', count: mangaCount },
          ].map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`relative h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 flex-shrink-0 active:scale-95 ${
                  isActive ? 'text-slate-950' : 'text-slate-300 bg-slate-900 border border-white/10 hover:bg-slate-850'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFormatPill"
                    className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                <span className={`relative z-10 text-[11px] px-2 py-0.5 rounded-md font-extrabold ${
                  isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. GRILLA DE LIBROS (2 columnas limpias en móvil, con espaciado equilibrado) */}
        {books.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto py-10 px-4 text-center max-w-md mx-auto flex flex-col items-center"
          >
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center mb-5 shadow-2xl">
              <BookOpen className="w-10 h-10 text-amber-400 animate-soft-pulse" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Tu biblioteca está vacía</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Agrega cualquier archivo en <span className="text-amber-400 font-semibold">.epub</span>, documento <span className="text-rose-400 font-semibold">.pdf</span> o cómic en <span className="text-purple-400 font-semibold">.cbz</span>.
            </p>

            <button
              onClick={() => setShowCatalog(true)}
              className="h-12 w-full flex items-center justify-center gap-2 px-5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold text-sm transition-colors"
            >
              <Compass className="w-5 h-5 text-indigo-400" />
              <span>Explorar catálogo de libros gratis</span>
            </button>
          </motion.div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-base font-semibold">No se encontraron libros en esta categoría.</p>
            <button
              onClick={() => { setSearch(''); setActiveFilter('all'); }}
              className="mt-3 text-sm text-amber-400 hover:underline font-bold"
            >
              Ver todos los libros
            </button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5"
          >
            <AnimatePresence>
              {filteredBooks.map(book => (
                <Book3DCard
                  key={book.id}
                  book={book}
                  onOpen={onOpenBook}
                  onDelete={handleDeleteBook}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Modales */}
      <AndroidInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        installPrompt={installPrompt}
      />

      <CatalogModal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        onRefreshBooks={onRefreshBooks}
      />
    </div>
  );
}
