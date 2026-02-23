const express = require('express');
const dotenv = require('dotenv');
// Load env vars immediately
dotenv.config();

const cors = require('cors');
const http = require('http');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const { RedisStore } = require('rate-limit-redis');
const { logger, requestLogger } = require('./utils/logger');

// Local imports
const connectDB = require('./config/db');
const config = require('./config');
const socket = require('./socket');
const seedAdmin = require('./seedAdmin');
const { seasonQueue } = require('./config/queue');

// Route imports
const userRoutes = require('./routes/userRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const gameRoutes = require('./routes/gameRoutes');
const matchRoutes = require('./routes/matchRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const seasonRoutes = require('./routes/seasonRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const integrityRoutes = require('./routes/integrityRoutes');
const healthRoutes = require('./routes/healthRoutes');
const aiRoutes = require('./routes/aiRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const server = http.createServer(app);

// 1. Trust Proxy (Vital for Render/Heroku to pass correct IP to rate limiter)
app.set("trust proxy", 1);

// 2. Security Headers
app.use(helmet());

// 3. CORS Configuration
const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "";
const allowedOrigins = [
    "http://localhost:5173",            // Local Frontend
    "https://shyamcyber07.github.io",   // Production Frontend
    clientUrl                           // Dynamic via Env Var
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`Blocked CORS for origin: ${origin}`);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true
    })
);



// 4. Body Parsing & Logging
app.use(requestLogger);
app.use(express.json({ limit: '10kb' }));

// Global Database Safety Net - Hard 503 if Mongo disconnects (Protects queues and API)
app.use((req, res, next) => {
    // 1 = connected, 2 = connecting
    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
        return res.status(503).json({ message: 'Service Unavailable: Database offline' });
    }
    next();
});

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
    if (req.body) req.body = mongoSanitize(req.body);
    if (req.params) req.params = mongoSanitize(req.params);
    if (req.query) req.query = mongoSanitize(req.query);
    next();
});

// Prevent parameter pollution
app.use(hpp());

// XSS Protection
app.use(xss());

// 5. Rate Limiting (Redis Backed)
const redisClient = require('redis').createClient({
    url: process.env.REDIS_URL
});
// Handle redis errors silently to prevent API container crashes dropping live queries
redisClient.on('error', (err) => logger.warn('[REDIS LIMITER ERROR] Non-fatal fault: ' + err.message));
redisClient.connect().catch(err => logger.error('[REDIS LIMITER] Initial bind failed: ' + err.message));

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
});
app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 login/register attempts per hour
    message: 'Too many attempts from this IP, please try again after an hour',
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// 6. Socket.io
const io = socket.init(server);

// 6.5 System Protection
const { globalMaintenanceCheck } = require('./middleware/protectionMiddleware');
app.use(globalMaintenanceCheck);

// 7. Routes
const apiPrefix = `/api/${config.apiVersion}`;

app.use(`${apiPrefix}`, healthRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/tournaments`, tournamentRoutes);
app.use(`${apiPrefix}/games`, gameRoutes);
app.use(`${apiPrefix}/matches`, matchRoutes);
app.use(`${apiPrefix}/leaderboard`, leaderboardRoutes);
app.use(`${apiPrefix}/seasons`, seasonRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/integrity`, integrityRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/system`, systemRoutes);

// Root route
app.get('/', (req, res) => {
    res.send(`Cortex Clash API ${config.apiVersion} running...`);
});

// 404 Catch-all
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// 8. Error Handling
app.use((err, req, res, next) => {
    logger.error(`${err.message}`, { stack: err.stack, correlationId: req.correlationId });
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        correlationId: req.correlationId,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// 9. Startup Sequence
const PORT = config.port || 5000;

logger.info('Starting Cortex Clash API Container...');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err.name, msg: err.message, stack: err.stack });
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', { error: err.name, msg: err.message, stack: err.stack });
    process.exit(1);
});


connectDB()
    .then(async () => {
        // Only start server if DB connects
        try {
            await seedAdmin();
        } catch (error) {
            console.error('Warning: Seed Admin failed:', error.message);
        }

        server.listen(PORT, () => {
            logger.info(`Server running in ${config.env} mode on port ${PORT}`);
            logger.info(`API accessible at http://localhost:${PORT}${apiPrefix}`);
            logger.info(`Allowed Origins: ${allowedOrigins.join(', ')}`);
        });

        // Initialize Distributed cron-like interval for automated season rollovers via Redis (checks every hour)
        seasonQueue.add('check-seasons', {}, {
            repeat: {
                pattern: '0 * * * *' // Every hour
            }
        });

        // Set Keep-Alive timeout to be greater than Render's load balancer timeout (60s)
        server.keepAliveTimeout = 120000; // 120 seconds
        server.headersTimeout = 120000; // 120 seconds
    })
    .catch((err) => {
        console.error("FATAL: Failed to connect to Database. Server startup aborted.");
        console.error(err);
        process.exit(1);
    });
