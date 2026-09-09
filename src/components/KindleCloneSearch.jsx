// SearchScreen from kindle-clone/App.js (Google Books API)
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, BookOpen, Loader2 } from 'lucide-react';
import { hapticLight, hapticMedium } from '../services/haptics';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

export default function KindleCloneSearch({ navigation }) {
  const [q, setQ] = useState('Dune');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    if (e) e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    hapticMedium();
    try {
      const res = await fetch(`${GOOGLE_BOOKS_BASE}?q=${encodeURIComponent(q.trim())}&maxResults=20`);
      const json = await res.json();
      setResults(json.items || []);
    } catch (err) {
      console.error(err);
      alert('Error en búsqueda de libros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  const openOnline = (item) => {
    hapticLight();
    navigation.navigate('Reader', {
      book: {
        id: item.id,
        name: item.volumeInfo.title,
        title: item.volumeInfo.title,
        cover: item.volumeInfo.imageLinks?.thumbnail || null,
        type: 'online',
        format: 'online',
        url: item.volumeInfo.previewLink || item.volumeInfo.infoLink || null,
        pages: [
          `Título: ${item.volumeInfo.title}\nAutor(es): ${(item.volumeInfo.authors || []).join(', ')}\nEditorial: ${item.volumeInfo.publisher || 'Editorial'}\nPublicación: ${item.volumeInfo.publishedDate || 'N/A'}\n\nDescripción:\n${item.volumeInfo.description || 'Sin descripción disponible.'}`,
          `Vista previa disponible en Google Books.\n\nPuedes abrir la versión completa o descargar libros EPUB y PDF desde la pantalla "Subir" de tu biblioteca.`,
        ],
      },
    });
  };

  return (
    <div
      className="min-h-full w-full flex flex-col p-4 pb-20 select-none safe-top"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      {/* Top Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <button
          onClick={() => navigation.goBack()}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
          Buscar libros
        </h2>
      </div>

      {/* Input y botón de búsqueda */}
      <form onSubmit={search} className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar libros, autores..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full p-3 rounded-xl border text-sm outline-none transition-all"
            style={{
              backgroundColor: '#0b1620',
              color: COLORS.text,
              borderColor: '#0a1218',
            }}
          />
        </div>

        <button
          type="submit"
          className="py-3 px-5 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
          style={{ backgroundColor: COLORS.accent }}
        >
          Buscar
        </button>
      </form>

      {/* Loader */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: COLORS.accent }} />
          <span className="text-xs" style={{ color: COLORS.muted }}>Consultando Google Books...</span>
        </div>
      )}

      {/* Lista de Resultados */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {!loading && results.map((item) => (
          <div
            key={item.id}
            onClick={() => openOnline(item)}
            role="button"
            tabIndex={0}
            className="flex items-center p-3 rounded-xl transition-all cursor-pointer hover:bg-[#121824] border border-slate-850 select-none text-left"
            style={{ backgroundColor: '#08111a' }}
          >
            {item.volumeInfo.imageLinks?.thumbnail ? (
              <img
                src={item.volumeInfo.imageLinks.thumbnail}
                alt={item.volumeInfo.title}
                className="w-12 h-17 rounded-md object-cover mr-3 shrink-0"
              />
            ) : (
              <div className="w-12 h-17 rounded-md bg-[#16202c] flex items-center justify-center mr-3 shrink-0">
                <BookOpen className="w-5 h-5 text-slate-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate" style={{ color: COLORS.white }}>
                {item.volumeInfo.title}
              </h4>
              <p className="text-xs truncate mt-0.5" style={{ color: COLORS.muted }}>
                {(item.volumeInfo.authors || []).join(', ') || 'Autor desconocido'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
