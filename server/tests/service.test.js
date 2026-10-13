const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createJobEngine, splitPages } = require('../jobs');
const { createServer } = require('../index');
const { createOpenAIProvider } = require('../provider');
const { extractPdf } = require('../pdf');
const input = { clientBookId: 'book', title: 'Sample', sourceLanguage: 'auto', requestId: 'request_123456789', pages: ['Hello reader.'] };
async function fixture(t, provider, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lector-translation-test-'));
  const engine = await createJobEngine({ directory, provider, ...options });
  t.after(async () => {
    await engine.close();
    const target = path.resolve(directory);
    if (!target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith('lector-translation-test-')) throw Error('Unsafe test cleanup path');
    await fs.rm(target, { recursive: true, force: true });
  });
  return { engine, directory };
}
const provider = { model: 'test-only', translate: async value => ({ text: value.draft || 'Hola lector.', sourceLanguage: 'en', glossary: [{ source: 'Reader', target: 'Lector' }], usage: { input_tokens: 10, output_tokens: 5 } }) };
test('chunking supports CJK punctuation and never splits surrogate pairs', () => {
  const text = '你好世界😀'.repeat(800);
  const chunks = splitPages([text]);
  assert.equal(chunks.map(item => item.text).join(''), text);
  assert.ok(chunks.every(item => Array.from(item.text).length <= 1800));
});
test('a complete book receives translation plus review and keeps terminology between fragments', async t => {
  const calls = [];
  const mock = { ...provider, translate: async value => { calls.push(value); return provider.translate(value); } };
  const { engine } = await fixture(t, mock);
  const job = await engine.create('owner', { ...input, pages: ['One page.', 'Another page.'] });
  await engine.wait();
  assert.equal(engine.status(job.id, 'owner').status, 'completed'); assert.equal(calls.length, 4);
  assert.ok(calls[1].draft); assert.ok(calls[2].glossary.some(item => item.source === 'Reader')); assert.ok(calls[2].context.includes('Hola lector'));
  assert.equal((await engine.result(job.id, 'owner')).targetLanguage, 'es-419');
  assert.throws(() => engine.status(job.id, 'someone-else'), /No se encontró/);
});
test('simultaneous retries with the same request key create only one paid job', async t => {
  let calls = 0;
  const { engine } = await fixture(t, { ...provider, translate: async value => { calls++; return provider.translate(value); } });
  const jobs = await Promise.all([engine.create('owner', input), engine.create('owner', input)]);
  assert.equal(jobs[0].id, jobs[1].id); await engine.wait(); assert.equal(calls, 2);
});
test('review failure resumes from the persisted draft instead of translating again', async t => {
  let fail = true; const calls = [];
  const { engine } = await fixture(t, { ...provider, translate: async value => { calls.push(!!value.draft); if (value.draft && fail) throw Error('network failed'); return provider.translate(value); } });
  const job = await engine.create('owner', input); await engine.wait(); assert.equal(engine.status(job.id, 'owner').status, 'failed');
  fail = false; await engine.control(job.id, 'owner', 'resume'); await engine.wait();
  assert.deepEqual(calls, [false, true, true]); assert.equal(engine.status(job.id, 'owner').status, 'completed');
});
test('pause and restart preserve the last checkpoint and require explicit resumption', async t => {
  let started;
  const startedPromise = new Promise(resolve => started = resolve);
  const blocking = { ...provider, translate: async value => {
    if (!value.draft) return provider.translate(value);
    started(); return new Promise((resolve, reject) => value.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
  } };
  const { engine, directory } = await fixture(t, blocking);
  const job = await engine.create('owner', input); await startedPromise;
  await engine.control(job.id, 'owner', 'pause'); await engine.wait();
  assert.equal(engine.status(job.id, 'owner').status, 'paused'); await engine.close();
  const calls = [];
  const restored = await createJobEngine({ directory, provider: { ...provider, translate: async value => { calls.push(!!value.draft); return provider.translate(value); } } });
  assert.equal(restored.status(job.id, 'owner').status, 'paused'); assert.equal(calls.length, 0);
  await restored.control(job.id, 'owner', 'resume'); await restored.wait(); assert.deepEqual(calls, [true]); await restored.close();
});
test('cancellation discards remote content and stops in-flight work', async t => {
  let started; const start = new Promise(resolve => started = resolve);
  const { engine, directory } = await fixture(t, { ...provider, translate: async value => { started(); return new Promise((resolve, reject) => value.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })); } });
  const job = await engine.create('owner', input); await start;
  await engine.control(job.id, 'owner', 'cancel'); await engine.wait();
  const saved = JSON.parse(await fs.readFile(path.join(directory, job.id + '.json'), 'utf8'));
  assert.equal(saved.status, 'cancelled'); assert.deepEqual(saved.segments, []); assert.deepEqual(saved.translations, []);
});
test('unsupported languages and empty/oversized content never complete successfully', async t => {
  const { engine } = await fixture(t, { ...provider, translate: async () => ({ text: 'Hola', sourceLanguage: 'unsupported', glossary: [] }) }, { maxCharacters: 100 });
  await assert.rejects(engine.create('owner', { ...input, pages: ['x'.repeat(101)] }), /límite/);
  await assert.rejects(engine.create('owner', { ...input, pages: [' '] }), /extraíble/);
  const job = await engine.create('owner', input); await engine.wait(); assert.equal(engine.status(job.id, 'owner').status, 'failed');
  await assert.rejects(engine.result(job.id, 'owner'), /no está completa/);
});
test('HTTP endpoints authenticate owners and refuse translation when no provider is configured', async t => {
  const { engine } = await fixture(t, provider);
  const tokens = ['owner-access-token-1234567890', 'different-reader-token-1234567890'];
  const server = createServer({ engine, tokens, ready: false, model: 'test-only' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(url + '/v1/health')).status, 401);
  const headers = { Authorization: 'Bearer ' + tokens[0], 'Content-Type': 'application/json' };
  assert.equal((await (await fetch(url + '/v1/health', { headers })).json()).translationReady, false);
  assert.equal((await fetch(url + '/v1/jobs', { method: 'POST', headers, body: JSON.stringify(input) })).status, 503);
});
test('provider requests use Latin American Spanish, structured results and a separate review pass', async () => {
  let request;
  const translator = createOpenAIProvider({ apiKey: 'test-not-a-real-key', fetcher: async (url, options) => { request = options; return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ text: 'Hola', sourceLanguage: 'en', glossary: [] }) }] }], usage: {} }) }; } });
  await translator.translate({ text: 'Hello', draft: 'Hola', sourceLanguage: 'en', glossary: [], context: '', title: 'Book', signal: new AbortController().signal });
  const body = JSON.parse(request.body); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.match(body.instructions, /es-419/); assert.match(body.instructions, /Revisá el borrador/);
  assert.equal(JSON.parse(body.input).originalText, 'Hello'); assert.ok(!request.body.includes('test-not-a-real-key'));
});
function smallPdf(text = 'Hello reader') {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const content = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => pdf += String(offset).padStart(10, '0') + ' 00000 n \n');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
test('real PDF extraction retains text and rejects image-only or invalid PDFs', async () => {
  const pages = await extractPdf(smallPdf()); assert.match(pages[0], /Hello reader/);
  await assert.rejects(extractPdf(smallPdf('')), /OCR/);
  await assert.rejects(extractPdf(Buffer.from('not a pdf')));
});


test('PDF worker extracts text without blocking the job API process', async () => {
 const { extractPdfInWorker } = require('../pdfWorkerClient');
 const pages = await extractPdfInWorker(smallPdf());
 assert.match(pages[0], /Hello reader/);
});


test('completed results survive restart and late control requests cannot erase them', async t => {
 const { engine, directory } = await fixture(t, provider);
 const job=await engine.create('owner',input);await engine.wait();
 const saved=JSON.parse(await fs.readFile(path.join(directory,job.id+'.json'),'utf8'));
 assert.deepEqual(saved.segments,[]);assert.ok(saved.translations.length);
 await engine.control(job.id,'owner','pause');await engine.control(job.id,'owner','cancel');
 assert.equal(engine.status(job.id,'owner').completed,1);
 await engine.close();
 const restored=await createJobEngine({directory,provider});
 assert.match((await restored.result(job.id,'owner')).pages[0],/Hola/);
 await restored.close();
});
test('expired completed results are removed on startup while original content remains a client responsibility', async t => {
 const { engine,directory }=await fixture(t,provider);
 const job=await engine.create('owner',input);await engine.wait();await engine.close();
 const filename=path.join(directory,job.id+'.json');const saved=JSON.parse(await fs.readFile(filename,'utf8'));saved.completedAt='2000-01-01T00:00:00.000Z';await fs.writeFile(filename,JSON.stringify(saved));
 const restored=await createJobEngine({directory,provider});
 assert.throws(()=>restored.status(job.id,'owner'),/No se encontró/);await assert.rejects(fs.access(filename));await restored.close();
});


test('an idempotency key cannot attach a previous translation to a different book', async t => {
 const {engine}=await fixture(t,provider);
 await engine.create('owner',input);
 await assert.rejects(engine.create('owner',{...input,clientBookId:'other-book'}),/otro contenido/);
 await assert.rejects(engine.create('owner',{...input,pages:['Other text']}),/otro contenido/);
 await engine.wait();
});

test('the HTTP book flow returns completed copies for every supported source and isolates readers', async t => {
  const { engine } = await fixture(t, { ...provider, translate: async value => ({ text: value.draft || 'Texto de prueba en español.', sourceLanguage: value.sourceLanguage === 'auto' ? 'en' : value.sourceLanguage, glossary: [] }) });
  const tokens = ['reader-zh-access-token-1234567890', 'reader-ja-access-token-1234567890', 'reader-ko-access-token-1234567890', 'reader-en-access-token-1234567890', 'another-reader-token-1234567890'];
  const server = createServer({ engine, tokens });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port;
  for (const [index, sourceLanguage] of ['zh', 'ja', 'ko', 'en'].entries()) {
    const headers = { Authorization: 'Bearer ' + tokens[index], 'Content-Type': 'application/json' };
    const response = await fetch(url + '/v1/jobs', { method: 'POST', headers, body: JSON.stringify({ ...input, sourceLanguage, requestId: 'request_' + sourceLanguage + '_123456789' }) });
    assert.equal(response.status, 202); const job = await response.json(); await engine.wait();
    const result = await (await fetch(url + '/v1/jobs/' + job.id + '/result', { headers })).json();
    assert.equal(result.sourceLanguage, sourceLanguage); assert.equal(result.targetLanguage, 'es-419'); assert.ok(result.pages.length);
    assert.equal((await fetch(url + '/v1/jobs/' + job.id, { headers: { Authorization: 'Bearer ' + tokens[4] } })).status, 404);
  }
});
