const dotenv = require('dotenv');

// Load env vars if not already loaded
dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    apiVersion: 'v1'
};

// Validation
if (!config.mongoUri) {
    console.error('FATAL: MONGO_URI is not defined.');
    process.exit(1);
}

if (!config.jwtSecret) {
    console.warn('WARNING: JWT_SECRET is not defined. Using default (unsafe for production).');
    config.jwtSecret = 'default_secret_unsafe';
}

module.exports = config;
