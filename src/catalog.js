const GUTENDEX = 'https://gutendex.com/books/';
function safeHttps(url, hosts) {
  if (typeof url !== 'string') return null;
  const secure = url.replace(/^http:\/\//, 'https://');
  const match = secure.match(/^https:\/\/([^/:?#]+)(?:[/?#]|$)/i);
  return match && hosts.includes(match[1].toLowerCase()) ? secure : null;
}
function normalizeGutenberg(item) {
  const formats = item.formats || {};
  const url = item.copyright === false ? safeHttps(formats['application/epub+zip'], ['www.gutenberg.org','gutenberg.org']) : null;
  return { id: 'gutenberg_' + item.id, name: item.title || 'Sin título', author: (item.authors || []).map(a => a.name).join(', ') || 'Autor desconocido', cover: safeHttps(formats['image/jpeg'], ['www.gutenberg.org','gutenberg.org']), downloadUrl: url, sourceUrl: 'https://www.gutenberg.org/ebooks/' + item.id, languages: item.languages || [], type: 'epub' };
}
async function searchCatalog({ query = '', language = '', source = 'free', page = 1, signal }, fetcher = fetch) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 30000);
  try {
    const url = source === 'free'
      ? `${GUTENDEX}?search=${encodeURIComponent(query.trim())}&copyright=false&mime_type=application%2Fepub%2Bzip&page=${page}${language ? '&languages=' + encodeURIComponent(language) : ''}`
      : `https://openlibrary.org/search.json?q=${encodeURIComponent((query.trim() || 'literatura') + (language === 'es' ? ' language:spa' : ''))}&limit=20&page=${page}&fields=key,title,author_name,cover_i`;
    const response = await fetcher(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('El catálogo no respondió. Inténtalo nuevamente.');
    const data = await response.json();
    if (source === 'free') return { books: (data.results || []).map(normalizeGutenberg).filter(b => b.downloadUrl), more: !!data.next };
    return { books: (data.docs || []).map(info => {
      const key = String(info.key || '').replace(/^\/works\//, '');
      return { id: 'openlibrary_' + key, name: info.title || 'Sin título', author: (info.author_name || []).join(', ') || 'Autor desconocido', cover: Number.isInteger(info.cover_i) ? `https://covers.openlibrary.org/b/id/${info.cover_i}-M.jpg` : null, sourceUrl: `https://openlibrary.org/works/${encodeURIComponent(key)}`, downloadUrl: null };
    }), more: (page * 20) < Math.min(1000, data.numFound || data.num_found || 0) };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
module.exports = { searchCatalog, normalizeGutenberg, safeHttps };
