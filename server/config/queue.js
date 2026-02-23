const { Queue } = require('bullmq');

// Redis Connection configuration
const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetriesPerRequest: null, // Required by BullMQ
};

// Create queues
const rankingQueue = new Queue('ranking-updates', { connection: redisConfig, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const integrityQueue = new Queue('integrity-analysis', { connection: redisConfig, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const aiMetricsQueue = new Queue('ai-metrics', { connection: redisConfig, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
const seasonQueue = new Queue('season-rollover', { connection: redisConfig });
const tournamentQueue = new Queue('tournament-advancement', { connection: redisConfig, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } } });
const systemQueue = new Queue('system-state', { connection: redisConfig });

module.exports = {
    redisConfig,
    rankingQueue,
    integrityQueue,
    aiMetricsQueue,
    seasonQueue,
    tournamentQueue,
    systemQueue
};
