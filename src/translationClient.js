const LANGUAGES = [{ code: 'auto', label: 'Automático' }, { code: 'zh', label: 'Chino' }, { code: 'ja', label: 'Japonés' }, { code: 'ko', label: 'Coreano' }, { code: 'en', label: 'Inglés' }];
function serviceUrl(value) {
  const url = String(value || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[^/?#:@\s]+(?::\d+)?(?:\/[^?#\s]*)?$/.test(url) && !/^http:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?$/.test(url)) throw new Error('Ingresá una URL HTTPS válida para el servicio de traducción.');
  return url;
}
function createTranslationClient(config, { fetcher = fetch, fs } = {}) {
  const base = serviceUrl(config.url);
  if (!config.token?.trim()) throw new Error('Falta la clave de acceso al servicio de traducción.');
  const headers = { Authorization: 'Bearer ' + config.token.trim(), Accept: 'application/json' };
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetcher(base + path, { ...options, headers: { ...headers, ...options.headers }, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'El servicio de traducción no respondió.');
      return data;
    } catch (error) {
      throw new Error(error.name === 'AbortError' ? 'La conexión tardó demasiado. Podés reintentar sin perder el progreso.' : error.message || 'No se pudo conectar.');
    } finally { clearTimeout(timer); }
  }
  return {
    health: () => request('/v1/health'),
    status: id => request('/v1/jobs/' + encodeURIComponent(id)),
    result: id => request('/v1/jobs/' + encodeURIComponent(id) + '/result'),
    control: (id, action) => request('/v1/jobs/' + encodeURIComponent(id) + '/' + action, { method: 'POST' }),
    async start(book, sourceLanguage, requestId) {
      if (!LANGUAGES.some(item => item.code === sourceLanguage)) throw new Error('Idioma no compatible.');
      const metadata = { title: book.name, author: book.author || '', clientBookId: book.id, sourceLanguage, requestId };
      if (book.type === 'pdf') {
        const info = await fs.getInfoAsync(book.url, { size: true });
        if (!info.exists || info.size > 40 * 1024 * 1024) throw new Error('Para traducir un PDF, el archivo debe tener hasta 40 MB.');
        const query = Object.entries(metadata).map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
        const response = await fs.uploadAsync(base + '/v1/jobs/pdf?' + query, book.url, { httpMethod: 'POST', uploadType: fs.FileSystemUploadType.BINARY_CONTENT, headers: { ...headers, 'Content-Type': 'application/pdf' } });
        const data = JSON.parse(response.body);
        if (response.status < 200 || response.status >= 300) throw new Error(data.error || 'No se pudo enviar el PDF.');
        return data;
      }
      const pages = book.contentUri ? JSON.parse(await fs.readAsStringAsync(book.contentUri)) : book.pages;
      if (!Array.isArray(pages) || !pages.length || pages.some(page => typeof page !== 'string')) throw new Error('No se pudo recuperar el texto del libro.');
      return request('/v1/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...metadata, pages }) });
    },
  };
}
async function saveTranslatedBook(original, result, { fs, mutate }) {
  if (!/^[a-z0-9-]{10,80}$/i.test(result.id) || !Array.isArray(result.pages) || !result.pages.length || result.pages.length > 20000 || result.pages.some(page => typeof page !== 'string' || !page.trim() || page.length > 10000)) throw new Error('La traducción recibida no es válida.');
  const id = 'translated_' + result.id;
  const directory = fs.documentDirectory + 'books/';
  const contentUri = directory + id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.json';
  let committed = false;
  try {
    await fs.makeDirectoryAsync(directory, { intermediates: true });
    await fs.writeAsStringAsync(contentUri, JSON.stringify(result.pages));
    const translated = { id, name: original.name + ' · Español latino', author: original.author, cover: null, type: 'epub', contentUri, pageCount: result.pages.length, progress: 0, isFavorite: false, translation: { sourceBookId: original.id, sourceLanguage: result.sourceLanguage, targetLanguage: 'es-419', jobId: result.id, completedAt: result.completedAt, model: result.model } };
    let selected;
    await mutate(books => {
      selected = books.find(book => book.id === id);
      if (selected) return books;
      selected = translated;
      return [translated, ...books];
    });
    committed = selected === translated;
    return selected;
  } finally { if (!committed) await fs.deleteAsync(contentUri, { idempotent: true }).catch(() => {}); }
}
module.exports = { LANGUAGES, serviceUrl, createTranslationClient, saveTranslatedBook };
