import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Compass, Download, ExternalLink, BookOpen, 
  Sparkles, Check, Globe, HelpCircle, Search, Loader2, 
  Languages, AlertCircle, RefreshCw 
} from 'lucide-react';
import { createSampleEpub } from '../utils/sampleBook';
import { createSampleManga } from '../utils/sampleManga';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookFile, saveBookMetadata } from '../db/bookStorage';
import { searchOnlineBooks, getPopularBooks, downloadBookBuffer } from '../services/onlineCatalog';
import { hapticLight, hapticSuccess } from '../services/haptics';

export default function CatalogModal({ isOpen, onClose, onRefreshBooks, onOpenBook }) {
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'direct' | 'sites'
  
  // Estados para búsqueda online
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('es'); // 'es' | 'all'
  const [onlineBooks, setOnlineBooks] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState(null);

  // Estados para libros directos
  const [loadingDirectId, setLoadingDirectId] = useState(null);
  const [directSuccessId, setDirectSuccessId] = useState(null);

  // Cargar libros populares al abrir
  useEffect(() => {
    if (isOpen && onlineBooks.length === 0) {
      loadPopular();
    }
  }, [isOpen]);

  const loadPopular = async () => {
    try {
      setLoadingOnline(true);
      setOnlineError(null);
      const res = await getPopularBooks(language);
      setOnlineBooks(res.results || []);
    } catch (err) {
      console.error(err);
      setOnlineError('No se pudieron cargar los libros online. Revisa tu conexión.');
    } finally {
      setLoadingOnline(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      return loadPopular();
    }

    try {
      setLoadingOnline(true);
      setOnlineError(null);
      const res = await searchOnlineBooks(searchQuery, { language });
      setOnlineBooks(res.results || []);
      if (res.results.length === 0) {
        setOnlineError('No se encontraron libros con esa búsqueda. Prueba con otra palabra clave.');
      }
    } catch (err) {
      console.error(err);
      setOnlineError('Error al buscar libros en línea. Por favor reintenta.');
    } finally {
      setLoadingOnline(false);
    }
  };

  // Descarga online y guardado en biblioteca local
  const handleDownloadOnline = async (book) => {
    try {
      setDownloadingId(book.id);
      setOnlineError(null);

      // 1. Descargar archivo binario del EPUB
      const buffer = await downloadBookBuffer(book.epubUrl);

      // 2. Extraer metadatos y portada
      const fileName = `${book.title}.epub`;
      const meta = await extractUniversalMetadata(buffer, fileName);

      // 3. Generar ID único
      const bookId = `online_${book.gutenbergId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 4. Guardar archivo y metadatos en IndexedDB local
      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        title: meta.title || book.title,
        author: meta.author || book.author,
        cover: meta.cover || book.cover || null,
        description: meta.description || book.subjects?.join(', ') || '',
        fileSize: buffer.byteLength,
        format: 'epub',
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastCfi: null,
        lastChapter: '',
      });

      // 5. Actualizar la biblioteca del usuario
      await onRefreshBooks();
      hapticSuccess();
      setDownloadSuccessId(book.id);
      setTimeout(() => setDownloadSuccessId(null), 4000);
    } catch (err) {
      console.error(err);
      setOnlineError('No se pudo descargar este libro: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Sitios legales recomendados
  const sites = [
    {
      name: 'Elejandría',
      lang: '🇪🇸 Español',
      desc: 'La mejor biblioteca digital gratuita de clásicos en español. Descargas directas en EPUB y PDF sin registrarte.',
      formats: ['EPUB', 'PDF'],
      url: 'https://www.elejandria.net',
      badge: 'Recomendado #1',
    },
    {
      name: 'Project Gutenberg',
      lang: '🌍 Multilingüe (Español, Inglés)',
      desc: 'Más de 70.000 libros libres de derechos de autor. Gran catálogo de obras maestras universales.',
      formats: ['EPUB', 'PDF', 'MOBI'],
      url: 'https://www.gutenberg.org',
      badge: 'El más grande',
    },
    {
      name: 'Standard Ebooks',
      lang: '🇬🇧 Inglés',
      desc: 'Libros clásicos formateados con maquetación y tipografía profesional de altísima calidad visual.',
      formats: ['EPUB'],
      url: 'https://standardebooks.org',
      badge: 'Alta calidad',
    },
    {
      name: 'Digital Comic Museum',
      lang: '💥 Cómics clásicos',
      desc: 'Cómics de la época dorada y de plata de dominio público listos para leer en formato CBZ.',
      formats: ['CBZ', 'CBR'],
      url: 'https://digitalcomicmuseum.com',
      badge: 'Cómics / Manga',
    },
    {
      name: 'Open Library / Internet Archive',
      lang: '🌍 Millones de títulos',
      desc: 'Proyecto sin fines de lucro para crear una página web por cada libro publicado.',
      formats: ['EPUB', 'PDF'],
      url: 'https://openlibrary.org',
      badge: 'Archivo Global',
    }
  ];

  // Libros para añadir con 1 clic
  const directBooks = [
    {
      id: 'principito',
      title: 'El Principito (Selección)',
      author: 'Antoine de Saint-Exupéry',
      format: 'EPUB',
      desc: 'Un clásico inmortal sobre la amistad, el amor y el sentido de la vida.',
      generator: createSampleEpub,
    },
    {
      id: 'manga_demo',
      title: 'Capítulo Demo de Manga',
      author: 'Estilo Japonés (RTL)',
      format: 'CBZ (Manga)',
      desc: 'Viñetas en blanco y negro para probar el modo de lectura japonesa de derecha a izquierda.',
      generator: createSampleManga,
    }
  ];

  const handleDownloadDirect = async (item) => {
    try {
      setLoadingDirectId(item.id);
      const buffer = await item.generator();
      const meta = await extractUniversalMetadata(buffer, `${item.title}.${item.format.toLowerCase().includes('cbz') ? 'cbz' : 'epub'}`);
      const bookId = `sample_${item.id}_${Date.now()}`;

      await saveBookFile(bookId, buffer);
      await saveBookMetadata({
        id: bookId,
        title: meta.title,
        author: meta.author,
        cover: meta.cover,
        description: meta.description,
        fileSize: meta.fileSize,
        format: meta.format,
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastCfi: null,
        lastChapter: '',
      });

      await onRefreshBooks();
      hapticSuccess();
      setDirectSuccessId(item.id);
      setTimeout(() => setDirectSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al agregar el libro: ' + err.message);
    } finally {
      setLoadingDirectId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.4 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 130 || info.velocity.y > 350) {
              hapticLight();
              onClose();
            }
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="w-full sm:max-w-3xl h-[92vh] sm:h-[84vh] bg-slate-900/98 border border-white/10 rounded-t-[32px] sm:rounded-3xl flex flex-col text-slate-100 shadow-2xl safe-bottom backdrop-blur-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Manija táctil superior para deslizar y cerrar (Material 3 Drag Handle) */}
          <div className="w-full pt-3 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing sm:hidden">
            <div className="w-14 h-1.5 bg-slate-600/70 hover:bg-slate-500 rounded-full" />
          </div>

          {/* Encabezado */}
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Descubrir y Descargar Libros
                </h3>
                <p className="text-xs text-slate-400">
                  Miles de títulos libres listos para leer offline en tu celular
                </p>
              </div>
            </div>
            <button 
              onClick={() => { hapticLight(); onClose(); }}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar catálogo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pestañas estilo Material 3 Segmented Pill Buttons */}
          <div className="px-4 sm:px-5 py-2.5 border-b border-white/5">
            <div className="flex gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => { hapticLight(); setActiveTab('online'); }}
                className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-1 justify-center cursor-pointer ${
                  activeTab === 'online'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="truncate">Buscador (+70k)</span>
              </button>

              <button
                onClick={() => { hapticLight(); setActiveTab('direct'); }}
                className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-1 justify-center cursor-pointer ${
                  activeTab === 'direct'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="truncate">Muestras (1-Clic)</span>
              </button>

              <button
                onClick={() => { hapticLight(); setActiveTab('sites'); }}
                className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all flex-1 justify-center cursor-pointer ${
                  activeTab === 'sites'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="truncate">Sitios Web</span>
              </button>
            </div>
          </div>

          {/* Contenido según pestaña */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeTab === 'online' ? (
              /* PESTAÑA 1: BUSCADOR ONLINE GUTENDEX */
              <div className="space-y-4">
                {/* Formulario de búsqueda */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por título, autor o género (ej. Cervantes, Poe, Drácula)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-12 pl-11 pr-10 bg-slate-800/80 border border-white/10 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); loadPopular(); }}
                        className="w-9 h-9 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Selector de idioma */}
                    <div className="relative">
                      <select
                        value={language}
                        onChange={e => {
                          setLanguage(e.target.value);
                          if (searchQuery.trim()) {
                            searchOnlineBooks(searchQuery, { language: e.target.value })
                              .then(res => setOnlineBooks(res.results || []));
                          } else {
                            getPopularBooks(e.target.value)
                              .then(res => setOnlineBooks(res.results || []));
                          }
                        }}
                        className="h-12 px-3.5 bg-slate-800 border border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none focus:border-amber-500 appearance-none pr-8 cursor-pointer"
                      >
                        <option value="es">🇪🇸 Español</option>
                        <option value="all">🌍 Todos los idiomas</option>
                        <option value="en">🇬🇧 Inglés</option>
                        <option value="fr">🇫🇷 Francés</option>
                      </select>
                      <Languages className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                      type="submit"
                      disabled={loadingOnline}
                      className="h-12 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 flex-shrink-0"
                    >
                      {loadingOnline ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 stroke-[2.5]" />
                      )}
                      <span>Buscar</span>
                    </button>
                  </div>
                </form>

                {/* Banner de error */}
                {onlineError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{onlineError}</span>
                    </div>
                    <button onClick={loadPopular} className="text-amber-400 font-bold hover:underline flex items-center gap-1 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Recargar</span>
                    </button>
                  </div>
                )}

                {/* Estado de carga */}
                {loadingOnline ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <p className="text-sm font-semibold">Buscando libros en el catálogo libre...</p>
                    <p className="text-xs text-slate-500">Conectando con Project Gutenberg</p>
                  </div>
                ) : (
                  /* Grilla de resultados */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {onlineBooks.map(book => {
                      const isDownloading = downloadingId === book.id;
                      const isSuccess = downloadSuccessId === book.id;

                      return (
                        <div
                          key={book.id}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 hover:bg-white/10 transition-all flex gap-3.5 items-start group"
                        >
                          {/* Portada del libro */}
                          <div className="w-20 sm:w-24 aspect-[2.7/4] rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 relative shadow-md">
                            {book.cover ? (
                              <img
                                src={book.cover}
                                alt={book.title}
                                className="w-full h-full object-cover select-none"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full p-2 bg-gradient-to-br from-amber-950/70 to-slate-900 flex flex-col justify-between text-center">
                                <BookOpen className="w-6 h-6 text-amber-400/60 mx-auto my-auto" />
                                <span className="text-[9px] text-amber-300 line-clamp-2 uppercase font-serif">
                                  {book.title}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info del libro */}
                          <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  EPUB
                                </span>
                                {book.downloadCount > 0 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ⭐ {book.downloadCount.toLocaleString()} descargas
                                  </span>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                                {book.title}
                              </h4>
                              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                                {book.author}
                              </p>

                              {book.subjects && book.subjects.length > 0 && (
                                <p className="text-[11px] text-slate-400/80 line-clamp-1 mt-1">
                                  {book.subjects.join(' • ')}
                                </p>
                              )}
                            </div>

                            {/* Botón de descarga con 1 toque */}
                            <div className="mt-3">
                              <button
                                onClick={() => handleDownloadOnline(book)}
                                disabled={isDownloading || isSuccess || !book.epubUrl}
                                className={`w-full h-11 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                                  isSuccess
                                    ? 'bg-emerald-500 text-white'
                                    : !book.epubUrl
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold'
                                }`}
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Descargando...</span>
                                  </>
                                ) : isSuccess ? (
                                  <>
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    <span>¡Guardado en biblioteca!</span>
                                  </>
                                ) : !book.epubUrl ? (
                                  <span>No disponible en EPUB</span>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 stroke-[2.5]" />
                                    <span>Descargar y Guardar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'direct' ? (
              /* PESTAÑA 2: MUESTRAS LISTAS CON 1 CLIC */
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-300">
                  Agrega libros y cómics de demostración a tu biblioteca con un toque para comenzar a leer de inmediato:
                </p>

                {directBooks.map(item => {
                  const isLoading = loadingDirectId === item.id;
                  const isSuccess = directSuccessId === item.id;

                  return (
                    <div 
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {item.format}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-white">{item.title}</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">{item.author}</p>
                        <p className="text-xs text-slate-400/80 mt-1 line-clamp-2">{item.desc}</p>
                      </div>

                      <button
                        onClick={() => handleDownloadDirect(item)}
                        disabled={isLoading || isSuccess}
                        className={`w-full sm:w-auto h-12 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 ${
                          isSuccess
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        }`}
                      >
                        {isLoading ? (
                          <span>Añadiendo...</span>
                        ) : isSuccess ? (
                          <>
                            <Check className="w-5 h-5 stroke-[2.5]" />
                            <span>¡Añadido a tu biblioteca!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5 stroke-[2.5]" />
                            <span>Añadir a mi Lector</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* PESTAÑA 3: SITIOS WEB RECOMENDADOS */
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <span className="font-bold text-amber-400 block mb-1">¿Cómo descargar y leer aquí?</span>
                    1. Entra a cualquiera de estas páginas y descarga el libro en formato <b>.epub</b>, <b>.pdf</b> o <b>.cbz</b>.<br/>
                    2. Regresa a esta app y presiona el botón amarillo <b>"+" (Agregar Libro)</b>.<br/>
                    3. Selecciona el archivo descargado y quedará guardado <b>100% offline y privado</b> en tu celular.
                  </div>
                </div>

                {sites.map((site, idx) => (
                  <div 
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white">{site.name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {site.badge}
                        </span>
                        <span className="text-xs text-slate-400">{site.lang}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">{site.desc}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {site.formats.map(fmt => (
                          <span key={fmt} className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md font-medium">
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>

                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto h-12 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10 flex-shrink-0"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Visitar Página</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
