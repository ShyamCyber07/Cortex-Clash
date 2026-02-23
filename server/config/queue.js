const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// 1. & 3. Throw a fatal error if REDIS_URL is missing
if (!process.env.REDIS_URL) {
    console.error('FATAL: REDIS_URL missing');
    process.exit(1);
}

// 2. Ensure Redis initializes ONLY using REDIS_URL exactly
const redisConnection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
});

// Create queues
const rankingQueue = new Queue('ranking-updates', { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const integrityQueue = new Queue('integrity-analysis', { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const aiMetricsQueue = new Queue('ai-metrics', { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const seasonQueue = new Queue('season-rollover', { connection: redisConnection });
const tournamentQueue = new Queue('tournament-advancement', { connection: redisConnection, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } });
const systemQueue = new Queue('system-state', { connection: redisConnection });

module.exports = {
    redisConnection, // 4. Shared specific connection mapped centrally
    rankingQueue,
    integrityQueue,
    aiMetricsQueue,
    seasonQueue,
    tournamentQueue,
    systemQueue
};
