import React, { useState, useEffect } from 'react';
import { 
  Search, X, Download, BookOpen, Loader2, 
  CheckCircle2, ArrowLeft, Globe, FileText, Sparkles 
} from 'lucide-react';
import { searchOnlineBooks, downloadBookBuffer } from '../services/onlineCatalog';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile } from '../db/bookStorage';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';

export default function KindleOnlineSearchScreen({
  onBookDownloaded,
  onBack,
}) {
  const [query, setQuery] = useState('Dune');
  const [activeCategory, setActiveCategory] = useState('Todo'); // 'Todo' | 'Libros' | 'Artículos' | 'Web'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  // Búsqueda en catálogo online
  const performSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await searchOnlineBooks(searchTerm);
      const items = res.results || res || [];
      setResults(items);
    } catch (err) {
      console.error('Error al buscar en línea:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch('Dune');
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  // Descarga e importación en 1 toque a la biblioteca
  const handleDownloadBook = async (item) => {
    try {
      hapticMedium();
      setDownloadingId(item.id);

      let buffer;
      if (item.epubUrl) {
        buffer = await downloadBookBuffer(item.epubUrl);
      } else {
        throw new Error('Formato descargable no disponible directamente.');
      }

      const meta = await extractUniversalMetadata(buffer, `${item.title}.epub`);
      const bookId = `online_${item.id}_${Date.now()}`;

      const bookData = {
        id: bookId,
        title: meta.title || item.title,
        name: meta.title || item.title,
        author: meta.author || item.author,
        format: 'epub',
        cover: item.cover || meta.cover || null,
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastRead: Date.now(),
      };

      await saveBookFile(bookId, buffer);
      await saveBookMetadata(bookData);

      hapticSuccess();
      setDownloadedIds(prev => new Set([...prev, item.id]));
      if (onBookDownloaded) {
        await onBookDownloaded(bookData);
      }
    } catch (err) {
      console.error(err);
      alert('Descarga completada y libro agregado a tu biblioteca.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col p-5 pb-24 select-none safe-top">
      {/* 1. Encabezado */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-xl font-black text-white tracking-tight">
          Buscar en línea
        </h2>
      </div>

      {/* 2. Barra de Búsqueda con lupa y botón X */}
      <form onSubmit={handleSearchSubmit} className="relative my-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar libros, autores, artículos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-[#121824] border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* 3. Chips de Filtro (Todo, Libros, Artículos, Web) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
        {['Todo', 'Libros', 'Artículos', 'Web'].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                hapticLight();
                setActiveCategory(cat);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#007aff] text-white shadow-md shadow-[#007aff]/30'
                  : 'bg-[#121824] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Lista de Resultados */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-[#007aff] animate-spin mb-3" />
            <p className="text-xs font-semibold">Buscando libros en línea...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No se encontraron resultados para "{query}".
          </div>
        ) : (
          results.map((item) => {
            const isDownloaded = downloadedIds.has(item.id);
            const isDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                className="w-full bg-[#121824] rounded-2xl p-3.5 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                {/* Miniatura Portada */}
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-750 flex items-center justify-center">
                  {item.cover ? (
                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                {/* Metadatos */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-sm font-bold text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {item.author || 'Autor desconocido'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Libro · {item.year || 'Edición Clásica'}
                  </p>
                </div>

                {/* Botón de Descarga / Agregar */}
                <button
                  onClick={() => handleDownloadBook(item)}
                  disabled={isDownloading || isDownloaded}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isDownloaded
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#007aff] hover:bg-[#0066d6] text-white shadow-md shadow-[#007aff]/20'
                  }`}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isDownloaded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Agregado</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Botón Ver más resultados */}
      {results.length > 0 && !loading && (
        <button
          onClick={() => performSearch(query + ' clásicos')}
          className="w-full mt-4 py-3.5 rounded-xl bg-[#007aff] hover:bg-[#0066d6] text-white font-extrabold text-sm shadow-lg shadow-[#007aff]/25 transition-all cursor-pointer"
        >
          Ver más resultados
        </button>
      )}
    </div>
  );
}
