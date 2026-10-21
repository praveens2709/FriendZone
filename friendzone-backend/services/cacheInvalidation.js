import { createTtlCache } from '../utils/ttlCache.js';

export const authCache = createTtlCache({ ttlMs: 15000 });
export const relationCache = createTtlCache({ ttlMs: 10000 });

const QUERY_WRITES = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
];

export const clearOnWrite = (schema, cache) => {
  const clear = () => cache.clear();
  schema.post('save', clear);
  schema.post('insertMany', clear);
  schema.post('bulkWrite', clear);
  schema.post(QUERY_WRITES, { query: true, document: false }, clear);
  schema.post('deleteOne', { document: true, query: false }, clear);
};
