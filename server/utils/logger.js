const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, errors, splat, colorize, printf } = format;

// Structured console log formatting
const consoleFormat = printf(({ level, message, timestamp, correlationId, stack, ...metadata }) => {
    let log = `[${timestamp}] ${level}: `;
    if (correlationId) log += `[${correlationId}] `;
    log += `${message}`;
    if (stack) log += `\n${stack}`;
    if (Object.keys(metadata).length > 0) log += ` ${JSON.stringify(metadata)}`;
    return log;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info', // e.g. 'debug', 'info', 'warn', 'error'
    format: combine(
        timestamp(),
        errors({ stack: true }),
        splat(),
        json() // Outputs pure JSON structure suitable for Datadog / ELK
    ),
    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                consoleFormat // Overrides nested JSON purely for readability locally
            )
        })
    ],
    // Automatically catch uncaught exceptions and unhandled rejections
    exitOnError: false
});

// Polyfill correlation contexts from incoming express requests
const requestLogger = (req, res, next) => {
    const { v4: uuidv4 } = require('uuid');
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('x-correlation-id', req.correlationId);

    const start = Date.now();

    res.on('finish', () => {
        const ms = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        // Mute healthcheck logs heavily
        if (req.originalUrl.includes('/system/') && level === 'info') return;

        logger.log(level, `HTTP ${req.method} ${req.originalUrl} - ${res.statusCode} [${ms}ms]`, {
            correlationId: req.correlationId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            latency: ms,
            ip: req.ip
        });
    });

    next();
};

module.exports = { logger, requestLogger };
