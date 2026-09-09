/**
 * Servicio para búsqueda y descarga de libros en línea
 * Con catálogo curado local para respuesta instantánea (0ms)
 * y conexión a Project Gutenberg con mirrors directos y timeouts estrictos.
 */

const GUTENDEX_API_URL = 'https://gutendex.com/books';

// Catálogo curado verificado de dominio público listo para descarga directa inmediata
export const CURATED_BOOKS = [
  {
    id: 'gutenberg_2000',
    gutenbergId: 2000,
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes Saavedra',
    cover: 'https://www.gutenberg.org/cache/epub/2000/pg2000.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/2000/pg2000-images.epub',
    languages: ['es'],
    downloadCount: 15420,
    subjects: ['Novela', 'Aventuras', 'Clásicos Españoles'],
    genre: 'Aventuras',
  },
  {
    id: 'gutenberg_58221',
    gutenbergId: 58221,
    title: 'La Odisea',
    author: 'Homero',
    cover: 'https://www.gutenberg.org/cache/epub/58221/pg58221.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/58221/pg58221-images.epub',
    languages: ['es'],
    downloadCount: 9840,
    subjects: ['Poesía Épica', 'Mitología Griega', 'Aventuras'],
    genre: 'Épica',
  },
  {
    id: 'gutenberg_48320',
    gutenbergId: 48320,
    title: 'Las Aventuras de Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    cover: 'https://www.gutenberg.org/cache/epub/48320/pg48320.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/48320/pg48320-images.epub',
    languages: ['es'],
    downloadCount: 12500,
    subjects: ['Misterio', 'Detectives', 'Suspenso'],
    genre: 'Misterio',
  },
  {
    id: 'gutenberg_33527',
    gutenbergId: 33527,
    title: 'Cuentos de Amor de Locura y de Muerte',
    author: 'Horacio Quiroga',
    cover: 'https://www.gutenberg.org/cache/epub/33527/pg33527.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/33527/pg33527-images.epub',
    languages: ['es'],
    downloadCount: 8430,
    subjects: ['Cuentos', 'Misterio', 'Literatura Latinoamericana'],
    genre: 'Misterio',
  },
  {
    id: 'gutenberg_14765',
    gutenbergId: 14765,
    title: 'El Gaucho Martín Fierro',
    author: 'José Hernández',
    cover: 'https://www.gutenberg.org/cache/epub/14765/pg14765.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/14765/pg14765-images.epub',
    languages: ['es'],
    downloadCount: 7120,
    subjects: ['Poesía Gauchesca', 'Clásicos Latinoamericanos'],
    genre: 'Clásicos',
  },
  {
    id: 'gutenberg_15532',
    gutenbergId: 15532,
    title: 'Marianela',
    author: 'Benito Pérez Galdós',
    cover: 'https://www.gutenberg.org/cache/epub/15532/pg15532.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/15532/pg15532-images.epub',
    languages: ['es'],
    downloadCount: 6540,
    subjects: ['Novela', 'Realismo', 'Drama'],
    genre: 'Drama',
  },
  {
    id: 'gutenberg_49836',
    gutenbergId: 49836,
    title: 'Niebla (Nivola)',
    author: 'Miguel de Unamuno',
    cover: 'https://www.gutenberg.org/cache/epub/49836/pg49836.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/49836/pg49836-images.epub',
    languages: ['es'],
    downloadCount: 5930,
    subjects: ['Filosofía', 'Novela Existencial', 'Generación del 98'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_39758',
    gutenbergId: 39758,
    title: 'Rimas y Leyendas',
    author: 'Gustavo Adolfo Bécquer',
    cover: 'https://www.gutenberg.org/cache/epub/39758/pg39758.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/39758/pg39758-images.epub',
    languages: ['es'],
    downloadCount: 8190,
    subjects: ['Romanticismo', 'Poesía', 'Leyendas'],
    genre: 'Romance',
  },
  {
    id: 'gutenberg_15682',
    gutenbergId: 15682,
    title: 'La Vida es Sueño',
    author: 'Pedro Calderón de la Barca',
    cover: 'https://www.gutenberg.org/cache/epub/15682/pg15682.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/15682/pg15682-images.epub',
    languages: ['es'],
    downloadCount: 7800,
    subjects: ['Teatro', 'Siglo de Oro', 'Filosofía'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_37194',
    gutenbergId: 37194,
    title: 'Facundo: Civilización y Barbarie',
    author: 'Domingo Faustino Sarmiento',
    cover: 'https://www.gutenberg.org/cache/epub/37194/pg37194.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/37194/pg37194-images.epub',
    languages: ['es'],
    downloadCount: 4600,
    subjects: ['Historia', 'Ensayo', 'Argentina'],
    genre: 'Historia',
  },
  {
    id: 'gutenberg_84',
    gutenbergId: 84,
    title: 'Frankenstein o el Moderno Prometeo',
    author: 'Mary Wollstonecraft Shelley',
    cover: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/84/pg84-images.epub',
    languages: ['es', 'en'],
    downloadCount: 42000,
    subjects: ['Ciencia Ficción', 'Gótico', 'Terror'],
    genre: 'Terror',
  },
  {
    id: 'gutenberg_345',
    gutenbergId: 345,
    title: 'Drácula',
    author: 'Bram Stoker',
    cover: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/345/pg345-images.epub',
    languages: ['es', 'en'],
    downloadCount: 38000,
    subjects: ['Vampiros', 'Terror Gótico', 'Misterio'],
    genre: 'Terror',
  },
  {
    id: 'gutenberg_5200',
    gutenbergId: 5200,
    title: 'La Metamorfosis',
    author: 'Franz Kafka',
    cover: 'https://www.gutenberg.org/cache/epub/5200/pg5200.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/5200/pg5200-images.epub',
    languages: ['es', 'en'],
    downloadCount: 31000,
    subjects: ['Ficción Psicológica', 'Existencialismo'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_11',
    gutenbergId: 11,
    title: 'Alicia en el País de las Maravillas',
    author: 'Lewis Carroll',
    cover: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/11/pg11-images.epub',
    languages: ['es', 'en'],
    downloadCount: 29500,
    subjects: ['Fantasía', 'Aventuras', 'Clásicos Infantiles'],
    genre: 'Fantasía',
  },
  {
    id: 'gutenberg_1342',
    gutenbergId: 1342,
    title: 'Orgullo y Prejuicio',
    author: 'Jane Austen',
    cover: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342-images.epub',
    languages: ['es', 'en'],
    downloadCount: 52000,
    subjects: ['Romance Clásico', 'Costumbres', 'Drama'],
    genre: 'Romance',
  },
  {
    id: 'gutenberg_174',
    gutenbergId: 174,
    title: 'El Retrato de Dorian Gray',
    author: 'Oscar Wilde',
    cover: 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/174/pg174-images.epub',
    languages: ['es', 'en'],
    downloadCount: 26400,
    subjects: ['Ficción Filosófica', 'Esteticismo', 'Drama'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_1232',
    gutenbergId: 1232,
    title: 'El Príncipe',
    author: 'Nicolás Maquiavelo',
    cover: 'https://www.gutenberg.org/cache/epub/1232/pg1232.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/1232/pg1232-images.epub',
    languages: ['es', 'en'],
    downloadCount: 18900,
    subjects: ['Filosofía Política', 'Estrategia', 'Historia'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_132',
    gutenbergId: 132,
    title: 'El Arte de la Guerra',
    author: 'Sun Tzu',
    cover: 'https://www.gutenberg.org/cache/epub/132/pg132.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/132/pg132-images.epub',
    languages: ['es', 'en'],
    downloadCount: 23100,
    subjects: ['Estrategia Militar', 'Filosofía Antigua'],
    genre: 'Filosofía',
  },
  {
    id: 'gutenberg_35',
    gutenbergId: 35,
    title: 'La Máquina del Tiempo',
    author: 'H.G. Wells',
    cover: 'https://www.gutenberg.org/cache/epub/35/pg35.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/35/pg35-images.epub',
    languages: ['es', 'en'],
    downloadCount: 16800,
    subjects: ['Ciencia Ficción', 'Viajes en el tiempo', 'Aventuras'],
    genre: 'Ciencia Ficción',
  },
  {
    id: 'gutenberg_36',
    gutenbergId: 36,
    title: 'La Guerra de los Mundos',
    author: 'H.G. Wells',
    cover: 'https://www.gutenberg.org/cache/epub/36/pg36.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/36/pg36-images.epub',
    languages: ['es', 'en'],
    downloadCount: 19400,
    subjects: ['Invasión Alienígena', 'Ciencia Ficción'],
    genre: 'Ciencia Ficción',
  },
  {
    id: 'gutenberg_120',
    gutenbergId: 120,
    title: 'La Isla del Tesoro',
    author: 'Robert Louis Stevenson',
    cover: 'https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/120/pg120-images.epub',
    languages: ['es', 'en'],
    downloadCount: 22400,
    subjects: ['Piratas', 'Aventuras', 'Clásicos'],
    genre: 'Aventuras',
  },
  {
    id: 'gutenberg_64317',
    gutenbergId: 64317,
    title: 'The Great Gatsby (El Gran Gatsby)',
    author: 'F. Scott Fitzgerald',
    cover: 'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/64317/pg64317-images.epub',
    languages: ['en', 'es'],
    downloadCount: 45000,
    subjects: ['Siglo XX', 'Novela Americana', 'Drama'],
    genre: 'Clásicos',
  },
  {
    id: 'gutenberg_164',
    gutenbergId: 164,
    title: 'Veinte Mil Leguas de Viaje Submarino',
    author: 'Julio Verne',
    cover: 'https://www.gutenberg.org/cache/epub/164/pg164.cover.medium.jpg',
    epubUrl: 'https://www.gutenberg.org/cache/epub/164/pg164-images.epub',
    languages: ['es', 'en'],
    downloadCount: 21800,
    subjects: ['Submarinos', 'Aventuras', 'Ciencia Ficción'],
    genre: 'Aventuras',
  },
];

/**
 * Normaliza término de búsqueda
 */
function cleanText(txt) {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca libros en el catálogo curado local de forma instantánea
 */
export function searchCuratedBooks(query = '', language = 'all') {
  const cleanQ = cleanText(query);

  return CURATED_BOOKS.filter(book => {
    // Filtro por idioma
    if (language !== 'all') {
      if (!book.languages.includes(language)) return false;
    }

    // Filtro por texto
    if (!cleanQ) return true;

    const titleMatch = cleanText(book.title).includes(cleanQ);
    const authorMatch = cleanText(book.author).includes(cleanQ);
    const genreMatch = cleanText(book.genre).includes(cleanQ);
    const subjectsMatch = (book.subjects || []).some(s => cleanText(s).includes(cleanQ));

    return titleMatch || authorMatch || genreMatch || subjectsMatch;
  });
}

/**
 * Busca libros combinando el catálogo curado instantáneo con la API remota
 * Utiliza un timeout estricto de 4 segundos para evitar bucles infinitos
 */
export async function searchOnlineBooks(query = '', options = {}) {
  const { language = 'es', page = 1 } = options;

  // 1. Obtener resultados locales inmediatos
  const localMatches = searchCuratedBooks(query, language);

  // 2. Intentar consultar la API externa con timeout estricto de 4s
  try {
    const params = new URLSearchParams();
    if (query.trim()) params.append('search', query.trim());
    if (language && language !== 'all') params.append('languages', language);
    if (page > 1) params.append('page', page);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${GUTENDEX_API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      const remoteBooks = (data.results || []).map(normalizeGutendexBook);

      // Combinar evitando duplicados
      const ids = new Set(localMatches.map(b => b.gutenbergId));
      const combined = [...localMatches];
      for (const rb of remoteBooks) {
        if (!ids.has(rb.gutenbergId)) {
          combined.push(rb);
        }
      }

      return {
        count: combined.length,
        results: combined,
        source: 'hybrid',
      };
    }
  } catch (e) {
    // Si la API remota está caída, saturada o tarda más de 4s, devolver catálogo curado
    console.warn('Remote book catalog unavailable, using verified curated list:', e.message);
  }

  return {
    count: localMatches.length,
    results: localMatches,
    source: 'curated',
    notice: 'Mostrando catálogo curado verificado (servidor externo no disponible).',
  };
}

/**
 * Obtiene libros populares recomendados (arranque instantáneo)
 */
export async function getPopularBooks(language = 'es') {
  return searchOnlineBooks('', { language, page: 1 });
}

function normalizeGutendexBook(raw) {
  const formats = raw.formats || {};

  // Formato EPUB directo
  const epubUrl = 
    formats['application/epub+zip'] ||
    `https://www.gutenberg.org/cache/epub/${raw.id}/pg${raw.id}-images.epub` ||
    formats['application/x-mobipocket-ebook'] ||
    null;

  // Portada
  const coverUrl = 
    formats['image/jpeg'] ||
    formats['image/png'] ||
    `https://www.gutenberg.org/cache/epub/${raw.id}/pg${raw.id}.cover.medium.jpg` ||
    null;

  const authors = (raw.authors || [])
    .map(a => a.name ? a.name.split(',').reverse().join(' ').trim() : 'Autor desconocido')
    .join(', ');

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
    genre: subjects[0] || 'Clásico',
  };
}

/**
 * Descarga el archivo binario del libro (ArrayBuffer)
 * Intenta primero conexión directa (ideal para Capacitor Android), y luego proxy con timeout rápido
 */
export async function downloadBookBuffer(epubUrl) {
  if (!epubUrl) {
    throw new Error('Este libro no cuenta con un archivo EPUB directo para descarga.');
  }

  // Lista de intentos: 1° Directo (instantáneo), 2° Proxy corsproxy
  const candidateUrls = [
    epubUrl,
    `https://corsproxy.io/?${encodeURIComponent(epubUrl)}`,
  ];

  for (const targetUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/epub+zip, application/octet-stream, */*',
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 1000) {
          return buffer;
        }
      }
    } catch {
      // Continuar al siguiente intento
    }
  }

  throw new Error('El servidor de descarga de libros tardó en responder. Por favor reintenta en unos segundos.');
}
