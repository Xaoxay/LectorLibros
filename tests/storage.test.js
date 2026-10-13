const test = require('node:test');
const assert = require('node:assert/strict');
const { createLibraryStore } = require('../src/libraryStore');
const { importBook } = require('../src/importBook');

function storage(raw = '[{"id":"old"}]') {
  const data = new Map([['@lector_libros_store_v2', raw]]);
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => data.set(key, value), multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]) };
}
test('read failures and corrupt libraries cannot overwrite existing data', async () => {
  for (const mode of ['read', 'json', 'shape']) {
    const db = storage(mode === 'json' ? '{broken' : mode === 'shape' ? '{}' : undefined);
    const original = db.data.get('@lector_libros_store_v2');
    if (mode === 'read') db.getItem = async () => { throw Error('read failed'); };
    const store = createLibraryStore(db, [{ id: 'sample' }]);
    await assert.rejects(store.load());
    await assert.rejects(store.mutate(books => [{ id: 'new' }, ...books]));
    assert.equal(db.data.get('@lector_libros_store_v2'), original);
  }
});
test('missing progress never substitutes the library or merges arbitrary fields', async () => {
  const db = storage();
  db.multiGet = async () => { throw Error('progress failed'); };
  const store = createLibraryStore(db, []);
  assert.deepEqual(await store.load(), [{ id: 'old' }]);
  await store.mutate(books => [{ id: 'new' }, ...books]);
  assert.equal((await store.load()).length, 2);
  db.multiGet = async keys => keys.map(key => [key, '{"id":"fake","url":"fake","progress":500}']);
  const books = await store.load();
  assert.equal(books[1].id, 'old');
  assert.equal(books[1].url, undefined);
  assert.equal(books[1].progress, 100);
});
test('simultaneous mutations preserve additions and deletions; failed writes do not poison queue', async () => {
  const db = storage();
  const store = createLibraryStore(db, []);
  await Promise.all([store.mutate(books => [...books, { id: 'a' }]), store.mutate(books => [...books, { id: 'b' }]), store.mutate(books => books.filter(book => book.id !== 'old'))]);
  assert.deepEqual((await store.load()).map(book => book.id), ['a', 'b']);
  const write = db.setItem;
  db.setItem = async () => { throw Error('full'); };
  await assert.rejects(store.mutate(books => []));
  db.setItem = write;
  await store.mutate(books => [...books, { id: 'c' }]);
  assert.equal((await store.load()).length, 3);
});
test('a genuinely new library starts with samples without writing on read', async () => {
  const db = storage(); db.data.clear();
  const store = createLibraryStore(db, [{ id: 'sample' }]);
  assert.equal((await store.load())[0].id, 'sample');
  assert.equal(db.data.size, 0);
  await store.mutate(books => [{ id: 'new' }, ...books]);
  assert.equal((await store.load()).length, 2);
});

function importer(fail) {
  const created = [], deleted = [];
  const fs = { documentDirectory: 'file:///private/', EncodingType: { Base64: 'base64' }, getInfoAsync: async () => ({ exists: true, size: 100 }), makeDirectoryAsync: async () => {}, copyAsync: async ({ to }) => { created.push(to); if (fail === 'copy') throw Error('copy failed'); }, readAsStringAsync: async () => 'data', writeAsStringAsync: async path => { created.push(path); if (fail === 'json' && path.endsWith('.json') || fail === 'cover' && path.endsWith('.png')) throw Error('write failed'); }, deleteAsync: async path => deleted.push(path) };
  return { fs, created, deleted, parse: async () => { if (fail === 'parse') throw Error('invalid'); return { pages: ['text'], cover: 'data:image/png;base64,aA==' }; }, mutate: async fn => { if (fail === 'save') throw Error('full'); return fn([]); } };
}
test('every failed import removes all partial files, including failed writes', async () => {
  for (const mode of ['copy', 'parse', 'json', 'cover', 'save']) {
    const deps = importer(mode);
    await assert.rejects(importBook({ name: 'book.epub', uri: 'file:///cache/input' }, deps));
    assert.deepEqual(deps.deleted.sort(), deps.created.sort(), mode);
  }
});
test('successful imports retain their files and oversized input is rejected before copying', async () => {
  const deps = importer();
  const book = await importBook({ name: 'book.epub', uri: 'file:///cache/input' }, deps);
  assert.match(book.cover, /\.png$/);
  assert.deepEqual(deps.deleted, []);
  deps.fs.getInfoAsync = async () => ({ exists: true, size: 41 * 1024 * 1024 });
  const count = deps.created.length;
  await assert.rejects(importBook({ name: 'huge.epub', uri: 'file:///cache/input' }, deps), /40 MB/);
  assert.equal(deps.created.length, count);
});
