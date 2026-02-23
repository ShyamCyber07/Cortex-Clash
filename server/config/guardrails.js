/**
 * Production and Operational Guardrails
 * Constants defining safety caps and scaling bounds across Cortex Clash
 */
const GUARDRAILS = {
    ECONOMY: {
        MAX_ENTRY_FEE: 10000,           // Maximum CRX cost to enter a single tournament
        MAX_PRIZE_PAYOUT: 500000,       // Max total CRX distributed at finale
        MAX_DAILY_TRANSFER: 20000       // Max CRX a user can spend/transfer in 24h
    },
    TOURNAMENT: {
        MAX_PARTICIPANTS: 1024,         // Theoretical memory/computation bound for bracket iteration
        MIN_PARTICIPANTS: 2
    },
    INTEGRITY: {
        MAX_SUSPICION_DELTA: 30         // Maximum suspicion score increase per single match
    },
    QUEUES: {
        MAX_RETRIES: 5,                 // Absolute maximum backoff retries before DLQ
        ALERT_BACKLOG_DEPTH: 500,       // Queue depth threshold for critical page
        ALERT_FAILED_COUNT: 20          // Total failed jobs before triggering incident response
    },
    SYSTEM: {
        WORKER_HEARTBEAT_TIMEOUT_MS: 300000, // 5 minutes without pulse = dead
        MAX_503_ERROR_RATE_PERCENT: 5        // Threshold for HTTP layer alerting
    },
    PROTECTION: {
        // Hysteresis Bounds
        DEGRADED_QUEUE_DEPTH_ENTER: 500,
        NORMAL_QUEUE_DEPTH_RETURN: 350,
        CRITICAL_FAILED_JOBS_ENTER: 50,
        DEGRADED_FAILED_JOBS_RETURN: 20,

        // Static marker rules
        DEGRADED_SUSPICION_SPIKE: 5,
        CRITICAL_SUSPICION_SPIKE: 15,
        DEGRADED_LEDGER_CONFLICTS: 2,
        CRITICAL_LEDGER_CONFLICTS: 10,
        DEGRADED_FAILED_PAYOUTS: 1,
        CRITICAL_FAILED_PAYOUTS: 5
    }
};

module.exports = GUARDRAILS;
