const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { paginateText } = require('../src/textPagination');
const SOURCES = ['auto', 'zh', 'ja', 'ko', 'en'];
function splitPages(pages, limit = 1800) {
  const segments = [];
  pages.forEach((page, sourcePage) => {
    const characters = Array.from(page.trim());
    let offset = 0;
    while (offset < characters.length) {
      let cut = Math.min(offset + limit, characters.length);
      if (cut < characters.length) {
        for (let i = cut - 1; i >= offset + Math.floor(limit * 0.6); i--) {
          if (/[\n。！？.!?\s]/u.test(characters[i])) { cut = i + 1; break; }
        }
      }
      const text = characters.slice(offset, cut).join('').trim();
      if (text) segments.push({ sourcePage, text });
      offset = cut;
    }
  });
  return segments;
}
function publicJob(job) {
  return { id: job.id, book: job.book, sourceLanguage: job.sourceLanguage, targetLanguage: 'es-419', status: job.status, phase: job.phase, completed: job.status === 'completed' ? job.total : job.translations.length, total: job.segments.length || job.total, progress: job.status === 'completed' ? 100 : Math.floor(job.translations.length / Math.max(1, job.total) * 100), error: job.error || '', model: job.model, createdAt: job.createdAt, updatedAt: job.updatedAt };
}
async function createJobEngine({ directory, provider, maxCharacters = 2000000, maxJobsPerOwner = 5, retentionDays = 7 }) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const jobs = new Map();
  const writes = new Map();
  let active = null;
  let running = false;
  let closed = false;
  let idle = Promise.resolve();
  let creationQueue = Promise.resolve();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const compact = job => { job.segments = []; job.glossary = []; job.draft = null; job.translations = []; };
  async function prune() {
    for (const [id, job] of jobs) if (["completed", "cancelled"].includes(job.status) && Date.now() - Date.parse(job.completedAt || job.updatedAt || job.createdAt) > retentionMs) {
      await fs.unlink(path.join(directory, id + ".json")).catch(error => { if (error.code !== "ENOENT") throw error; });
      jobs.delete(id);
    }
  }
  async function save(job) {
    job.updatedAt = new Date().toISOString();
    const promise = (writes.get(job.id) || Promise.resolve()).catch(() => {}).then(async () => {
      const filename = path.join(directory, job.id + '.json');
      const temporary = filename + '.tmp';
      await fs.writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
      await fs.rename(temporary, filename);
    });
    writes.set(job.id, promise);
    try { await promise; } finally { if (writes.get(job.id) === promise) writes.delete(job.id); }
  }
  for (const filename of await fs.readdir(directory)) {
    if (!/^[a-f0-9-]{36}\.json$/.test(filename)) continue;
    // Fail startup rather than silently discarding a damaged checkpoint.
    const job = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
    if (!job || !Array.isArray(job.segments) || !Array.isArray(job.translations) || filename !== job.id + '.json') throw new Error('Un trabajo guardado está dañado; conservá sus archivos para recuperarlo.');
    if (['queued', 'running'].includes(job.status)) { job.status = 'paused'; job.error = 'El servicio se reinició. Podés reanudar desde el último fragmento guardado.'; await save(job); }
    if (job.status === "completed") compact(job);
    jobs.set(job.id, job);
  }
  await prune();
  const maintenance = setInterval(() => prune().catch(error => console.error("Translation cleanup error:", error.message)), 60 * 60 * 1000);
  maintenance.unref();
  function owned(id, owner) {
    const job = jobs.get(id);
    if (!job || job.owner !== owner) { const error = new Error('No se encontró la traducción.'); error.status = 404; throw error; }
    return job;
  }
  const usage = (job, result) => {
    for (const key of ['input_tokens', 'output_tokens']) job.usage[key] += Math.max(0, Number(result.usage?.[key]) || 0);
  };
  function mergeGlossary(previous, additions) {
    const map = new Map(previous.map(item => [item.source, item.target]));
    for (const item of additions || []) if (typeof item?.source === 'string' && typeof item.target === 'string' && item.source.length <= 120 && item.target.length <= 120 && !map.has(item.source)) map.set(item.source, item.target);
    return [...map].slice(-160).map(([source, target]) => ({ source, target }));
  }
  async function work(job) {
    job.status = 'running'; job.error = ''; await save(job);
    while (job.status === 'running' && job.translations.length < job.segments.length && !closed) {
      const index = job.translations.length;
      const segment = job.segments[index];
      const controller = new AbortController();
      active = { job, controller };
      try {
        const common = { text: segment.text, sourceLanguage: job.sourceLanguage, glossary: job.glossary, context: job.translations.slice(-2).join('\n\n').slice(-4000), title: job.book.title, signal: controller.signal };
        if (!job.draft || job.draft.index !== index) {
          job.phase = 'translating'; await save(job);
          const draft = await provider.translate(common);
          if (job.status !== 'running' || closed) return;
          if (!['zh', 'ja', 'ko', 'en'].includes(draft.sourceLanguage)) throw new Error('El idioma del libro no está entre los cuatro idiomas compatibles.');
          if (!draft.text?.trim()) throw new Error('El proveedor devolvió un fragmento vacío.');
          if (job.sourceLanguage === 'auto') job.sourceLanguage = draft.sourceLanguage;
          job.draft = { index, text: draft.text, glossary: draft.glossary || [] };
          usage(job, draft); await save(job);
        }
        job.phase = 'reviewing'; await save(job);
        const reviewed = await provider.translate({ ...common, sourceLanguage: job.sourceLanguage, draft: job.draft.text });
        if (job.status !== 'running' || closed) return;
        if (!reviewed.text?.trim() || reviewed.text.length > 20000) throw new Error('La revisión del fragmento no es válida.');
        // A suspiciously shortened draft is never silently accepted as a full translation.
        if (job.draft.text.length > 100 && reviewed.text.length < job.draft.text.length * 0.45) throw new Error('La revisión parece incompleta. Reintentá este fragmento.');
        job.translations.push(reviewed.text.trim());
        job.glossary = mergeGlossary(job.glossary, [...job.draft.glossary, ...(reviewed.glossary || [])]);
        usage(job, reviewed); job.draft = null;
        await save(job);
      } catch (error) {
        if (job.status === 'running') { job.status = 'failed'; job.error = error.message || 'No se pudo completar este fragmento.'; await save(job); }
        return;
      } finally { active = null; }
    }
    if (job.status === 'running' && !closed) {
      job.status = 'completed'; job.phase = 'completed'; job.completedAt = new Date().toISOString();
      job.segments = []; job.glossary = []; job.draft = null;
      await save(job);
      compact(job);
    }
  }
  function kick() {
    if (running || closed) return;
    running = true;
    idle = (async () => {
      try {
        let job;
        while (!closed && (job = [...jobs.values()].find(item => item.status === 'queued'))) {
          try { await work(job); }
          catch { job.status = 'failed'; job.error = 'No se pudo guardar el progreso en el servicio. Reintentá cuando haya espacio disponible.'; }
        }
      } finally { running = false; }
    })();
    // A disk failure pauses the queue. It must not become an unhandled rejection.
    idle.catch(error => { if (active?.job) { active.job.status = 'failed'; active.job.error = 'No se pudo guardar el progreso en el servicio.'; } console.error('Translation checkpoint error:', error.message); });
  }
  return {
    create(owner, input) {
      const result = creationQueue.catch(() => {}).then(async () => {
        if (closed) throw new Error('El servicio se está reiniciando.');
        await prune();
        if (!SOURCES.includes(input.sourceLanguage) || !/^[\w-]{12,100}$/.test(input.requestId || '') || typeof input.clientBookId !== 'string' || input.clientBookId.length > 100) throw new Error('Datos de traducción inválidos.');
        if (!Array.isArray(input.pages) || !input.pages.length || input.pages.length > 10000 || input.pages.some(page => typeof page !== 'string') || input.pages.reduce((sum, page) => sum + page.length, 0) > maxCharacters) throw new Error('El libro no tiene texto válido o supera el límite de texto del servicio.');
        const sourceHash = createHash('sha256').update(JSON.stringify(input.pages)).digest('hex');
        const previous = [...jobs.values()].find(job => job.owner === owner && job.requestId === input.requestId);
        if (previous) {
          if (previous.book.clientBookId !== input.clientBookId || previous.sourceHash !== sourceHash || previous.requestedSourceLanguage !== input.sourceLanguage) throw new Error('La solicitud ya pertenece a otro contenido. Iniciá un nuevo trabajo.');
          return publicJob(previous);
        }
        if ([...jobs.values()].filter(job => job.owner === owner && !['completed', 'cancelled'].includes(job.status)).length >= maxJobsPerOwner) throw new Error('Tenés demasiadas traducciones pendientes. Completá o cancelá una primero.');
        if ([...jobs.values()].filter(item => !['completed', 'cancelled'].includes(item.status)).length >= 20) throw new Error('El servicio tiene demasiados libros pendientes. Reintentá más tarde.');
        const segments = splitPages(input.pages);
        if (!segments.length) throw new Error('Este libro no contiene texto extraíble. Un PDF escaneado necesita reconocimiento de texto (OCR).');
        const job = { id: randomUUID(), owner, requestId: input.requestId, book: { title: String(input.title || 'Libro').slice(0, 300), author: String(input.author || '').slice(0, 300), clientBookId: input.clientBookId }, sourceLanguage: input.sourceLanguage, requestedSourceLanguage: input.sourceLanguage, sourceHash, model: provider.model, status: 'queued', phase: 'queued', segments, total: segments.length, translations: [], glossary: [], draft: null, usage: { input_tokens: 0, output_tokens: 0 }, createdAt: new Date().toISOString() };
        // Reserve the idempotency key before the asynchronous checkpoint.
        jobs.set(job.id, job);
        try { await save(job); } catch (error) { jobs.delete(job.id); throw error; }
        kick(); return publicJob(job);
      });
      creationQueue = result;
      return result;
    },
    status: (id, owner) => publicJob(owned(id, owner)),
    async result(id, owner) {
      const job = owned(id, owner);
      if (job.status !== 'completed') throw new Error('La traducción todavía no está completa.');
      // Completed books live on disk, not in the queue's memory.
      const saved = JSON.parse(await fs.readFile(path.join(directory, job.id + '.json'), 'utf8'));
      const pages = paginateText(saved.translations.join('\n\n'), 1100);
      if (pages.length > 20000) throw new Error('La traducción supera el límite de páginas del lector.');
      return { id: job.id, pages, sourceLanguage: job.sourceLanguage, targetLanguage: 'es-419', model: job.model, completedAt: job.completedAt };
    },
    async control(id, owner, action) {
      const job = owned(id, owner);
      if (job.status === 'completed') return publicJob(job);
      if (action === 'pause' && ['queued', 'running'].includes(job.status)) { job.status = 'paused'; if (active?.job === job) active.controller.abort(); }
      else if (action === 'resume' && ['paused', 'failed'].includes(job.status)) { job.status = 'queued'; job.error = ''; }
      else if (action === 'cancel' && job.status !== 'completed') { job.status = 'cancelled'; if (active?.job === job) active.controller.abort(); job.segments = []; job.translations = []; job.glossary = []; job.draft = null; }
      await save(job); kick(); return publicJob(job);
    },
    wait: () => idle,
    async close() { closed = true; clearInterval(maintenance); if (active) { active.job.status = 'paused'; active.controller.abort(); await save(active.job); } await idle.catch(() => {}); },
  };
}
module.exports = { createJobEngine, splitPages };
