const MAX_EPUB_BYTES = 40 * 1024 * 1024;
const MAX_PDF_BYTES = 200 * 1024 * 1024;
let counter = 0;
async function importBook(document, { fs, parse, mutate, onStatus = () => {} }) {
  const { name, uri } = document;
  if (!uri || !/\.(pdf|epub)$/i.test(name || '')) throw new Error('Selecciona un archivo PDF o EPUB.');
  const pdf = /\.pdf$/i.test(name);
  const info = await fs.getInfoAsync(uri, { size: true });
  if (!info.exists || !Number.isFinite(info.size)) throw new Error('No se pudo comprobar el tamaño del archivo.');
  if (info.size > (pdf ? MAX_PDF_BYTES : MAX_EPUB_BYTES)) throw new Error(`El archivo supera el límite de ${pdf ? 200 : 40} MB.`);
  const id = 'book_' + Date.now() + '_' + (++counter);
  const directory = fs.documentDirectory + 'books/';
  const created = [];
  let committed = false;
  try {
    await fs.makeDirectoryAsync(directory, { intermediates: true });
    const url = directory + id + (pdf ? '.pdf' : '.epub');
    created.push(url);
    onStatus('Guardando archivo en el dispositivo...');
    await fs.copyAsync({ from: uri, to: url });
    let title = name.replace(/\.(pdf|epub)$/i, '').replace(/[_-]/g, ' ').trim();
    let parsed = {};
    let contentUri = null;
    let cover = null;
    if (!pdf) {
      onStatus('Extrayendo capítulos y páginas del EPUB...');
      parsed = await parse(await fs.readAsStringAsync(url, { encoding: fs.EncodingType.Base64 }), title);
      if (!parsed.pages?.length) throw new Error('El EPUB no contiene texto legible.');
      contentUri = directory + id + '.json';
      created.push(contentUri);
      await fs.writeAsStringAsync(contentUri, JSON.stringify(parsed.pages));
      if (parsed.cover?.startsWith('data:')) {
        const extension = parsed.cover.startsWith('data:image/png') ? '.png' : parsed.cover.startsWith('data:image/webp') ? '.webp' : '.jpg';
        cover = directory + id + '.cover' + extension;
        created.push(cover);
        await fs.writeAsStringAsync(cover, parsed.cover.split(',')[1], { encoding: fs.EncodingType.Base64 });
      }
    }
    const book = { id, name: parsed.title || title, author: parsed.author || 'Archivo local', url, type: pdf ? 'pdf' : 'epub', cover, contentUri, pageCount: parsed.pages?.length || 0, progress: 0, isFavorite: false };
    await mutate(books => [book, ...books]);
    committed = true;
    return book;
  } finally {
    if (!committed) await Promise.all(created.map(path => fs.deleteAsync(path, { idempotent: true }).catch(() => {})));
  }
}
module.exports = { importBook, MAX_EPUB_BYTES };
