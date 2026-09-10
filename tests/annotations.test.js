const test = require('node:test');
const assert = require('node:assert/strict');
const { createAnnotation, normalizeAnnotations, phraseOptions, textSegments } = require('../src/annotations');

test('extracts tappable phrases with their exact page positions', () => {
  const page = 'Primera frase. Segunda frase importante!\nÚltima idea.';
  const options = phraseOptions(page);
  assert.deepEqual(options.map(item => item.text), ['Primera frase.', 'Segunda frase importante!', 'Última idea.']);
  assert.equal(page.slice(options[1].start, options[1].end), options[1].text);
});

test('creates an exact highlight and keeps an optional note', () => {
  const pageText = 'Una Frase que quiero recordar.';
  const annotation = createAnnotation({ page: 2, pageText, quote: 'frase que quiero', color: '#BBF7D0', note: 'Idea central' });
  assert.equal(annotation.quote, 'Frase que quiero');
  assert.equal(pageText.slice(annotation.start, annotation.end), annotation.quote);
  assert.equal(annotation.note, 'Idea central');
});

test('supports page notes without text coordinates for PDFs', () => {
  const annotation = createAnnotation({ page: 4, pageText: null, quote: 'Referencia manual', note: 'Revisar después' });
  assert.equal(annotation.start, null);
  assert.equal(annotation.end, null);
  assert.equal(annotation.note, 'Revisar después');
});

test('rejects empty annotations and phrases absent from an EPUB page', () => {
  assert.throws(() => createAnnotation({ page: 0, pageText: 'Texto' }), /Elegí una frase/);
  assert.throws(() => createAnnotation({ page: 0, pageText: 'Texto', quote: 'Otra' }), /ya no está/);
});

test('renders valid ranges and ignores corrupt or overlapping highlights', () => {
  const text = 'Uno dos tres cuatro';
  const first = createAnnotation({ id: 'a', page: 0, pageText: text, quote: 'dos', color: '#FDE68A' });
  const second = createAnnotation({ id: 'b', page: 0, pageText: text, quote: 'tres', color: '#BFDBFE' });
  const segments = textSegments(text, [first, { ...second, start: first.start }, { ...second, id: 'c' }]);
  assert.equal(segments.map(item => item.text).join(''), text);
  assert.deepEqual(segments.filter(item => item.annotation).map(item => item.annotation.id), ['a', 'c']);
  assert.deepEqual(normalizeAnnotations([{ page: -1 }, first, null]).map(item => item.id), ['a']);
});
