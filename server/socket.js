let io;

module.exports = {
    init: (httpServer) => {
        io = require('socket.io')(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || '*',
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join_match', (matchId) => {
                socket.join(`match_${matchId}`);
                console.log(`Socket ${socket.id} joined match_${matchId}`);
            });

            socket.on('leave_match', (matchId) => {
                socket.leave(`match_${matchId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
