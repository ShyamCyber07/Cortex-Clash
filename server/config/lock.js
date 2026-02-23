const Redlock = require('redlock').default;
const { redisConnection } = require('./queue');

const redlock = new Redlock(
    [redisConnection],
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
