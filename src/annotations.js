const HIGHLIGHT_COLORS = ['#FDE68A', '#BBF7D0', '#BFDBFE', '#FBCFE8'];

function phraseOptions(text, limit = 18) {
  if (typeof text !== 'string') return [];
  const options = [];
  const expression = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
  let match;
  while ((match = expression.exec(text)) && options.length < limit) {
    const leading = match[0].search(/\S/);
    const value = match[0].trim();
    if (value.length >= 3) {
      const start = match.index + Math.max(0, leading);
      options.push({ text: value, start, end: start + value.length });
    }
  }
  return options;
}

function createAnnotation({ page, pageText, quote, start, end, color, note, id, createdAt }) {
  if (!Number.isInteger(page) || page < 0) throw new Error('Página inválida.');
  const cleanQuote = String(quote || '').trim();
  const cleanNote = String(note || '').trim();
  if (!cleanQuote && !cleanNote) throw new Error('Elegí una frase o escribí una nota.');
  let from = Number.isInteger(start) ? start : -1;
  let to = Number.isInteger(end) ? end : -1;
  if (cleanQuote && typeof pageText === 'string' && pageText.slice(from, to) !== cleanQuote) {
    from = pageText.toLocaleLowerCase().indexOf(cleanQuote.toLocaleLowerCase());
    to = from < 0 ? -1 : from + cleanQuote.length;
  }
  if (cleanQuote && typeof pageText === 'string' && from < 0) throw new Error('La frase ya no está en esta página.');
  const storedQuote = cleanQuote && typeof pageText === 'string' ? pageText.slice(from, to) : cleanQuote;
  return {
    id: id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    page,
    quote: storedQuote,
    start: storedQuote && typeof pageText === 'string' ? from : null,
    end: storedQuote && typeof pageText === 'string' ? to : null,
    color: HIGHLIGHT_COLORS.includes(color) ? color : HIGHLIGHT_COLORS[0],
    note: cleanNote,
    createdAt: createdAt || new Date().toISOString(),
  };
}

function normalizeAnnotations(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.id === 'string' && Number.isInteger(item.page) && item.page >= 0)
    .map(item => ({
      ...item,
      quote: typeof item.quote === 'string' ? item.quote : '',
      note: typeof item.note === 'string' ? item.note : '',
      color: HIGHLIGHT_COLORS.includes(item.color) ? item.color : HIGHLIGHT_COLORS[0],
    }));
}

function textSegments(text, annotations) {
  const ranges = normalizeAnnotations(annotations)
    .filter(item => item.quote && Number.isInteger(item.start) && Number.isInteger(item.end) && item.start >= 0 && item.end <= text.length && item.end > item.start && text.slice(item.start, item.end) === item.quote)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const segments = [];
  let cursor = 0;
  for (const item of ranges) {
    if (item.start < cursor) continue;
    if (item.start > cursor) segments.push({ text: text.slice(cursor, item.start), annotation: null });
    segments.push({ text: text.slice(item.start, item.end), annotation: item });
    cursor = item.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), annotation: null });
  return segments.length ? segments : [{ text, annotation: null }];
}

module.exports = { HIGHLIGHT_COLORS, phraseOptions, createAnnotation, normalizeAnnotations, textSegments };
