// One queue for every library mutation, including its read and write.
function createLibraryStore(storage, initialBooks, key = '@lector_libros_store_v2') {
  let queue = Promise.resolve();
  const enqueue = action => {
    const result = queue.catch(() => {}).then(action);
    queue = result;
    return result;
  };
  async function read() {
    const raw = await storage.getItem(key);
    if (raw === null) return initialBooks.map(book => ({ ...book }));
    const books = JSON.parse(raw);
    if (!Array.isArray(books) || books.some(book => !book || typeof book.id !== 'string')) {
      throw new Error('La biblioteca guardada no es válida. Los datos se conservaron.');
    }
    return books.map(book => {
      const sample = initialBooks.find(item => item.id === book.id);
      if (!sample) return book;
      return { ...book, name: sample.name, ...(!book.pages || book.pages.length < sample.pages.length ? { pages: sample.pages, type: sample.type } : {}) };
    });
  }
  const mutate = transform => enqueue(async () => {
    const books = await read();
    const next = transform(books);
    if (!Array.isArray(next)) throw new Error('Actualización de biblioteca inválida.');
    if (next === books) return books;
    await storage.setItem(key, JSON.stringify(next));
    return next;
  });
  const load = () => enqueue(async () => {
    const books = await read();
    if (!books.length) return books;
    // Reading progress is optional; it must never replace the library.
    let states;
    try { states = await storage.multiGet(books.map(book => 'reader:' + book.id)); }
    catch { return books; }
    return books.map((book, index) => {
      try {
        const state = JSON.parse(states[index]?.[1] || '{}');
        return { ...book,
          ...(Number.isFinite(state.progress) ? { progress: Math.max(0, Math.min(100, state.progress)) } : {}),
          ...(typeof state.lastReadAt === 'string' ? { lastReadAt: state.lastReadAt } : {}) };
      } catch { return book; }
    });
  });
  return { load, mutate };
}
module.exports = { createLibraryStore };
