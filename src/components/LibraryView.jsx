import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Upload, Search, Smartphone, 
  Sparkles, Compass, Download, X, Layers, Loader2, AlertCircle,
  ArrowUpCircle, Check, Menu, Filter, ArrowRight, Heart, CheckCircle2,
  ChevronRight, User, Cloud
} from 'lucide-react';
import Book3DCard from './Book3DCard';
import ContinueReadingHero from './ContinueReadingHero';
import AndroidInstallModal from './AndroidInstallModal';
import CatalogModal from './CatalogModal';
import SidebarDrawer from './SidebarDrawer';
import BottomNavBar from './BottomNavBar';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile, deleteBook, toggleFavorite } from '../db/bookStorage';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';
import { createSampleEpub } from '../utils/sampleBook';
import { createSampleManga } from '../utils/sampleManga';
import { downloadBookBuffer } from '../services/onlineCatalog';
import { uploadBookToCloud } from '../services/firebase';

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
  currentUser,
  onOpenAuth,
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

      // Sincronización en la nube si hay sesión activa en Firebase
      if (currentUser && !currentUser.isAnonymous) {
        uploadBookToCloud(file, meta, currentUser.uid).catch(err => {
          console.warn('Sincronización en la nube (background):', err);
        });
      }
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
    hapticLight();
    await toggleFavorite(bookId);
    await onRefreshBooks();
  };

  // Descarga e importación en 1-clic de clásicos recomendados
  const handleQuickAddClassic = async (item) => {
    try {
      hapticMedium();
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
      hapticSuccess();
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
      className="min-h-full w-full ambient-glow text-slate-100 flex flex-col relative transition-colors duration-300 pb-36 sm:pb-44"
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

      {/* 1. BARRA SUPERIOR ELEGANTE Y ESPACIOSA (MATERIAL YOU APP BAR) */}
      <header className="sticky top-0 z-40 glass-panel safe-top px-4 sm:px-6 py-3 border-b border-white/[0.08] shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Lado Izquierdo: Botón Menú ☰ + Título */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                hapticLight();
                setIsDrawerOpen(true);
              }}
              className="relative w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border border-white/10 shadow-sm"
              title="Abrir menú de formatos y ajustes"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
              {hasUpdate && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950 animate-ping" />
              )}
            </button>

            <div className="min-w-0 flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none truncate">
                {filterTitles[activeFilter] || 'Mi Biblioteca'}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                {filteredBooks.length}
              </span>
            </div>
          </div>

          {/* Lado Derecho: Botón de Cuenta / Nube + Actualizaciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenAuth && (
              <button
                onClick={() => {
                  hapticLight();
                  onOpenAuth();
                }}
                className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-xs font-bold ${
                  currentUser && !currentUser.isAnonymous
                    ? 'bg-[#4a6fff]/15 border-[#4a6fff]/30 text-[#7392ff]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                title={currentUser && !currentUser.isAnonymous ? `Conectado como ${currentUser.email}` : "Iniciar sesión / Cuenta"}
              >
                {currentUser && !currentUser.isAnonymous ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#4a6fff]" />
                    <span className="max-w-[70px] sm:max-w-[120px] truncate">{currentUser.email.split('@')[0]}</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cuenta</span>
                  </>
                )}
              </button>
            )}

            {hasUpdate && (
              <button
                onClick={() => {
                  hapticLight();
                  onOpenUpdates();
                }}
                className="h-9 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Actualización disponible"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="hidden sm:inline">Actualizar</span>
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

      {/* 2. CONTENIDO PRINCIPAL CON MÁXIMO ESPACIO PARA LECTURA */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col">
        {/* BOTÓN PROMINENTE "SUBIR LIBRO" (KINDLE CLONE DESIGN) */}
        <div className="mb-3.5">
          <button
            onClick={() => {
              hapticLight();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#4a6fff] hover:bg-[#3d5fe6] active:scale-[0.98] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-[#4a6fff]/25 transition-all cursor-pointer border border-[#6e8eff]/30"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Procesando libro...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 stroke-[2.5]" />
                <span>Subir libro</span>
                <span className="text-xs font-semibold opacity-85 hidden sm:inline">• EPUB, PDF o CBZ (Manga)</span>
              </>
            )}
          </button>
        </div>
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

            {/* Buscador de libros simétrico y pulido */}
            <div className="mb-4">
              <div className="relative w-full">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar en la biblioteca por título o autor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-12 pl-11 pr-11 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/20 transition-all shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => { hapticLight(); setSearch(''); }}
                    className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
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
             ESTADO CUANDO LA BIBLIOTECA ESTÁ VACÍA (MINIMALISTA Y ZEN)
             ========================================================== */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 sm:py-28 px-4 select-none">
            <div className="w-18 h-18 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-amber-500/10">
              <BookOpen className="w-9 h-9 stroke-[1.8]" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight mb-1.5">
              Tu biblioteca está vacía
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
              Desliza la barra lateral ☰ para subir un libro o probar una lectura instantánea sin conexión.
            </p>
          </div>
        )}
      </main>


      {/* Barra lateral deslizable (Sidebar Drawer para Formatos y Ajustes) */}
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
        onQuickAddSample={handleQuickAddSample}
        sampleLoadingId={downloadingClassicId}
        sampleSuccessId={classicSuccessId}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
      />

      {/* Modales y Hojas Inferiores */}
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

      {/* Barra de Navegación Inferior Móvil Material You (Zona del Pulgar) */}
      <BottomNavBar
        activeTab={activeFilter === 'all' || activeFilter === 'favorites' || activeFilter === 'completed' ? activeFilter : 'all'}
        onSelectTab={(tabId) => {
          setActiveFilter(tabId);
        }}
        totalBooks={books.length}
        favoritesCount={favoritesCount}
        completedCount={completedCount}
        onOpenCatalog={() => setShowCatalog(true)}
      />
    </div>
  );
}
