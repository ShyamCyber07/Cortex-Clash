const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const emailLower = email.toLowerCase();
        const userExists = await User.findOne({ email: emailLower });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ username, email: emailLower, password });

        // Generate Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            stats: user.stats,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const emailLower = email.toLowerCase();
        console.log(`[LOGIN ATTEMPT] Email: ${emailLower}`);

        const user = await User.findOne({ email: emailLower });

        if (!user) {
            console.log(`[LOGIN FAIL] User not found: ${emailLower}`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log(`[LOGIN FOUND] User: ${user.email}, Role: ${user.role}, Hash: ${user.password}`);

        const isMatch = await user.matchPassword(password);
        console.log(`[LOGIN CHECK] Password match for ${emailLower}: ${isMatch}`);

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                stats: user.stats,
                token
            });
        } else {
            console.log(`[LOGIN FAIL] Password mismatch for: ${emailLower}`);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(`[LOGIN ERROR] ${error.message}`);
        res.status(500).json({ message: error.message });
    }
});

const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all users (Admin)
// @route   GET /api/v1/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update user role (Admin)
// @route   PUT /api/v1/users/:id/role
// @access  Private/Admin
router.put('/:id/role', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.role = req.body.role || user.role;
        await user.save();
        res.json({ message: 'User role updated', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get Flagged Users (Integrity)
// @route   GET /api/v1/users/flagged
// @access  Private/Admin
router.get('/flagged', protect, admin, async (req, res) => {
    try {
        // Find users where integrity.isFlagged is true OR integrity.suspicionScore > 0
        const users = await User.find({
            $or: [
                { 'integrity.isFlagged': true },
                { 'integrity.suspicionScore': { $gt: 20 } } // Show those approaching threshold too
            ]
        }).select('-password').sort({ 'integrity.suspicionScore': -1 });

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
