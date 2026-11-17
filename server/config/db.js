const mongoose = require('mongoose');
const mock = require('./mockStore');

let cachedPromise = null;

/**
 * Connect to MongoDB using Mongoose with Serverless connection pooling.
 * When MONGODB_URI is provided, connects directly to MongoDB Atlas cloud database.
 * If running offline locally without MongoDB, engages fallback demo engine.
 */
const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise) {
    try {
      await cachedPromise;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch (e) {
      cachedPromise = null;
    }
  }

  const uri = process.env.MONGODB_URI;

  // Cloud MongoDB Atlas URI (or real external MongoDB)
  if (uri && (uri.startsWith('mongodb+srv://') || (uri.startsWith('mongodb://') && !uri.includes('127.0.0.1') && !uri.includes('localhost')))) {
    try {
      console.log('[Database] Connecting to MongoDB Atlas...');
      cachedPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });

      const conn = await cachedPromise;
      console.log(`[Database] MongoDB Atlas connected: ${conn.connection.host}`);
      mock.setInMemoryActive(false);

      // Seed default admin if database is completely fresh
      try {
        const User = require('../models/User');
        const adminExists = await User.findOne({ email: 'admin@foodshare.org' });
        if (!adminExists) {
          console.log('[Database] Initializing admin account in MongoDB Atlas...');
          await new User({
            name: 'Chief Inspector Bartholomew',
            email: 'admin@foodshare.org',
            password: 'password123',
            role: 'admin',
            phone: '+91 98200 99999',
            address: 'Central Clockwork Administration Tower',
            isVerified: true,
            isBanned: false,
          }).save();
          console.log('[Database] Admin account ready: admin@foodshare.org / password123');
        }
      } catch (seedErr) {
        console.warn('[Database] Admin initialization check:', seedErr.message);
      }

      return conn.connection;
    } catch (error) {
      cachedPromise = null;
      console.error(`[Database] MongoDB Atlas connection error: ${error.message}`);
      throw error;
    }
  }

  // Local fallback (only for offline local development without Atlas)
  const localUri = uri || 'mongodb://127.0.0.1:27017/foodshare_events';
  try {
    cachedPromise = mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 2000,
    });
    const conn = await cachedPromise;
    console.log(`[Database] Local MongoDB connected: ${conn.connection.host}`);
    mock.setInMemoryActive(false);
    return conn.connection;
  } catch (error) {
    cachedPromise = null;
    console.warn(`[Database] Notice: Live MongoDB server not detected at ${localUri} (${error.message}).`);
    console.log(`[Database] Engaging Resilient In-Memory Storage & Demo Engine.`);
    mock.setInMemoryActive(true);
    await mock.seedStore();
  }
};

module.exports = connectDB;
