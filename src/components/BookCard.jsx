import React from 'react';
import { BookOpen, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react';

export default function BookCard({ book, onOpen, onDelete }) {
  const [showMenu, setShowMenu] = React.useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const isCompleted = book.progress >= 99;

  return (
    <div 
      className="group relative flex flex-col bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
    >
      {/* Área de la Portada */}
      <div 
        onClick={() => onOpen(book)}
        className="relative aspect-[2/3] w-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {book.cover ? (
          <img 
            src={book.cover} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center h-full w-full bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border-b border-slate-800">
            <BookOpen className="w-10 h-10 text-amber-500/60 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-slate-200 line-clamp-3 leading-snug px-1">
              {book.title}
            </h4>
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">
              {book.author}
            </p>
          </div>
        )}

        {/* Badge de completado o progreso */}
        {isCompleted ? (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>Leído</span>
          </div>
        ) : book.progress > 0 ? (
          <div className="absolute top-2.5 left-2.5 bg-black/75 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs border border-amber-500/30">
            {book.progress}%
          </div>
        ) : null}

        {/* Botón de opciones */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(prev => !prev);
            }}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-slate-200 backdrop-blur-xs transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-8 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-20 animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(book.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-slate-700/80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar libro</span>
              </button>
            </div>
          )}
        </div>

        {/* Barra de progreso inferior en la portada */}
        {book.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Información del Libro */}
      <div 
        onClick={() => onOpen(book)}
        className="p-3.5 flex flex-col flex-1 justify-between cursor-pointer"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {book.author || 'Autor desconocido'}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
          <span className="truncate max-w-[120px]">
            {book.lastChapter || (book.progress ? `${book.progress}% leído` : 'Sin empezar')}
          </span>
          <span>{formatFileSize(book.fileSize)}</span>
        </div>
      </div>
    </div>
  );
}
