const http = require('node:http');
const path = require('node:path');
const { createHash, timingSafeEqual } = require('node:crypto');
const { createJobEngine } = require('./jobs');
const { createOpenAIProvider } = require('./provider');
const { extractPdfInWorker } = require('./pdfWorkerClient');
function digest(value) { return createHash('sha256').update(value).digest(); }
async function readBody(request, limit) {
  const chunks = []; let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > limit) { const error = new Error('El archivo supera el límite de carga.'); error.status = 413; throw error; } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function createServer({ engine, tokens, ready = true, model, pdfExtractor = extractPdfInWorker }) {
  if (!tokens.length || tokens.some(token => token.length < 24)) throw new Error('Configurá claves de cliente aleatorias de al menos 24 caracteres.');
  const owners = tokens.map(digest);
  const rates = new Map();
  const server = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    const send = (status, data) => { response.writeHead(status); response.end(JSON.stringify(data)); };
    try {
      const token = /^Bearer (.+)$/.exec(request.headers.authorization || '')?.[1];
      const fingerprint = digest(token || '');
      const owner = owners.find(item => timingSafeEqual(item, fingerprint))?.toString('hex');
      if (!owner) return send(401, { error: 'La clave de acceso al servicio no es válida.' });
      const url = new URL(request.url, 'http://localhost');
      const now = Date.now();
      for (const [key, entry] of rates) if (now - entry.start >= 60000) rates.delete(key);
      const rate = rates.get(owner) || { start: now, count: 0, creates: 0 };
      rate.count++; rates.set(owner, rate);
      if (rate.count > 120) return send(429, { error: 'Esperá un momento antes de consultar de nuevo.' });
      if (request.method === 'GET' && url.pathname === '/v1/health') return send(200, { translationReady: ready, model, supportedLanguages: ['zh', 'ja', 'ko', 'en'], targetLanguage: 'es-419' });
      if (request.method === 'POST' && ['/v1/jobs', '/v1/jobs/pdf'].includes(url.pathname)) {
        if (!ready) return send(503, { error: 'El administrador todavía no configuró la API de traducción.' });
        if (++rate.creates > 3) return send(429, { error: 'Esperá un minuto antes de iniciar otro libro.' });
        let input;
        if (url.pathname.endsWith('/pdf')) {
          const bytes = await readBody(request, 40 * 1024 * 1024);
          if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('El archivo recibido no es un PDF válido.');
          input = { ...Object.fromEntries(url.searchParams), pages: await pdfExtractor(bytes) };
        } else input = JSON.parse((await readBody(request, 12 * 1024 * 1024)).toString('utf8'));
        return send(202, await engine.create(owner, input));
      }
      const match = /^\/v1\/jobs\/([a-f0-9-]{36})(?:\/(result|pause|resume|cancel))?$/.exec(url.pathname);
      if (match && request.method === 'GET' && (!match[2] || match[2] === 'result')) return send(200, match[2] === 'result' ? await engine.result(match[1], owner) : engine.status(match[1], owner));
      if (match && request.method === 'POST' && ['pause', 'resume', 'cancel'].includes(match[2])) return send(200, await engine.control(match[1], owner, match[2]));
      send(404, { error: 'No se encontró esta operación.' });
    } catch (error) { if (!response.headersSent) send(error.status || 400, { error: error instanceof SyntaxError ? 'La solicitud no contiene datos válidos.' : error.message || 'No se pudo procesar el libro.' }); }
  });
  server.requestTimeout = 180000;
  return server;
}
if (require.main === module) {
  (async () => {
    const tokens = (process.env.TRANSLATION_CLIENT_TOKENS || '').split(',').map(value => value.trim()).filter(Boolean);
    const provider = createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4.1' });
    const engine = await createJobEngine({ directory: path.resolve(process.env.DATA_DIRECTORY || path.join(__dirname, 'data')), provider, maxCharacters: Number(process.env.MAX_BOOK_CHARACTERS) || 2000000 });
    const server = createServer({ engine, tokens, ready: !!process.env.OPENAI_API_KEY, model: provider.model });
    server.listen(Number(process.env.PORT) || 8787, process.env.HOST || '127.0.0.1', () => console.log('Servicio de traducción iniciado.'));
    const close = async () => { server.close(); await engine.close(); process.exit(0); };
    process.on('SIGINT', close); process.on('SIGTERM', close);
  })().catch(error => { console.error(error.message); process.exit(1); });
}
module.exports = { createServer };
