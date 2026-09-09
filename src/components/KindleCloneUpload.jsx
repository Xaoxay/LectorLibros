// UploadScreen from kindle-clone/App.js
import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2, UploadCloud, FileText } from 'lucide-react';
import { extractUniversalMetadata } from '../utils/universalParser';
import { saveBookFile, saveBookMetadata } from '../db/bookStorage';
import { uploadBookToCloud } from '../services/firebase';
import { hapticMedium, hapticSuccess } from '../services/haptics';

export const COLORS = {
  bg: '#0f1724',
  card: '#0e1520',
  paper: '#f5f1e8',
  accent: '#4A6FFF',
  text: '#E6EEF8',
  muted: '#98A0B3',
  white: '#ffffff',
};

export default function KindleCloneUpload({ navigation, currentUser, onBookUploaded }) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      hapticMedium();

      const buffer = await file.arrayBuffer();
      const meta = await extractUniversalMetadata(buffer, file.name);

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await saveBookFile(bookId, buffer);

      const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub';

      const bookData = {
        id: bookId,
        name: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        author: meta.author || 'Autor desconocido',
        type,
        format: type,
        cover: meta.cover || null,
        pages: [],
        createdAt: Date.now(),
        progress: 0,
        userId: currentUser?.uid || 'guest',
      };

      await saveBookMetadata(bookData);

      // Si hay sesión activa en Firebase, sincronizar en la nube
      if (currentUser && !currentUser.isAnonymous) {
        uploadBookToCloud(file, bookData, currentUser.uid).catch((err) => {
          console.warn('Subida a nube (background):', err);
        });
      }

      hapticSuccess();
      if (onBookUploaded) {
        await onBookUploaded();
      }
      alert('Libro subido correctamente');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al subir libro');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="min-h-full w-full flex flex-col justify-between p-6 select-none safe-top safe-bottom"
      style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <button
          onClick={() => navigation.goBack()}
          className="flex items-center gap-2 font-bold text-sm cursor-pointer transition-colors hover:text-white"
          style={{ color: COLORS.muted }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
      </div>

      {/* Centro */}
      <div className="my-auto max-w-sm mx-auto w-full text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#12202b] border border-slate-750 flex items-center justify-center">
          <UploadCloud className="w-8 h-8" style={{ color: COLORS.accent }} />
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
          Subir libro
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
          PDF o EPUB. Se guardará en tu cuenta.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={handleFilePicked}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full py-4 px-6 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: COLORS.accent }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Subiendo libro...</span>
            </>
          ) : (
            <span>Elegir archivo</span>
          )}
        </button>
      </div>

      <div />
    </div>
  );
}
