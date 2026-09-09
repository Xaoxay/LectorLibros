// App.jsx - Kindle Clone (Arquitectura y diseño de kindle-clone/App.js)
import React, { useState, useEffect, useRef } from 'react';
import KindleCloneAuth, { COLORS } from './components/KindleCloneAuth';
import KindleCloneLibrary from './components/KindleCloneLibrary';
import KindleCloneUpload from './components/KindleCloneUpload';
import KindleCloneSearch from './components/KindleCloneSearch';
import KindleCloneReader from './components/KindleCloneReader';
import KindleCloneProfile from './components/KindleCloneProfile';
import UpdateModal from './components/UpdateModal';
import { getBooks, getBookFile, deleteBook } from './db/bookStorage';
import { checkForUpdates, getUpdateSettings } from './services/updateService';
import { subscribeAuth } from './services/firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lector_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Pantallas del Stack Navigator: 'Auth' | 'Library' | 'Upload' | 'Search' | 'Reader' | 'Profile'
  const [currentScreen, setCurrentScreen] = useState(() => {
    const saved = localStorage.getItem('lector_current_user');
    return saved ? 'Library' : 'Auth';
  });

  const [history, setHistory] = useState(['Library']);
  const [routeParams, setRouteParams] = useState({});

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);
  const [activeBookBuffer, setActiveBookBuffer] = useState(null);

  // Modal de actualizaciones
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);

  // Escuchar estado de autenticación en Firebase
  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Comprobación silenciosa de actualizaciones
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

  // Cargar libros de la biblioteca
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

  // Objeto de navegación compatible con React Navigation
  const navigation = {
    navigate: async (screenName, params = {}) => {
      if (screenName === 'Reader' && params.book) {
        setLoadingBook(true);
        try {
          const buffer = await getBookFile(params.book.id);
          setActiveBookBuffer(buffer || null);
        } catch (e) {
          console.warn('Could not read local book buffer:', e);
          setActiveBookBuffer(null);
        } finally {
          setLoadingBook(false);
        }
      }

      setRouteParams(params);
      setHistory((prev) => [...prev, screenName]);
      setCurrentScreen(screenName);
    },

    replace: (screenName, params = {}) => {
      if (params.user) {
        setCurrentUser(params.user);
      }
      setRouteParams(params);
      setHistory([screenName]);
      setCurrentScreen(screenName);
    },

    goBack: async () => {
      if (currentScreen === 'Reader') {
        await loadBooks();
      }
      setHistory((prev) => {
        if (prev.length > 1) {
          const newHist = prev.slice(0, -1);
          setCurrentScreen(newHist[newHist.length - 1]);
          return newHist;
        } else {
          setCurrentScreen('Library');
          return ['Library'];
        }
      });
    },
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm('¿Deseas eliminar este libro de tu biblioteca?')) {
      await deleteBook(bookId);
      await loadBooks();
    }
  };

  if (loading) {
    return (
      <div
        className="h-full w-full flex flex-col items-center justify-center select-none"
        style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
      >
        <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: COLORS.accent }} />
        <p className="text-xl font-bold" style={{ color: COLORS.accent }}>Kindle Clone</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      {/* Loading overlay */}
      {loadingBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: COLORS.accent }} />
          <p className="text-sm font-bold">Abriendo libro...</p>
        </div>
      )}

      {/* Stack Navigator Screen Rendering */}
      <div className="h-full w-full overflow-y-auto overscroll-contain">
        {currentScreen === 'Auth' && (
          <KindleCloneAuth navigation={navigation} />
        )}

        {currentScreen === 'Library' && (
          <KindleCloneLibrary
            books={books}
            loading={loading}
            navigation={navigation}
            onRefreshBooks={loadBooks}
            onDeleteBook={handleDeleteBook}
          />
        )}

        {currentScreen === 'Upload' && (
          <KindleCloneUpload
            navigation={navigation}
            currentUser={currentUser}
            onBookUploaded={loadBooks}
          />
        )}

        {currentScreen === 'Search' && (
          <KindleCloneSearch navigation={navigation} />
        )}

        {currentScreen === 'Reader' && routeParams.book && (
          <KindleCloneReader
            book={routeParams.book}
            bookBuffer={activeBookBuffer}
            navigation={navigation}
            onOpenUpdates={() => setShowUpdateModal(true)}
          />
        )}

        {currentScreen === 'Profile' && (
          <KindleCloneProfile
            navigation={navigation}
            currentUser={currentUser}
            onOpenUpdates={() => setShowUpdateModal(true)}
            hasUpdate={!!updateAvailable}
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
