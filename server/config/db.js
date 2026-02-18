const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // Fail faster if no DB
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to primary DB: ${error.message}`);
    console.log('Attempting to start In-Memory MongoDB as fallback...');

    try {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();

      console.warn('⚠️  WARNING: USING IN-MEMORY DATABASE. DATA WILL BE LOST ON RESTART. ⚠️');
      console.log(`Fallback URI: ${uri}`);

      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected (Fallback): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`Critical Error: Could not start fallback DB either. ${fallbackError.message}`);
      // process.exit(1); // Keep process alive for health check debugging if needed, but app is broken.
    }
  }
};

module.exports = connectDB;
