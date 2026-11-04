/**
 * db.js — One shared MongoDB connection.
 *
 * Locally, if MONGODB_URI is unset, we spin up mongodb-memory-server so the
 * dashboard runs without Docker/Atlas. On Vercel/Render set MONGODB_URI.
 */
import mongoose from 'mongoose';

const cache = globalThis.__plMongo || (globalThis.__plMongo = { promise: null, memory: null });

export function getMongoUri() {
  return process.env.MONGODB_URI || cache.memory?.uri || 'mongodb://127.0.0.1:27017/pl_transfer';
}

async function ensureMemoryServer() {
  if (process.env.MONGODB_URI || cache.memory) return;
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'pl_transfer' },
  });
  cache.memory = { mongod, uri: mongod.getUri('pl_transfer') };
  console.log('🧠 Started in-memory MongoDB for local demo');
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cache.promise) {
    cache.promise = (async () => {
      if (!process.env.MONGODB_URI) {
        await ensureMemoryServer();
      }
      return mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 15000 });
    })().catch(err => {
      cache.promise = null;
      throw err;
    });
  }
  return cache.promise;
}
