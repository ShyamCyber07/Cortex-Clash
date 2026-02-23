const dotenv = require('dotenv');

// Load env vars if not already loaded
dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    mlServiceUrl: process.env.ML_SERVICE_URL,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    apiVersion: 'v1'
};

// Validation
if (!config.mongoUri) {
    console.error('FATAL: MONGO_URI is not defined.');
    process.exit(1);
}

if (!config.jwtSecret) {
    console.error('FATAL: JWT_SECRET is not defined.');
    process.exit(1);
}

if (!config.mlServiceUrl) {
    console.error('FATAL: ML_SERVICE_URL is not defined.');
    process.exit(1);
}

module.exports = config;
