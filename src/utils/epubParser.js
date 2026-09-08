import ePub from 'epubjs';

/**
 * Convierte un Blob o URL a una cadena Base64 DataURL para guardarla en IndexedDB
 */
async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extrae metadatos y portada de un archivo EPUB (ArrayBuffer o File)
 */
export async function extractEpubMetadata(fileOrBuffer, fileName = 'Libro') {
  try {
    const arrayBuffer = fileOrBuffer instanceof File 
      ? await fileOrBuffer.arrayBuffer() 
      : fileOrBuffer;

    const book = ePub(arrayBuffer);
    await book.ready;

    const meta = await book.loaded.metadata;
    let coverBase64 = null;

    try {
      const coverUrl = await book.coverUrl();
      if (coverUrl) {
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        coverBase64 = await blobToDataURL(blob);
      }
    } catch (coverErr) {
      console.warn('No se pudo extraer portada:', coverErr);
    }

    // Limpieza de memoria del libro temporal
    try {
      book.destroy();
    } catch (e) {
      // ignorar si no soporta destroy en este contexto
    }

    const title = meta.title?.trim() || fileName.replace(/\.epub$/i, '') || 'Libro sin título';
    const author = meta.creator?.trim() || 'Autor desconocido';

    return {
      title,
      author,
      description: meta.description || '',
      publisher: meta.publisher || '',
      language: meta.language || 'es',
      cover: coverBase64,
      arrayBuffer,
      fileSize: arrayBuffer.byteLength,
    };
  } catch (error) {
    console.error('Error al procesar archivo EPUB:', error);
    throw new Error('El archivo seleccionado no es un archivo EPUB válido o está dañado.');
  }
}
