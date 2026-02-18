const express = require('express');
const router = express.Router();
const Season = require('../models/Season');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get All Seasons
// @route   GET /api/v1/seasons
// @access  Public
router.get('/', async (req, res) => {
    try {
        const seasons = await Season.find().sort({ startDate: -1 });
        res.json(seasons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get Active Season
// @route   GET /api/v1/seasons/active
// @access  Public
router.get('/active', async (req, res) => {
    try {
        const season = await Season.findOne({ isActive: true });
        if (!season) return res.status(404).json({ message: 'No active season found' });
        res.json(season);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create Season
// @route   POST /api/v1/seasons
// @access  Private (Admin)
router.post('/', protect, admin, async (req, res) => {
    const { name, startDate, endDate, isActive, games, rules } = req.body;
    try {
        const season = await Season.create({
            name,
            startDate,
            endDate,
            isActive,
            games,
            rules
        });
        res.status(201).json(season);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Seed Initial Season
// @route   POST /api/v1/seasons/seed
// @access  Private (Admin)
router.post('/seed', protect, admin, async (req, res) => {
    try {
        const existing = await Season.countDocuments();
        if (existing > 0) return res.status(400).json({ message: 'Seasons already exist' });

        const Game = require('../models/Game');
        const games = await Game.find();

        await Season.create({
            name: 'Season 1: Genesis',
            description: 'The inaugural season of Cortex Clash.',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isActive: true,
            games: games.map(g => g._id),
            rules: 'Standard competitive rules apply.'
        });

        res.status(201).json({ message: 'Season 1 created' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update Season
// @route   PUT /api/v1/seasons/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const season = await Season.findById(req.params.id);
        if (!season) return res.status(404).json({ message: 'Season not found' });

        Object.assign(season, req.body);
        await season.save();
        res.json(season);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Delete Season
// @route   DELETE /api/v1/seasons/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const season = await Season.findById(req.params.id);
        if (!season) return res.status(404).json({ message: 'Season not found' });

        await season.deleteOne();
        res.json({ message: 'Season removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
