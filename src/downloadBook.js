const { safeHttps } = require('./catalog');
async function downloadBook(item, { fs, parse, load, save, onProgress = () => {}, signal }) {
  const url = safeHttps(item.downloadUrl, ['www.gutenberg.org', 'gutenberg.org']);
  if (!url || !/^gutenberg_\d+$/.test(item.id)) throw new Error('Este título no tiene una descarga EPUB disponible.');
  const existing = (await load()).find(b => b.id === item.id);
  if (existing) return existing;
  const directory = fs.documentDirectory + 'books/';
  await fs.makeDirectoryAsync(directory, { intermediates: true });
  const prefix = directory + item.id + '_' + Date.now();
  const uri = prefix + '.epub';
  const contentUri = prefix + '.json';
  let reason = '';
  let saved = false;
  let timer;
  const check = () => { if (reason || signal?.aborted) throw new Error(reason || 'Descarga cancelada.'); };
  const task = fs.createDownloadResumable(url, uri, {}, progress => {
    if (progress.totalBytesWritten > 40 * 1024 * 1024 || progress.totalBytesExpectedToWrite > 40 * 1024 * 1024) { reason = 'Este EPUB supera el límite de 40 MB.'; task.pauseAsync().catch(() => {}); }
    onProgress(progress.totalBytesExpectedToWrite > 0 ? Math.min(100, Math.round(progress.totalBytesWritten / progress.totalBytesExpectedToWrite * 100)) : null);
  });
  const abort = () => { reason = 'Descarga cancelada.'; task.pauseAsync().catch(() => {}); };
  signal?.addEventListener('abort', abort);
  try {
    check();
    timer = setTimeout(() => { reason = 'La descarga tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.'; task.pauseAsync().catch(() => {}); }, 90000);
    const result = await task.downloadAsync();
    clearTimeout(timer);
    check();
    if (!result || result.status !== 200) throw new Error('No se pudo descargar el archivo. Inténtalo de nuevo.');
    const base64 = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 });
    check();
    const parsed = await parse(base64, item.name);
    check();
    if (!parsed.pages?.length) throw new Error('El EPUB descargado no contiene texto legible.');
    await fs.writeAsStringAsync(contentUri, JSON.stringify(parsed.pages));
    check();
    const current = await load();
    check();
    const duplicate = current.find(b => b.id === item.id);
    if (duplicate) return duplicate;
    const book = { id: item.id, name: parsed.title || item.name, author: parsed.author || item.author, cover: item.cover, type: 'epub', url: uri, contentUri, pageCount: parsed.pages.length, progress: 0, isFavorite: false, sourceUrl: item.sourceUrl, downloadedAt: new Date().toISOString() };
    await save([book, ...current]);
    saved = true;
    return book;
  } catch (error) { throw new Error(reason || error.message || 'No se pudo descargar el libro.'); }
  finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (!saved) await Promise.all([uri, contentUri].map(path => fs.deleteAsync(path, { idempotent: true }).catch(() => {})));
  }
}
module.exports = { downloadBook };
