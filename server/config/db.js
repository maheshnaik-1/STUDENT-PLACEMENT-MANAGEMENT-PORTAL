const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI from environment variables or falls back to local instance
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_portal', {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.error('Please ensure MongoDB service is running on your machine (e.g., mongodb://127.0.0.1:27017).');
    process.exit(1);
  }
};

module.exports = connectDB;
