class SearchCache {
  constructor({ maxEntries = 40, ttlMs = 5 * 60 * 1000, now = () => Date.now() } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
  }

  key({ source, language, query, page }) {
    return [source || 'free', language || 'all', String(query || '').trim().toLocaleLowerCase(), page || 1].join('|');
  }

  get(parameters) {
    const key = this.key(parameters);
    const entry = this.entries.get(key);
    if (!entry || this.now() - entry.savedAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(parameters, value) {
    const key = this.key(parameters);
    this.entries.delete(key);
    this.entries.set(key, { value, savedAt: this.now() });
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value);
  }
}

module.exports = { SearchCache };
