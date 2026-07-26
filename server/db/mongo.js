import mongoose from 'mongoose';

import { MONGO_URI, PERSISTENCE_ENABLED, safeUri } from '../config.js';

/**
 * Connection lifecycle only — no game knowledge lives here.
 *
 * connect() never throws and never blocks startup. The game is fully playable
 * with no database at all; persistence attaches itself if and when it can.
 */

let state = 'disabled'; // disabled | connecting | connected | disconnected
let lastError = null;

export const dbState = () => ({ state, lastError, uri: safeUri(MONGO_URI) });
export const isConnected = () => mongoose.connection.readyState === 1;

export async function connectMongo() {
  if (!PERSISTENCE_ENABLED) {
    console.warn('⚠️  DATABASE not configured — running in memory-only mode.');
    return false;
  }

  state = 'connecting';
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    state = 'disconnected';
  });
  mongoose.connection.on('connected', () => {
    state = 'connected';
    lastError = null;
  });

  try {
    await mongoose.connect(MONGO_URI, {
      // Without this, mongoose queues operations while disconnected and rejects
      // each after 10s — during an outage that is thousands of pending promises
      // holding round data. Off means writes fail fast and the outbox absorbs it.
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
    });
    state = 'connected';
    console.log(`🍃 MongoDB connected — ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    state = 'disconnected';
    lastError = error.message;
    console.warn(`⚠️  MongoDB unavailable (${error.message}). Game continues without persistence.`);
    return false;
  }
}

export async function closeMongo() {
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
}
