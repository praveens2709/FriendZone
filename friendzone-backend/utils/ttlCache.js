export const createTtlCache = ({ ttlMs, max = 20000 }) => {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expires <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      if (store.size >= max) {
        const drop = Math.ceil(max * 0.1);
        let removed = 0;
        for (const existing of store.keys()) {
          store.delete(existing);
          removed += 1;
          if (removed >= drop) break;
        }
      }
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
  };
};
