import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Upload, Search, Smartphone, 
  Sparkles, Compass, Download, X, Layers, Loader2, AlertCircle,
  ArrowUpCircle, Check, BookMarked, Grid, List, Flame
} from 'lucide-react';
import Book3DCard from './Book3DCard';
import ContinueReadingHero from './ContinueReadingHero';
import AndroidInstallModal from './AndroidInstallModal';
import CatalogModal from './CatalogModal';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile, deleteBook } from '../db/bookStorage';
import { createSampleEpub } from '../utils/sampleBook';
import { createSampleManga } from '../utils/sampleManga';
import { downloadBookBuffer } from '../services/onlineCatalog';

// Clásicos universales listos para descarga directa en 1 toque
const FEATURED_CLASSICS = [
  {
    id: 'quijote',
    gutenbergId: 2000,
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/2000/pg2000.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/2000.epub3.images',
    badge: 'Obra Maestra',
    color: 'from-amber-950 via-slate-900 to-amber-900',
  },
  {
    id: 'metamorfosis',
    gutenbergId: 58221,
    title: 'La Metamorfosis',
    author: 'Franz Kafka',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/58221/pg58221.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/58221.epub3.images',
    badge: 'Filosofía',
    color: 'from-indigo-950 via-slate-900 to-slate-950',
  },
  {
    id: 'sherlock',
    gutenbergId: 48320,
    title: 'Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/48320/pg48320.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/48320.epub3.images',
    badge: 'Misterio',
    color: 'from-sky-950 via-slate-900 to-slate-950',
  },
  {
    id: 'orgullo',
    gutenbergId: 64317,
    title: 'Orgullo y Prejuicio',
    author: 'Jane Austen',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/64317.epub3.images',
    badge: 'Romance',
    color: 'from-rose-950 via-slate-900 to-slate-950',
  }
];

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
  const [downloadingClassicId, setDownloadingClassicId] = useState(null);
  const [classicSuccessId, setClassicSuccessId] = useState(null);
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

  // Descarga e importación en 1-clic de clásicos recomendados
  const handleQuickAddClassic = async (item) => {
    try {
      setDownloadingClassicId(item.id);
      setErrorMessage('');

      let buffer;
      if (item.epubUrl) {
        buffer = await downloadBookBuffer(item.epubUrl);
      } else {
        buffer = await createSampleEpub();
      }

      const meta = await extractUniversalMetadata(buffer, `${item.title}.epub`);
      const bookId = `classic_${item.id}_${Date.now()}`;

      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        title: meta.title || item.title,
        author: meta.author || item.author,
        cover: meta.cover || item.cover || null,
        description: meta.description || item.badge || '',
        fileSize: buffer.byteLength,
        format: 'epub',
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastCfi: null,
        lastChapter: '',
      });

      await onRefreshBooks();
      setClassicSuccessId(item.id);
      setTimeout(() => setClassicSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(`No se pudo descargar "${item.title}". Revisa tu conexión a internet.`);
    } finally {
      setDownloadingClassicId(null);
    }
  };

  // Agregar libro de muestra local inmediato (El Principito o Manga)
  const handleQuickAddSample = async (type = 'epub') => {
    try {
      setDownloadingClassicId(`sample_${type}`);
      const buffer = type === 'cbz' ? await createSampleManga() : await createSampleEpub();
      const filename = type === 'cbz' ? 'Capitulo_Manga_Demo.cbz' : 'El_Principito.epub';
      const meta = await extractUniversalMetadata(buffer, filename);
      const bookId = `sample_${Date.now()}`;

      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        title: meta.title,
        author: meta.author,
        cover: meta.cover,
        description: meta.description || '',
        fileSize: buffer.byteLength,
        format: type,
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastCfi: null,
        lastChapter: '',
      });

      await onRefreshBooks();
      setClassicSuccessId(`sample_${type}`);
      setTimeout(() => setClassicSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Error al cargar muestra.');
    } finally {
      setDownloadingClassicId(null);
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
      className="min-h-full w-full ambient-glow text-slate-100 flex flex-col relative transition-colors duration-300 pb-28"
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
            <Upload className="w-14 h-14 text-amber-400 animate-bounce mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">Suelta tu archivo aquí</h3>
            <p className="text-slate-400 text-xs text-center">Compatible con EPUB, PDF y CBZ (Manga)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. BARRA SUPERIOR COMPACTA, ELEGANTE Y RESPETUOSA DEL NOTCH */}
      <header className="sticky top-0 z-40 glass-panel safe-top px-4 py-2.5 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5">
          {/* Logo y título compacto */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none truncate">
                  Lector Libros
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 flex-shrink-0">
                  {books.length}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción compactos */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Botón Explorar Catálogo */}
            <button
              onClick={() => setShowCatalog(true)}
              className="h-8.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Descargar libros gratis de Project Gutenberg"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Catálogo</span>
            </button>

            {/* Botón Agregar Rápido */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-8.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="Importar libro"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              )}
              <span className="hidden xs:inline">Importar</span>
            </button>

            {/* Botón Actualizaciones */}
            {onOpenUpdates && (
              <button
                onClick={onOpenUpdates}
                className="relative h-8.5 w-8.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                title="Ajustes y actualizaciones"
              >
                <ArrowUpCircle className={`w-4 h-4 ${hasUpdate ? 'text-amber-400' : 'text-slate-400'}`} />
                {hasUpdate && (
                  <span className="absolute 1 top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,.cbz,.zip"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 2. CONTENIDO PRINCIPAL CON MÁXIMO APROVECHAMIENTO DEL ESPACIO */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col">
        {/* Mensaje de error si ocurre */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* SI HAY LIBROS EN LA BIBLIOTECA */}
        {books.length > 0 ? (
          <>
            {/* Continuar leyendo si hay libro activo */}
            {!search && activeFilter === 'all' && (
              <ContinueReadingHero book={heroBook} onOpen={onOpenBook} />
            )}

            {/* Barra compacta de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              {/* Buscador compacto */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por título o autor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 bg-slate-900/90 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="w-8 h-8 absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center justify-center rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros de formato comprimidos */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos', count: books.length },
                  { id: 'epub', label: 'EPUB', count: epubCount },
                  { id: 'pdf', label: 'PDF', count: pdfCount },
                  { id: 'cbz', label: 'Manga', count: mangaCount },
                ].map(tab => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 cursor-pointer ${
                        isActive 
                          ? 'bg-amber-400 text-slate-950 shadow-sm' 
                          : 'text-slate-300 bg-slate-900/80 border border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isActive ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRILLA DE LIBROS (Optimizada para espacio y densidad en pantalla) */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm font-semibold">No se encontraron libros con ese filtro.</p>
                <button
                  onClick={() => { setSearch(''); setActiveFilter('all'); }}
                  className="mt-2 text-xs text-amber-400 hover:underline font-bold"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
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
          </>
        ) : (
          /* ==========================================================
             ESTADO CUANDO LA BIBLIOTECA ESTÁ VACÍA
             (APROVECHAMIENTO MÁXIMO DEL ESPACIO CON RECOMENDACIONES)
             ========================================================== */
          <div className="flex-1 flex flex-col gap-5 py-2">
            {/* Banner de Bienvenida e Importación Rápida */}
            <div className="relative rounded-2xl overflow-hidden p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Tu biblioteca personal está lista
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Importa tus propios archivos o elige uno de los clásicos gratuitos de abajo.
                  </p>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Subir archivo (.epub, .pdf, .cbz)</span>
              </button>
            </div>

            {/* SECCIÓN 1: Lecturas instantáneas de prueba (1 Toque, Sin Internet) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Lecturas de prueba inmediata
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Listos en 1 segundo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Demo El Principito */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-14 rounded-lg bg-gradient-to-br from-amber-600 to-amber-950 border border-amber-400/30 flex items-center justify-center flex-shrink-0 shadow-md">
                      <BookOpen className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Novela EPUB</span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">El Principito</h4>
                      <p className="text-[11px] text-slate-400 truncate">Antoine de Saint-Exupéry</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAddSample('epub')}
                    disabled={downloadingClassicId === 'sample_epub'}
                    className="h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer"
                  >
                    {downloadingClassicId === 'sample_epub' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : classicSuccessId === 'sample_epub' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{classicSuccessId === 'sample_epub' ? '¡Listo!' : 'Probar'}</span>
                  </button>
                </div>

                {/* Demo Manga CBZ */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-purple-500/40 transition-all flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-14 rounded-lg bg-gradient-to-br from-purple-700 to-slate-950 border border-purple-400/30 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Layers className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Manga CBZ</span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">Capítulo Demo Manga</h4>
                      <p className="text-[11px] text-slate-400 truncate">Lectura japonesa (RTL)</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAddSample('cbz')}
                    disabled={downloadingClassicId === 'sample_cbz'}
                    className="h-8 px-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer"
                  >
                    {downloadingClassicId === 'sample_cbz' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : classicSuccessId === 'sample_cbz' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{classicSuccessId === 'sample_cbz' ? '¡Listo!' : 'Probar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Clásicos recomendados de dominio público (Project Gutenberg) */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Clásicos recomendados gratuitos
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatalog(true)}
                  className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline font-semibold"
                >
                  Ver +70.000 títulos
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FEATURED_CLASSICS.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-md group"
                  >
                    {/* Portada miniatura */}
                    <div className="aspect-[2.7/3.9] w-full rounded-xl overflow-hidden bg-slate-950 border border-white/5 relative mb-2.5 shadow-inner">
                      {item.cover ? (
                        <img 
                          src={item.cover} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${item.color} flex items-center justify-center p-2 text-center`}>
                          <span className="font-serif text-[11px] font-bold text-amber-200 line-clamp-2">
                            {item.title}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-950/80 text-amber-300 border border-white/10 backdrop-blur-md">
                        {item.badge}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.author}
                      </p>
                    </div>

                    <button
                      onClick={() => handleQuickAddClassic(item)}
                      disabled={downloadingClassicId === item.id}
                      className="w-full h-7.5 px-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {downloadingClassicId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      ) : classicSuccessId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Download className="w-3 h-3 text-indigo-400" />
                      )}
                      <span>
                        {downloadingClassicId === item.id 
                          ? 'Descargando...' 
                          : classicSuccessId === item.id 
                            ? 'Agregado' 
                            : 'Descargar'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN 3: Formatos Compatibles (Píldora informativa elegante) */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Formatos 100% compatibles:</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">EPUB</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">PDF</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">CBZ / Manga</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTÓN FLOTANTE ERGONÓMICO (FAB) EN LA ESQUINA INFERIOR
          Siempre al alcance del pulgar sin quitar espacio en vertical */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-6 right-5 z-40 h-12 px-4.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-500/30 flex items-center gap-2 border border-amber-300/40 transition-transform cursor-pointer safe-bottom"
        title="Agregar nuevo libro o manga"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 stroke-[3]" />
        )}
        <span>Agregar libro</span>
      </motion.button>

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
        onOpenBook={onOpenBook}
      />
    </div>
  );
}
