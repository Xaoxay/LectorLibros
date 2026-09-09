import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KindleAuthScreen from './components/KindleAuthScreen';
import KindleLibraryScreen from './components/KindleLibraryScreen';
import KindleReaderScreen from './components/KindleReaderScreen';
import UpdateModal from './components/UpdateModal';
import { getBooks, getBookFile } from './db/bookStorage';
import { checkForUpdates, getUpdateSettings } from './services/updateService';
import { subscribeAuth, logoutUser } from './services/firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(() => {
    const savedUser = localStorage.getItem('lector_current_user');
    return savedUser ? 'library' : 'auth';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('lector_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [activeBookBuffer, setActiveBookBuffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);

  // Estado de Actualizaciones
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);

  // Suscripción a Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
      if (user && currentScreen === 'auth') {
        setCurrentScreen('library');
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [currentScreen]);

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

  // Abrir libro desde la biblioteca
  const handleOpenBook = async (book) => {
    setLoadingBook(true);
    try {
      const buffer = await getBookFile(book.id);
      setActiveBook(book);
      setActiveBookBuffer(buffer || null);
      setCurrentScreen('reader');
    } catch (err) {
      console.error('Error al abrir el libro:', err);
      alert('Ocurrió un error al cargar el libro.');
    } finally {
      setLoadingBook(false);
    }
  };

  // Volver a la biblioteca
  const handleBackToLibrary = async () => {
    setActiveBook(null);
    setActiveBookBuffer(null);
    setCurrentScreen('library');
    await loadBooks();
  };

  // Cerrar sesión
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentScreen('auth');
  };

  // Login completado
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentScreen('library');
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#f8f9fa] flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-10 h-10 text-[#4a6fff] animate-spin mb-3" />
        <p className="text-sm font-bold tracking-tight">📚 Kindle Clone</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f8f9fa]">
      {/* Overlay de Carga de Libro */}
      <AnimatePresence>
        {loadingBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
            <p className="text-sm font-bold">Abriendo libro...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navegación por Pantallas (Stack Navigator: Auth -> Library -> Reader) */}
      <div className="h-full w-full overflow-y-auto overscroll-contain">
        {currentScreen === 'auth' && (
          <KindleAuthScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {currentScreen === 'library' && (
          <KindleLibraryScreen
            books={books}
            onOpenBook={handleOpenBook}
            onRefreshBooks={loadBooks}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenUpdates={() => setShowUpdateModal(true)}
            hasUpdate={!!updateAvailable}
          />
        )}

        {currentScreen === 'reader' && activeBook && (
          <KindleReaderScreen
            book={activeBook}
            bookBuffer={activeBookBuffer}
            onBack={handleBackToLibrary}
            onOpenUpdates={() => setShowUpdateModal(true)}
          />
        )}
      </div>

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
