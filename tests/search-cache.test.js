const test = require('node:test');
const assert = require('node:assert/strict');
const { SearchCache } = require('../src/searchCache');

test('search cache normalizes queries and expires old results', () => {
  let now = 1000;
  const cache = new SearchCache({ ttlMs: 5000, now: () => now });
  cache.set({ source: 'free', language: 'es', query: '  Cervantes ', page: 1 }, { books: ['Quijote'] });
  assert.deepEqual(cache.get({ source: 'free', language: 'es', query: 'cervantes', page: 1 }), { books: ['Quijote'] });
  now = 7001;
  assert.equal(cache.get({ source: 'free', language: 'es', query: 'Cervantes', page: 1 }), null);
});

test('search cache separates sources, languages and pages', () => {
  const cache = new SearchCache();
  cache.set({ source: 'free', language: 'es', query: 'dune', page: 1 }, 'free-es-1');
  cache.set({ source: 'all', language: '', query: 'dune', page: 2 }, 'all-2');
  assert.equal(cache.get({ source: 'free', language: 'es', query: 'dune', page: 1 }), 'free-es-1');
  assert.equal(cache.get({ source: 'all', language: '', query: 'dune', page: 2 }), 'all-2');
  assert.equal(cache.get({ source: 'all', language: 'es', query: 'dune', page: 2 }), null);
});

test('search cache evicts the least recently used result', () => {
  const cache = new SearchCache({ maxEntries: 2 });
  cache.set({ query: 'one' }, 1);
  cache.set({ query: 'two' }, 2);
  cache.get({ query: 'one' });
  cache.set({ query: 'three' }, 3);
  assert.equal(cache.get({ query: 'two' }), null);
  assert.equal(cache.get({ query: 'one' }), 1);
});
