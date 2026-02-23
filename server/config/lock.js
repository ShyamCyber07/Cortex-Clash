const Redis = require('ioredis');
const Redlock = require('redlock').default;

// Retrieve URL directly from Environment so we don't circular-depend on queue.js if queue.js needs redlock later
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const lockClient = new Redis(redisUrl);

const redlock = new Redlock(
    [lockClient],
    {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500
    }
);

redlock.on("clientError", (err) => {
    console.error("[REDLOCK] Redis Error:", err);
});

module.exports = { redlock };
