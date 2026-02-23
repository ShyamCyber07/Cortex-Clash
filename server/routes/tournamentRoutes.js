const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const { protect, organizer } = require('../middleware/authMiddleware');
const { deductTournamentEntryFee } = require('../services/escrowService');
const { blockNewTournaments, blockEntryFeeRegistration } = require('../middleware/protectionMiddleware');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find()
            .populate('organizer', 'username')
            .populate('game', 'name icon');
        res.json(tournaments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Create a tournament
// @route   POST /api/tournaments
// @access  Organizer/Admin
router.post('/', protect, organizer, blockNewTournaments, async (req, res) => {
    const { name, description, game, matchFormat, format, startDate, endDate, rules } = req.body;

    const tournament = new Tournament({
        name,
        description,
        organizer: req.user._id,
        game,
        matchFormat,
        format,
        startDate,
        endDate,
        rules,
        entryFee: req.body.entryFee || 0,
        basePrizePool: req.body.basePrizePool || 0
    });

    try {
        const createdTournament = await tournament.save();
        res.status(201).json(createdTournament);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('organizer', 'username email')
            .populate('game') // Populate Game details
            .populate({
                path: 'matches',
                populate: { path: 'participants winner' }
            });

        if (tournament) {
            res.json(tournament);
        } else {
            res.status(404).json({ message: 'Tournament not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// @desc    Register for a tournament
// @route   POST /api/tournaments/:id/register
// @access  Private (Player)
router.post('/:id/register', protect, blockEntryFeeRegistration, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (tournament.status !== 'upcoming') {
            return res.status(400).json({ message: 'Tournament functionality is locked or finished' });
        }

        if (tournament.participants.includes(req.user._id)) {
            return res.status(400).json({ message: 'User already registered' });
        }

        if (tournament.participants.length >= tournament.maxParticipants) {
            return res.status(400).json({ message: 'Tournament is full' });
        }

        // Deduct entry fee via escrow service
        try {
            await deductTournamentEntryFee(req.user._id, tournament._id);
        } catch (feeError) {
            return res.status(402).json({ message: feeError.message });
        }

        tournament.participants.push(req.user._id);
        await tournament.save();

        res.status(200).json({ message: 'Successfully registered for tournament' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Start unique tournament (Generate Matches)
// @route   POST /api/tournaments/:id/start
// @access  Organizer/Admin
const { generateMatches } = require('../services/matchmakingService');

router.post('/:id/start', protect, organizer, async (req, res) => {
    try {
        const matches = await generateMatches(req.params.id);
        res.status(200).json({ message: 'Tournament started', matches });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
