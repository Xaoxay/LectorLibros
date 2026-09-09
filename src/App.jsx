import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import PdfReaderView from './components/PdfReaderView';
import MangaReaderView from './components/MangaReaderView';
import UpdateModal from './components/UpdateModal';
import { getBooks, getBookFile } from './db/bookStorage';
import { checkForUpdates, getUpdateSettings } from './services/updateService';
import { Loader2, Sparkles, ArrowUpCircle } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [activeBookBuffer, setActiveBookBuffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Estado de Actualizaciones
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);

  // Capturar evento de instalación PWA nativa en Android/PC
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Comprobar actualizaciones automáticamente al inicio
  useEffect(() => {
    async function checkAppUpdates() {
      try {
        const settings = await getUpdateSettings();
        if (settings.autoCheck) {
          const result = await checkForUpdates();
          if (result && result.hasUpdate) {
            setUpdateAvailable(result);
          }
        }
      } catch (err) {
        console.warn('Silent update check:', err);
      }
    }
    checkAppUpdates();
  }, []);

  // Cargar biblioteca
  const loadBooks = async () => {
    try {
      const stored = await getBooks();
      setBooks(stored);
    } catch (err) {
      console.error('Error al cargar libros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // Abrir libro según formato (EPUB, PDF, MANGA)
  const handleOpenBook = async (book) => {
    setLoadingBook(true);
    try {
      const buffer = await getBookFile(book.id);
      if (!buffer) {
        alert('No se pudo encontrar el archivo del libro en memoria.');
        return;
      }
      setActiveBook(book);
      setActiveBookBuffer(buffer);
    } catch (err) {
      console.error('Error al abrir el libro:', err);
      alert('Ocurrió un error al cargar el libro.');
    } finally {
      setLoadingBook(false);
    }
  };

  const handleBackToLibrary = async () => {
    setActiveBook(null);
    setActiveBookBuffer(null);
    await loadBooks();
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="relative mb-3">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
        </div>
        <p className="text-sm font-medium tracking-wide">Iniciando Lector Digital...</p>
      </div>
    );
  }

  // Renderizar el visor adecuado según el formato
  const renderReader = () => {
    if (!activeBook || !activeBookBuffer) return null;

    const format = activeBook.format || 'epub';
    if (format === 'pdf') {
      return (
        <PdfReaderView
          bookMeta={activeBook}
          bookBuffer={activeBookBuffer}
          onBack={handleBackToLibrary}
        />
      );
    } else if (format === 'cbz') {
      return (
        <MangaReaderView
          bookMeta={activeBook}
          bookBuffer={activeBookBuffer}
          onBack={handleBackToLibrary}
        />
      );
    } else {
      return (
        <ReaderView
          bookMeta={activeBook}
          bookBuffer={activeBookBuffer}
          onBack={handleBackToLibrary}
          onOpenUpdates={() => setShowUpdateModal(true)}
        />
      );
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">

      <AnimatePresence mode="wait">
        {loadingBook && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-slate-100"
          >
            <div className="relative mb-3">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
            </div>
            <p className="text-sm font-semibold tracking-wide">Cargando libro...</p>
          </motion.div>
        )}

        {activeBook && activeBookBuffer ? (
          <motion.div
            key="reader-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full"
          >
            {renderReader()}
          </motion.div>
        ) : (
          <motion.div
            key="library-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full overflow-y-auto overscroll-contain"
          >
            <LibraryView
              books={books}
              onOpenBook={handleOpenBook}
              onRefreshBooks={loadBooks}
              installPrompt={installPrompt}
              hasUpdate={!!updateAvailable}
              onOpenUpdates={() => setShowUpdateModal(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Actualizaciones */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onUpdateAvailableChange={(has) => {
          if (!has) setUpdateAvailable(null);
        }}
      />
    </div>
  );
}
