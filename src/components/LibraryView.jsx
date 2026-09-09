import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Upload, Search, Smartphone, 
  Sparkles, Compass, Download, X, Layers, Loader2, AlertCircle,
  ArrowUpCircle, Check, Menu, Filter, ArrowRight, Heart, CheckCircle2,
  ChevronRight
} from 'lucide-react';
import Book3DCard from './Book3DCard';
import ContinueReadingHero from './ContinueReadingHero';
import AndroidInstallModal from './AndroidInstallModal';
import CatalogModal from './CatalogModal';
import SidebarDrawer from './SidebarDrawer';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile, deleteBook, toggleFavorite } from '../db/bookStorage';
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
    id: 'odisea',
    gutenbergId: 58221,
    title: 'La Odisea',
    author: 'Homero',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/58221/pg58221.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/58221.epub3.images',
    badge: 'Épica Clásica',
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
    id: 'gatsby',
    gutenbergId: 64317,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    format: 'EPUB',
    cover: 'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/ebooks/64317.epub3.images',
    badge: 'Siglo XX',
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const handleToggleFavorite = async (bookId) => {
    await toggleFavorite(bookId);
    await onRefreshBooks();
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
  const completedCount = books.filter(b => b.progress >= 99).length;
  const favoritesCount = books.filter(b => !!b.isFavorite).length;

  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'favorites') return !!book.isFavorite;
    if (activeFilter === 'completed') return book.progress >= 99;
    if (activeFilter === 'epub') return !book.format || book.format === 'epub';
    if (activeFilter === 'pdf') return book.format === 'pdf';
    if (activeFilter === 'cbz') return book.format === 'cbz';
    return true;
  });

  const heroBook = books.find(b => b.progress > 0 && b.progress < 99) || books[0];

  const filterTitles = {
    all: 'Mi Biblioteca',
    favorites: 'Favoritos',
    completed: 'Libros Leídos',
    epub: 'Novelas EPUB',
    pdf: 'Documentos PDF',
    cbz: 'Manga / Cómics',
  };

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

      {/* 1. BARRA SUPERIOR ELEGANTE Y ESPACIOSA */}
      <header className="sticky top-0 z-40 glass-panel safe-top px-4 sm:px-6 py-3 border-b border-white/[0.08] shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Lado Izquierdo: Botón Hamburguesa ☰ + Título */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border border-white/10 shadow-sm"
              title="Abrir menú de navegación"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
              {hasUpdate && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
              )}
            </button>

            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none truncate">
                {filterTitles[activeFilter] || 'Mi Biblioteca'}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                {filteredBooks.length}
              </span>
            </div>
          </div>

          {/* Lado Derecho: Acciones rápidas (Catálogo + Importar) con botones generosos y texto visible */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botón rápido Explorar Catálogo */}
            <button
              onClick={() => setShowCatalog(true)}
              className="h-10 px-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Descargar libros de Gutenberg"
            >
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Catálogo</span>
            </button>

            {/* Botón Importar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="Importar libro"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[3]" />
              )}
              <span>Importar</span>
            </button>
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

      {/* 2. CONTENIDO PRINCIPAL CON MÁXIMO ESPACIO PARA LECTURA */}
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

        {/* Indicador de Filtro activo con botón para restablecer */}
        {activeFilter !== 'all' && (
          <div className="mb-3 p-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Mostrando solo: <strong>{filterTitles[activeFilter]}</strong></span>
            </div>
            <button 
              onClick={() => setActiveFilter('all')}
              className="text-[11px] underline font-bold hover:text-amber-200 cursor-pointer"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* SI HAY LIBROS EN LA BIBLIOTECA */}
        {books.length > 0 ? (
          <>
            {/* Continuar leyendo si hay libro activo */}
            {!search && activeFilter === 'all' && (
              <ContinueReadingHero book={heroBook} onOpen={onOpenBook} />
            )}

            {/* Buscador de libros compacto */}
            <div className="mb-4">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar en la biblioteca por título o autor..."
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
            </div>

            {/* GRILLA DE LIBROS (Optimizada para espacio y densidad en pantalla) */}
            {filteredBooks.length === 0 ? (
              activeFilter === 'favorites' ? (
                <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/10">
                    <Heart className="w-7 h-7 fill-rose-500/30" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">Aún no tienes libros en Favoritos</h4>
                  <p className="text-xs text-slate-400 max-w-xs text-center mb-4 leading-relaxed">
                    Toca el ícono de corazón ❤️ en cualquier libro de tu biblioteca para tenerlo a mano aquí.
                  </p>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="h-9 px-4 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                  >
                    Ver toda mi biblioteca
                  </button>
                </div>
              ) : activeFilter === 'completed' ? (
                <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1">Aún no has terminado ningún libro</h4>
                  <p className="text-xs text-slate-400 max-w-xs text-center mb-4 leading-relaxed">
                    Cuando leas un libro hasta el 100%, se guardará automáticamente en esta sección.
                  </p>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="h-9 px-4 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                  >
                    Ver toda mi biblioteca
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm font-semibold">No se encontraron libros con ese filtro o búsqueda.</p>
                  <button
                    onClick={() => { setSearch(''); setActiveFilter('all'); }}
                    className="mt-2 text-xs text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                </div>
              )
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
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        ) : (
          /* ==========================================================
             ESTADO CUANDO LA BIBLIOTECA ESTÁ VACÍA (HIGH-END DESIGN)
             ========================================================== */
          <div className="flex-1 flex flex-col gap-6 py-2">
            {/* Double-Bezel Hero Card de Bienvenida */}
            <div className="rounded-[2rem] p-1 bg-white/[0.04] border border-white/10 shadow-2xl">
              <div className="rounded-[calc(2rem-0.25rem)] p-5 sm:p-6 bg-gradient-to-br from-amber-500/15 via-slate-900/95 to-indigo-950/40 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 text-center sm:text-left relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-xl shadow-amber-500/20">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] bg-amber-400/15 text-amber-300 border border-amber-400/25 mb-1.5">
                      <Sparkles className="w-3 h-3" /> Tu Biblioteca Offline
                    </span>
                    <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                      Tu refugio de lectura está listo
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-lg">
                      Importa tus archivos en <strong>EPUB, PDF o CBZ (Manga)</strong>, o comienza ahora mismo con una de las lecturas recomendadas abajo.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 active:scale-[0.97] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-amber-500/25 cursor-pointer flex-shrink-0 relative z-10"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-950/20 flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </div>
                  <span>Importar Archivo</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 1: Lecturas instantáneas de prueba (1 Toque, Sin Internet) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Lecturas instantáneas de prueba
                  </h3>
                </div>
                <span className="text-xs font-semibold text-amber-400/80">Sin internet • Listas para leer</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Demo El Principito */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-lg group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-950 border border-amber-400/30 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6 text-amber-200" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wide block">Novela EPUB</span>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-amber-300 transition-colors">El Principito</h4>
                      <p className="text-xs text-slate-400 truncate">Antoine de Saint-Exupéry</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAddSample('epub')}
                    disabled={downloadingClassicId === 'sample_epub'}
                    className="h-11 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.97] text-slate-950 text-xs font-black flex items-center gap-2 flex-shrink-0 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-950/20 flex items-center justify-center">
                      {downloadingClassicId === 'sample_epub' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : classicSuccessId === 'sample_epub' ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </div>
                    <span>{classicSuccessId === 'sample_epub' ? '¡Listo!' : 'Leer demo'}</span>
                  </button>
                </div>

                {/* Demo Manga CBZ */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-purple-500/40 transition-all flex items-center justify-between gap-3 shadow-lg group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-slate-950 border border-purple-400/30 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Layers className="w-6 h-6 text-purple-200" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wide block">Manga CBZ</span>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-purple-300 transition-colors">Capítulo Demo Manga</h4>
                      <p className="text-xs text-slate-400 truncate">Lectura japonesa (RTL)</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickAddSample('cbz')}
                    disabled={downloadingClassicId === 'sample_cbz'}
                    className="h-11 px-4 rounded-2xl bg-purple-500 hover:bg-purple-400 active:scale-[0.97] text-white text-xs font-black flex items-center gap-2 flex-shrink-0 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                      {downloadingClassicId === 'sample_cbz' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : classicSuccessId === 'sample_cbz' ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </div>
                    <span>{classicSuccessId === 'sample_cbz' ? '¡Listo!' : 'Leer demo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Clásicos recomendados de dominio público (Project Gutenberg) */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Clásicos recomendados gratuitos
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatalog(true)}
                  className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver +70.000 títulos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                {FEATURED_CLASSICS.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-xl group"
                  >
                    {/* Portada miniatura con badge interno limpio */}
                    <div className="aspect-[2.7/3.9] w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 relative mb-3 shadow-inner">
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
                      <span className="absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-950/85 text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-md">
                        {item.badge}
                      </span>
                    </div>

                    <div className="mb-2 px-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                        {item.author}
                      </p>
                    </div>

                    <button
                      onClick={() => handleQuickAddClassic(item)}
                      disabled={downloadingClassicId === item.id}
                      className="w-full h-10 mt-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 active:scale-[0.97] border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      {downloadingClassicId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                      ) : classicSuccessId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      ) : (
                        <Download className="w-4 h-4 text-indigo-300" />
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

            {/* SECCIÓN 3: Formatos Compatibles */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Formatos 100% compatibles:</span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25 font-extrabold text-[11px]">EPUB</span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 font-extrabold text-[11px]">PDF</span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/25 font-extrabold text-[11px]">CBZ / Manga</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTÓN FLOTANTE ERGONÓMICO (FAB) CON ARQUITECTURA BUTTON-IN-BUTTON */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-6 right-5 z-40 h-13 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-2xl shadow-amber-500/35 flex items-center gap-2.5 border border-amber-300/50 transition-transform cursor-pointer safe-bottom"
        title="Agregar nuevo libro o manga"
      >
        <div className="w-7 h-7 rounded-xl bg-slate-950/20 flex items-center justify-center text-slate-950">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 stroke-[3]" />
          )}
        </div>
        <span>Agregar libro</span>
      </motion.button>

      {/* Barra lateral deslizable (Sidebar Drawer) */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        totalBooks={books.length}
        favoritesCount={favoritesCount}
        completedCount={completedCount}
        epubCount={epubCount}
        pdfCount={pdfCount}
        mangaCount={mangaCount}
        onOpenCatalog={() => setShowCatalog(true)}
        onImportClick={() => fileInputRef.current?.click()}
        onOpenUpdates={onOpenUpdates}
        hasUpdate={hasUpdate}
        installPrompt={installPrompt}
        onOpenInstall={() => setShowInstallGuide(true)}
      />

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
