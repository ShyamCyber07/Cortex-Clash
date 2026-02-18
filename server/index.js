const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const config = require('./config'); // Move config import up
const userRoutes = require('./routes/userRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');

dotenv.config();

connectDB().then(() => {
    require('./seedAdmin')();
});

const http = require('http');
const socket = require('./socket');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socket.init(server);

// Security Headers
app.use(helmet());

// CORS
app.use(cors({
    origin: config.clientUrl,
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
    if (req.body) req.body = mongoSanitize(req.body);
    if (req.params) req.params = mongoSanitize(req.params);
    if (req.query) req.query = mongoSanitize(req.query);
    next();
});

// Data sanitization against XSS
// app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 login/register attempts per hour
    message: 'Too many attempts from this IP, please try again after an hour'
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// Routes
// Routes
const apiPrefix = `/api/${config.apiVersion}`;

app.use(`${apiPrefix}`, require('./routes/healthRoutes'));
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/tournaments`, tournamentRoutes);
app.use(`${apiPrefix}/games`, require('./routes/gameRoutes')); // Add Games Route
app.use(`${apiPrefix}/matches`, require('./routes/matchRoutes'));
app.use(`${apiPrefix}/leaderboard`, require('./routes/leaderboardRoutes')); // Add Leaderboard Route
app.use(`${apiPrefix}/seasons`, require('./routes/seasonRoutes')); // Add Season Route
app.use(`${apiPrefix}/analytics`, require('./routes/analyticsRoutes'));

// Root route for basic verification
app.get('/', (req, res) => {
    res.send(`Cortex Clash API ${config.apiVersion} running...`);
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = config.port;

server.listen(PORT, () => {
    console.log(`Server running in ${config.env} mode on port ${PORT}`);
    console.log(`API accessible at http://localhost:${PORT}${apiPrefix}`);
});
