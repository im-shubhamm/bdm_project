import mongoose from 'mongoose';

const cache = globalThis.__ssMongo || (globalThis.__ssMongo = { promise: null, memory: null });

export function getMongoUri() {
  return process.env.MONGODB_URI || cache.memory?.uri || 'mongodb://127.0.0.1:27017/superstore_bdm';
}

async function ensureMemory() {
  if (process.env.MONGODB_URI || cache.memory) return;
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({ instance: { dbName: 'superstore_bdm' } });
  cache.memory = { mongod, uri: mongod.getUri('superstore_bdm') };
  console.log('Started in-memory MongoDB');
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cache.promise) {
    cache.promise = (async () => {
      if (!process.env.MONGODB_URI) await ensureMemory();
      return mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 20000 });
    })().catch(err => { cache.promise = null; throw err; });
  }
  return cache.promise;
}
