const test = require('node:test');
const assert = require('node:assert/strict');
const { serviceUrl, createTranslationClient, saveTranslatedBook } = require('../src/translationClient');
test('service configuration requires HTTPS and keeps credentials out of URLs', () => {
  assert.equal(serviceUrl(' https://translate.example/ '), 'https://translate.example');
  assert.equal(serviceUrl('http://10.0.2.2:8787'), 'http://10.0.2.2:8787');
  for (const url of ['http://public.example', 'https://user:secret@example.com', 'https://example.com?token=secret', 'file:///secret']) assert.throws(() => serviceUrl(url));
});
test('EPUB submission preserves idempotency key and sends the selected source language', async () => {
  let request;
  const client = createTranslationClient({ url: 'https://translate.example', token: 'client-access' }, { fs: { readAsStringAsync: async () => '["Hello"]' }, fetcher: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ id: 'job-id' }) }; } });
  await client.start({ id: 'original', name: 'Book', type: 'epub', contentUri: 'file:///book.json' }, 'en', 'request_123456789');
  const input = JSON.parse(request.options.body);
  assert.equal(input.requestId, 'request_123456789'); assert.equal(input.sourceLanguage, 'en'); assert.deepEqual(input.pages, ['Hello']);
  assert.equal(request.options.headers.Authorization, 'Bearer client-access'); assert.ok(!request.url.includes('client-access'));
});
test('PDF submission is binary and rejects oversized files before uploading', async () => {
  let uploaded = false;
  const fs = { FileSystemUploadType: { BINARY_CONTENT: 0 }, getInfoAsync: async () => ({ exists: true, size: 50 * 1024 * 1024 }), uploadAsync: async () => { uploaded = true; return { status: 202, body: '{"id":"pdf-job"}' }; } };
  const client = createTranslationClient({ url: 'https://translate.example', token: 'access' }, { fs });
  await assert.rejects(client.start({ id: 'book', type: 'pdf', url: 'file:///book.pdf' }, 'zh', 'request_123456789'), /40 MB/); assert.equal(uploaded, false);
  fs.getInfoAsync = async () => ({ exists: true, size: 100 });
  assert.equal((await client.start({ id: 'book', name: '名字', type: 'pdf', url: 'file:///book.pdf' }, 'zh', 'request_123456789')).id, 'pdf-job'); assert.equal(uploaded, true);
});
test('translated copies never replace the original and duplicate results clean up only their temporary file', async () => {
  const original = { id: 'original', name: 'Book', type: 'epub' }; let books = [original]; const files = new Set(); const deleted = [];
  const fs = { documentDirectory: 'file:///private/', makeDirectoryAsync: async () => {}, writeAsStringAsync: async uri => files.add(uri), deleteAsync: async uri => { files.delete(uri); deleted.push(uri); } };
  const mutate = async fn => { books = fn(books); };
  const result = { id: '12345678-1234-1234-1234-123456789abc', pages: ['Hola lector'], sourceLanguage: 'en' };
  const first = await saveTranslatedBook(original, result, { fs, mutate });
  const second = await saveTranslatedBook(original, result, { fs, mutate });
  assert.equal(first, second); assert.equal(books.length, 2); assert.equal(books[1], original); assert.equal(first.translation.targetLanguage, 'es-419');
  assert.ok(files.has(first.contentUri)); assert.ok(!deleted.includes(first.contentUri));
  await assert.rejects(saveTranslatedBook(original, result, { fs, mutate: async () => { throw Error('full'); } })); assert.equal(files.size, 1);
});
test('invalid translation results cannot be installed in the library', async () => {
  await assert.rejects(saveTranslatedBook({ name: 'Book' }, { id: '../../unsafe', pages: ['Hola'] }, {}), /válida/);
  await assert.rejects(saveTranslatedBook({ name: 'Book' }, { id: '123456789012', pages: [] }, {}), /válida/);
});
