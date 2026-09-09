import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KindleWelcomeScreen from './components/KindleWelcomeScreen';
import KindleAuthScreen from './components/KindleAuthScreen';
import KindleLibraryScreen from './components/KindleLibraryScreen';
import KindleUploadScreen from './components/KindleUploadScreen';
import KindleOnlineSearchScreen from './components/KindleOnlineSearchScreen';
import KindleProfileScreen from './components/KindleProfileScreen';
import KindleBookDetailModal from './components/KindleBookDetailModal';
import KindleReaderScreen from './components/KindleReaderScreen';
import KindleBottomNav from './components/KindleBottomNav';
import UpdateModal from './components/UpdateModal';
import { getBooks, getBookFile, toggleFavorite, deleteBook } from './db/bookStorage';
import { checkForUpdates, getUpdateSettings } from './services/updateService';
import { subscribeAuth, logoutUser } from './services/firebase';
import { Loader2 } from 'lucide-react';
import KindleLogo from './components/KindleLogo';

export default function App() {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem('kindle_has_seen_welcome') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lector_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Pantallas: 'welcome' | 'auth' | 'main' | 'reader'
  const [currentScreen, setCurrentScreen] = useState(() => {
    const savedUser = localStorage.getItem('lector_current_user');
    const seenWelcome = localStorage.getItem('kindle_has_seen_welcome') === 'true';
    if (savedUser) return 'main';
    if (!seenWelcome) return 'welcome';
    return 'auth';
  });

  // Pestaña activa en la pantalla 'main': 'inicio' | 'biblioteca' | 'subir' | 'perfil'
  const [activeTab, setActiveTab] = useState('biblioteca');

  const [books, setBooks] = useState([]);
  const [selectedBookDetail, setSelectedBookDetail] = useState(null); // Screen 5: Detalle del libro
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
    });
    return () => unsubscribe && unsubscribe();
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

  // Cargar biblioteca desde IndexedDB
  const loadBooks = async () => {
    try {
      const stored = await getBooks();
      setBooks(stored || []);
    } catch (err) {
      console.error('Error al cargar libros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // Abrir lector desde el detalle o lista
  const handleLaunchReader = async (book) => {
    setSelectedBookDetail(null);
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

  // Volver desde el lector
  const handleBackToMain = async () => {
    setActiveBook(null);
    setActiveBookBuffer(null);
    setCurrentScreen('main');
    await loadBooks();
  };

  // Cambiar favorito
  const handleToggleFavorite = async (bookId) => {
    await toggleFavorite(bookId);
    await loadBooks();
    if (selectedBookDetail && selectedBookDetail.id === bookId) {
      setSelectedBookDetail(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  // Eliminar libro
  const handleDeleteBook = async (bookId) => {
    await deleteBook(bookId);
    await loadBooks();
  };

  // Cerrar sesión
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentScreen('welcome');
  };

  // Éxito en bienvenida
  const handleWelcomeStart = () => {
    localStorage.setItem('kindle_has_seen_welcome', 'true');
    setHasSeenWelcome(true);
    // Modo offline inmediato
    const guestUser = {
      uid: 'guest_local',
      email: 'Invitado (Modo Offline)',
      isAnonymous: true,
    };
    localStorage.setItem('lector_current_user', JSON.stringify(guestUser));
    setCurrentUser(guestUser);
    setCurrentScreen('main');
    setActiveTab('biblioteca');
  };

  const handleWelcomeLogin = () => {
    localStorage.setItem('kindle_has_seen_welcome', 'true');
    setHasSeenWelcome(true);
    setCurrentScreen('auth');
  };

  // Éxito en login
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentScreen('main');
    setActiveTab('biblioteca');
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#0b0f19] flex flex-col items-center justify-center text-white select-none">
        <KindleLogo size={80} className="mb-4" />
        <Loader2 className="w-8 h-8 text-[#007aff] animate-spin mb-2" />
        <p className="text-sm font-bold tracking-tight text-slate-300">Kindle Clone</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0f19] text-white">
      {/* 1. Overlay de Carga de Libro */}
      <AnimatePresence>
        {loadingBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white"
          >
            <Loader2 className="w-10 h-10 text-[#007aff] animate-spin mb-3" />
            <p className="text-sm font-bold tracking-wide">Abriendo lectura...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Pantalla de Bienvenida (Screen 1) */}
      {currentScreen === 'welcome' && (
        <KindleWelcomeScreen
          onStart={handleWelcomeStart}
          onLogin={handleWelcomeLogin}
        />
      )}

      {/* 3. Pantalla de Login / Registro (Screen 2) */}
      {currentScreen === 'auth' && (
        <KindleAuthScreen
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setCurrentScreen('welcome')}
        />
      )}

      {/* 4. Pantalla Principal con Barra de Navegación Inferior (Screens 3, 4, 8, 9) */}
      {currentScreen === 'main' && (
        <div className="h-full w-full flex flex-col overflow-hidden">
          <div className="flex-1 w-full overflow-y-auto overscroll-contain">
            {/* Tab Inicio: Buscar en línea dentro de la app (Screen 8) */}
            {activeTab === 'inicio' && (
              <KindleOnlineSearchScreen
                onBookDownloaded={async (bookData) => {
                  await loadBooks();
                  setSelectedBookDetail(bookData);
                }}
              />
            )}

            {/* Tab Biblioteca: Mi Biblioteca (Screen 3) */}
            {activeTab === 'biblioteca' && (
              <KindleLibraryScreen
                books={books}
                onSelectBook={(book) => setSelectedBookDetail(book)}
                onRefreshBooks={loadBooks}
                currentUser={currentUser}
                onGoToProfile={() => setActiveTab('perfil')}
                onGoToUpload={() => setActiveTab('subir')}
              />
            )}

            {/* Tab Subir: Subida de libros PDF / EPUB (Screen 4) */}
            {activeTab === 'subir' && (
              <KindleUploadScreen
                currentUser={currentUser}
                onBookUploaded={async () => {
                  await loadBooks();
                  setActiveTab('biblioteca');
                }}
              />
            )}

            {/* Tab Perfil: Mi Perfil y Configuración (Screen 9) */}
            {activeTab === 'perfil' && (
              <KindleProfileScreen
                currentUser={currentUser}
                booksCount={books.length}
                onLogout={handleLogout}
                onOpenSettings={() => setShowUpdateModal(true)}
                onOpenUpdates={() => setShowUpdateModal(true)}
                hasUpdate={!!updateAvailable}
                onGoToLibrary={() => setActiveTab('biblioteca')}
                onFilterFavorites={() => setActiveTab('biblioteca')}
              />
            )}
          </div>

          {/* Barra de Navegación Inferior */}
          <KindleBottomNav
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
          />
        </div>
      )}

      {/* 5. Modal de Detalle del Libro (Screen 5) */}
      {selectedBookDetail && (
        <KindleBookDetailModal
          book={selectedBookDetail}
          onClose={() => setSelectedBookDetail(null)}
          onRead={handleLaunchReader}
          onDelete={handleDeleteBook}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* 6. Pantalla de Lectura Completa (Screens 6, 7, 10: Tono Papel & Modo Oscuro + 3D) */}
      {currentScreen === 'reader' && activeBook && (
        <KindleReaderScreen
          book={activeBook}
          bookBuffer={activeBookBuffer}
          onBack={handleBackToMain}
          onOpenUpdates={() => setShowUpdateModal(true)}
        />
      )}

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
