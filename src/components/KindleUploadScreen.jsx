import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileText, Book, ArrowLeft, 
  Loader2, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookMetadata, saveBookFile } from '../db/bookStorage';
import { uploadBookToCloud } from '../services/firebase';
import { hapticMedium, hapticSuccess } from '../services/haptics';

export default function KindleUploadScreen({
  onBookUploaded,
  currentUser,
  onBack,
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatusMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    setUploading(true);
    setStatusMessage(null);
    try {
      hapticMedium();
      const buffer = await selectedFile.arrayBuffer();
      const meta = await extractUniversalMetadata(buffer, selectedFile.name);

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await saveBookFile(bookId, buffer);

      const bookData = {
        id: bookId,
        title: meta.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
        name: meta.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
        author: meta.author || 'Autor desconocido',
        format: meta.format || 'epub',
        cover: meta.cover || null,
        totalPages: meta.totalPages || 0,
        progress: 0,
        lastRead: Date.now(),
      };

      await saveBookMetadata(bookData);
      hapticSuccess();

      // Sincronización con la nube si hay usuario activo
      if (currentUser && !currentUser.isAnonymous) {
        uploadBookToCloud(selectedFile, bookData, currentUser.uid).catch((err) => {
          console.warn('Subida en nube en segundo plano:', err);
        });
      }

      setStatusMessage({ type: 'success', text: `¡"${bookData.title}" añadido con éxito!` });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Notificar a la biblioteca
      if (onBookUploaded) {
        await onBookUploaded(bookData);
      }
    } catch (err) {
      console.error('Error al subir libro:', err);
      setStatusMessage({ type: 'error', text: err.message || 'No se pudo procesar el archivo.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col justify-between p-6 pb-24 select-none safe-top">
      {/* 1. Encabezado */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-base">Subir libro</span>
          </button>
        ) : (
          <h2 className="font-bold text-lg text-white">Subir libro</h2>
        )}
        <div className="w-8" />
      </div>

      {/* 2. Cuerpo Principal */}
      <div className="my-auto max-w-sm mx-auto w-full py-4 text-center">
        {/* Icono de Nube con Halo Azul Radiante */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#007aff]/20 rounded-full blur-lg animate-pulse" />
          <div className="w-18 h-18 rounded-full border border-[#007aff]/40 bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
            <UploadCloud className="w-9 h-9" />
          </div>
        </div>

        <h3 className="text-xl font-black text-white tracking-tight mb-2">
          Selecciona un archivo
        </h3>
        <p className="text-xs text-slate-400 font-medium mb-6">
          PDF o EPUB
        </p>

        {/* Zona de Arrastre / Selección con Borde Discontinuo */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-12 px-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer mb-6 ${
            selectedFile
              ? 'border-[#007aff] bg-[#007aff]/5'
              : 'border-slate-750 hover:border-slate-600 bg-[#121824]/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,.pdf,.cbz,application/epub+zip,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <FileText className={`w-10 h-10 mb-3 ${selectedFile ? 'text-[#007aff]' : 'text-slate-400'}`} />
          <span className="text-sm font-semibold text-slate-200">
            {selectedFile ? selectedFile.name : 'Toca para seleccionar un archivo'}
          </span>
          {selectedFile && (
            <span className="text-[11px] text-[#007aff] mt-1 font-bold">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Listo para procesar
            </span>
          )}
        </div>

        {/* Formatos Permitidos */}
        <div className="mb-6 text-left">
          <span className="block text-xs font-semibold text-slate-400 text-center mb-3">
            Formatos permitidos
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-bold text-slate-200">PDF</span>
            </div>
            <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-center gap-2">
              <Book className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">EPUB</span>
            </div>
          </div>
        </div>

        {/* Notificaciones de Estado */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-bold mb-4 flex items-center justify-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* 3. Botón Subir */}
      <div className="w-full max-w-sm mx-auto">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-4 px-6 rounded-2xl bg-[#007aff] hover:bg-[#0066d6] active:scale-[0.98] text-white font-extrabold text-base shadow-xl shadow-[#007aff]/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando libro...</span>
            </>
          ) : (
            <span>{selectedFile ? 'Subir' : 'Seleccionar archivo'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
