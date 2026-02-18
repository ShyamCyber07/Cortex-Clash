const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Get all games
router.get('/', async (req, res) => {
    try {
        const games = await Game.find({ enabled: true }).sort({ name: 1 });
        res.json(games);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const { protect, admin } = require('../middleware/authMiddleware');

// Seed games (optional, good for dev setup)
router.post('/seed', protect, admin, async (req, res) => {
    try {
        const games = [
            {
                name: 'Valorant',
                slug: 'valorant',
                description: 'Tactical 5v5 character-based shooter.',
                supportedFormats: ['5v5'],
                maxPlayersPerTeam: 5,
                scoringType: 'round-based',
                defaultRules: 'Best of 24 rounds, first to 13 wins.'
            },
            {
                name: 'Counter-Strike 2',
                slug: 'cs2',
                description: 'Tactical shooter sequel to CS:GO.',
                supportedFormats: ['5v5', '1v1', '2v2'],
                maxPlayersPerTeam: 5,
                scoringType: 'round-based',
                defaultRules: 'MR12 setup.'
            },
            {
                name: 'PUBG Mobile',
                slug: 'pubg-mobile',
                description: 'Battery Royale mobile game.',
                supportedFormats: ['Battle Royale', 'Squad', 'Duo', 'Solo'],
                maxPlayersPerTeam: 4,
                scoringType: 'points-based',
                defaultRules: 'Survival + Kill Points.'
            },
            {
                name: 'Free Fire',
                slug: 'free-fire',
                description: 'Fast-paced battle royale.',
                supportedFormats: ['Battle Royale', 'Squad', 'Solo'],
                maxPlayersPerTeam: 4,
                scoringType: 'points-based',
                defaultRules: 'Points for placement and kills.'
            },
            {
                name: 'League of Legends',
                slug: 'lol',
                description: 'Multiplayer Online Battle Arena.',
                supportedFormats: ['5v5'],
                maxPlayersPerTeam: 5,
                scoringType: 'win-loss',
                defaultRules: 'Destroy original nexus.'
            },
            {
                name: 'Dota 2',
                slug: 'dota2',
                description: 'Deep and complex MOBA.',
                supportedFormats: ['5v5'],
                maxPlayersPerTeam: 5,
                scoringType: 'win-loss',
                defaultRules: 'Destroy the Ancient.'
            }
        ];

        // Upsert logic
        for (const game of games) {
            await Game.findOneAndUpdate({ slug: game.slug }, game, { upsert: true, new: true });
        }
        res.status(201).json({ message: 'Games seeded successfully' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create a new game
// @route   POST /api/v1/games
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, slug, description, supportedFormats, maxPlayersPerTeam, scoringType, defaultRules, icon, banner } = req.body;
        const game = await Game.create({
            name,
            slug,
            description,
            supportedFormats,
            maxPlayersPerTeam,
            scoringType,
            defaultRules,
            icon,
            banner
        });
        res.status(201).json(game);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Update a game
// @route   PUT /api/v1/games/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) return res.status(404).json({ message: 'Game not found' });

        Object.assign(game, req.body);
        await game.save();
        res.json(game);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Delete a game
// @route   DELETE /api/v1/games/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) return res.status(404).json({ message: 'Game not found' });

        await game.deleteOne();
        res.json({ message: 'Game removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
