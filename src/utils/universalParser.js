import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configuración del worker de PDF.js para Vite
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Convierte un Blob o URL a DataURL base64
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extrae metadatos y portada de EPUB
 */
export async function extractEpubMetadata(fileOrBuffer, fileName = 'Libro') {
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
  } catch (e) {}

  try {
    book.destroy();
  } catch (e) {}

  return {
    format: 'epub',
    title: meta.title?.trim() || fileName.replace(/\.epub$/i, '') || 'Libro sin título',
    author: meta.creator?.trim() || 'Autor desconocido',
    description: meta.description || '',
    cover: coverBase64,
    arrayBuffer,
    fileSize: arrayBuffer.byteLength,
  };
}

/**
 * Extrae metadatos y renderiza la portada de la página 1 de un PDF
 */
export async function extractPdfMetadata(fileOrBuffer, fileName = 'Documento PDF') {
  const arrayBuffer = fileOrBuffer instanceof File 
    ? await fileOrBuffer.arrayBuffer() 
    : fileOrBuffer;

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let title = fileName.replace(/\.pdf$/i, '');
  let author = 'Autor de PDF';
  let coverBase64 = null;

  try {
    const metadata = await pdfDoc.getMetadata();
    if (metadata?.info?.Title) title = metadata.info.Title.trim();
    if (metadata?.info?.Author) author = metadata.info.Author.trim();
  } catch (e) {}

  // Renderizar la página 1 para generar la portada del libro
  try {
    const firstPage = await pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await firstPage.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    coverBase64 = canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('No se pudo generar portada del PDF:', err);
  }

  return {
    format: 'pdf',
    title,
    author,
    totalPages: pdfDoc.numPages,
    cover: coverBase64,
    arrayBuffer,
    fileSize: arrayBuffer.byteLength,
  };
}

/**
 * Extrae metadatos y portada de un archivo Cómic/Manga (.cbz o .zip)
 */
export async function extractCbzMetadata(fileOrBuffer, fileName = 'Manga') {
  const arrayBuffer = fileOrBuffer instanceof File 
    ? await fileOrBuffer.arrayBuffer() 
    : fileOrBuffer;

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(arrayBuffer);
  const imageFiles = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(zipEntry.name)) {
      imageFiles.push(zipEntry);
    }
  });

  // Orden numérico natural (ej: 1, 2, 10 en vez de 1, 10, 2)
  imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (imageFiles.length === 0) {
    throw new Error('El archivo CBZ/ZIP no contiene imágenes válidas.');
  }

  let coverBase64 = null;
  try {
    const coverBlob = await imageFiles[0].async('blob');
    coverBase64 = await blobToDataURL(coverBlob);
  } catch (e) {}

  return {
    format: 'cbz',
    title: fileName.replace(/\.(cbz|zip|cbr)$/i, ''),
    author: 'Manga / Cómic',
    totalPages: imageFiles.length,
    cover: coverBase64,
    arrayBuffer,
    fileSize: arrayBuffer.byteLength,
  };
}

/**
 * Parser Universal que detecta la extensión y extrae el formato correcto
 */
export async function extractUniversalMetadata(fileOrBuffer, fileName = 'Archivo') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return await extractPdfMetadata(fileOrBuffer, fileName);
  } else if (lower.endsWith('.cbz') || lower.endsWith('.zip')) {
    return await extractCbzMetadata(fileOrBuffer, fileName);
  } else if (lower.endsWith('.epub')) {
    return await extractEpubMetadata(fileOrBuffer, fileName);
  } else {
    // Si no tiene extensión conocida, intentar EPUB por defecto
    try {
      return await extractEpubMetadata(fileOrBuffer, fileName);
    } catch {
      throw new Error('Formato no soportado. Puedes subir archivos .epub, .pdf o .cbz / .zip.');
    }
  }
}
