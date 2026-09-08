/**
 * Servicio para búsqueda y descarga de libros en línea
 * Utiliza la API de Gutendex (Project Gutenberg, +70.000 libros libres)
 */

const GUTENDEX_API_URL = 'https://gutendex.com/books';

// Proxies públicos confiables para evitar problemas de CORS al descargar EPUBs en navegadores web
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => url, // Fallback directo (para entornos nativos como Capacitor Android donde no aplica CORS)
];

/**
 * Busca libros en línea según término y filtros
 * @param {string} query Término de búsqueda (título, autor o tema)
 * @param {Object} options Opciones de búsqueda
 * @returns {Promise<{ count: number, next: string|null, results: Array }>}
 */
export async function searchOnlineBooks(query = '', options = {}) {
  const { language = 'es', page = 1 } = options;
  const params = new URLSearchParams();

  if (query.trim()) {
    params.append('search', query.trim());
  }

  if (language && language !== 'all') {
    params.append('languages', language);
  }

  if (page > 1) {
    params.append('page', page);
  }

  const url = `${GUTENDEX_API_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error en el servidor de libros (${response.status})`);
  }

  const data = await response.json();
  const normalizedBooks = (data.results || []).map(normalizeGutendexBook);

  return {
    count: data.count || 0,
    next: data.next || null,
    previous: data.previous || null,
    results: normalizedBooks,
  };
}

/**
 * Obtiene libros populares recomendados
 * @param {string} language 'es' por defecto
 * @returns {Promise<Array>}
 */
export async function getPopularBooks(language = 'es') {
  return searchOnlineBooks('', { language, page: 1 });
}

/**
 * Normaliza el formato de un libro devuelto por Gutendex
 */
function normalizeGutendexBook(raw) {
  const formats = raw.formats || {};

  // Buscar el enlace al formato EPUB disponible (preferir epub con imágenes o estándar)
  const epubUrl = 
    formats['application/epub+zip'] ||
    formats['application/x-mobipocket-ebook'] ||
    null;

  // Portada disponible
  const coverUrl = 
    formats['image/jpeg'] ||
    formats['image/png'] ||
    null;

  // Autores formateados
  const authors = (raw.authors || [])
    .map(a => a.name ? a.name.split(',').reverse().join(' ').trim() : 'Autor desconocido')
    .join(', ');

  // Materias o temas principales
  const subjects = (raw.subjects || []).slice(0, 3).map(s => {
    const parts = s.split('--');
    return parts[parts.length - 1].trim();
  });

  return {
    id: `gutenberg_${raw.id}`,
    gutenbergId: raw.id,
    title: raw.title || 'Sin título',
    author: authors || 'Autor desconocido',
    cover: coverUrl,
    epubUrl,
    languages: raw.languages || [],
    downloadCount: raw.download_count || 0,
    subjects,
    copyright: raw.copyright || false,
  };
}

/**
 * Descarga el archivo binario del libro (ArrayBuffer) con reintentos y proxies CORS
 * @param {string} epubUrl URL original del EPUB
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadBookBuffer(epubUrl) {
  if (!epubUrl) {
    throw new Error('Este libro no cuenta con formato EPUB descargable directo.');
  }

  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const targetUrl = getProxyUrl(epubUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/epub+zip, application/octet-stream, */*',
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 1000) {
          return buffer;
        }
      }
    } catch {
      // Intentar con el siguiente proxy
    }
  }

  throw new Error('No se pudo descargar el archivo del libro. Comprueba tu conexión a Internet.');
}
