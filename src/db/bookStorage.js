import { get, set, del } from 'idb-keyval';

const METADATA_KEY = 'lector_books_metadata';
const SETTINGS_KEY = 'lector_user_settings';

export const DEFAULT_SETTINGS = {
  theme: 'dark', // 'light' | 'sepia' | 'dark' | 'amoled'
  fontSize: 18,  // px
  fontFamily: 'serif', // 'serif' | 'sans' | 'dyslexic' | 'monospace'
  lineHeight: 1.6,
  pageAnimation: true,
};

// --- GESTIÓN DE METADATOS DE LIBROS ---

export async function getBooks() {
  try {
    const books = await get(METADATA_KEY);
    return books || [];
  } catch (err) {
    console.error('Error al obtener libros:', err);
    return [];
  }
}

export async function saveBookMetadata(bookMeta) {
  const books = await getBooks();
  const index = books.findIndex(b => b.id === bookMeta.id);
  if (index >= 0) {
    books[index] = { ...books[index], ...bookMeta, updatedAt: Date.now() };
  } else {
    books.unshift({ ...bookMeta, createdAt: Date.now(), updatedAt: Date.now() });
  }
  await set(METADATA_KEY, books);
  return books;
}

export async function updateBookProgress(bookId, cfi, percentage, chapterTitle = '') {
  const books = await getBooks();
  const index = books.findIndex(b => b.id === bookId);
  if (index >= 0) {
    books[index].lastCfi = cfi;
    books[index].progress = Math.min(100, Math.max(0, Math.round(percentage)));
    if (chapterTitle) books[index].lastChapter = chapterTitle;
    books[index].lastReadAt = Date.now();
    await set(METADATA_KEY, books);
  }
}

export async function toggleFavorite(bookId) {
  const books = await getBooks();
  const index = books.findIndex(b => b.id === bookId);
  if (index >= 0) {
    books[index].isFavorite = !books[index].isFavorite;
    books[index].updatedAt = Date.now();
    await set(METADATA_KEY, books);
    return books;
  }
  return books;
}

// --- GESTIÓN DE ARCHIVOS BINARIOS DE LIBROS ---

export async function saveBookFile(bookId, arrayBuffer) {
  await set(`book_data_${bookId}`, arrayBuffer);
}

export async function getBookFile(bookId) {
  return await get(`book_data_${bookId}`);
}

export async function deleteBook(bookId) {
  const books = await getBooks();
  const updated = books.filter(b => b.id !== bookId);
  await set(METADATA_KEY, updated);
  await del(`book_data_${bookId}`);
  await del(`book_bookmarks_${bookId}`);
  return updated;
}

// --- CONFIGURACIÓN DEL LECTOR ---

export async function getSettings() {
  try {
    const settings = await get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings) {
  await set(SETTINGS_KEY, settings);
  return settings;
}

// --- MARCADORES (BOOKMARKS) ---

export async function getBookmarks(bookId) {
  try {
    const marks = await get(`book_bookmarks_${bookId}`);
    return marks || [];
  } catch {
    return [];
  }
}

export async function addBookmark(bookId, bookmark) {
  const marks = await getBookmarks(bookId);
  const newMark = {
    id: 'bm_' + Date.now(),
    createdAt: Date.now(),
    ...bookmark,
  };
  marks.unshift(newMark);
  await set(`book_bookmarks_${bookId}`, marks);
  return marks;
}

export async function removeBookmark(bookId, bookmarkId) {
  const marks = await getBookmarks(bookId);
  const updated = marks.filter(m => m.id !== bookmarkId);
  await set(`book_bookmarks_${bookId}`, updated);
  return updated;
}

// --- ANOTACIONES Y RESALTADOS (HIGHLIGHTS & NOTES) ---

export async function getAnnotations(bookId) {
  try {
    const list = await get(`book_annotations_${bookId}`);
    return list || [];
  } catch {
    return [];
  }
}

export async function saveAnnotation(bookId, annotation) {
  const list = await getAnnotations(bookId);
  const newAnnotation = {
    id: annotation.id || 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: Date.now(),
    color: annotation.color || 'yellow', // yellow | green | blue | pink
    note: annotation.note || '',
    text: annotation.text || '',
    cfiRange: annotation.cfiRange,
    chapterTitle: annotation.chapterTitle || '',
    percentage: annotation.percentage != null ? annotation.percentage : null,
    ...annotation,
  };

  // Si ya existía uno con el mismo ID, actualizarlo
  const existingIdx = list.findIndex(a => a.id === newAnnotation.id || (a.cfiRange && a.cfiRange === newAnnotation.cfiRange));
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newAnnotation };
  } else {
    list.unshift(newAnnotation);
  }

  await set(`book_annotations_${bookId}`, list);
  return list;
}

export async function deleteAnnotation(bookId, annotationId) {
  const list = await getAnnotations(bookId);
  const updated = list.filter(a => a.id !== annotationId && a.cfiRange !== annotationId);
  await set(`book_annotations_${bookId}`, updated);
  return updated;
}

export async function updateAnnotationNote(bookId, annotationId, noteText) {
  const list = await getAnnotations(bookId);
  const updated = list.map(a => {
    if (a.id === annotationId || a.cfiRange === annotationId) {
      return { ...a, note: noteText, updatedAt: Date.now() };
    }
    return a;
  });
  await set(`book_annotations_${bookId}`, updated);
  return updated;
}

