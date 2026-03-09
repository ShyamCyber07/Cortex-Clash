const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401);
            throw new Error("Not authorized");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        next();
    } catch (err) {
        next(err);
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const organizer = (req, res, next) => {
    if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an organizer' });
    }
};

module.exports = { protect, admin, organizer };
