const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const { protect, organizer } = require('../middleware/authMiddleware');
const { deductTournamentEntryFee } = require('../services/escrowService');
const { blockNewTournaments, blockEntryFeeRegistration } = require('../middleware/protectionMiddleware');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
router.get('/', async (req, res, next) => {
    try {
        const tournaments = await Tournament.find()
            .populate('organizer', 'username')
            .populate('game', 'name icon');
        res.json(tournaments);
    } catch (err) {
        next(err);
    }
});

// @desc    Create a tournament
// @route   POST /api/tournaments
// @access  Organizer/Admin
router.post('/', protect, organizer, blockNewTournaments, async (req, res, next) => {
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
        next(err);
    }
});

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
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
        next(err);
    }
});


// @desc    Register for a tournament
// @route   POST /api/tournaments/:id/register
// @access  Private (Player)
router.post('/:id/register', protect, blockEntryFeeRegistration, async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        if (tournament.status !== 'open') {
            return res.status(400).json({ message: 'Tournament functionality is locked or finished' });
        }

        const team = await Team.findOne({ members: req.user._id });
        if (!team) {
            return res.status(400).json({ message: 'You must be in a team to register for a tournament' });
        }
        if (team.captain.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only team captains can register the team for a tournament' });
        }

        if (tournament.participants.some(p => p.toString() === team._id.toString())) {
            return res.status(400).json({ message: 'Team is already registered for this tournament' });
        }

        if (tournament.participants.length >= tournament.maxParticipants) {
            return res.status(400).json({ message: 'Tournament is full' });
        }

        // Deduct entry fee via escrow service
        try {
            await deductTournamentEntryFee(req.user._id, tournament._id);
        } catch (feeError) {
        next(feeError);
    }

        tournament.participants.push(team._id);
        await tournament.save();

        res.status(200).json({ message: 'Successfully registered team for tournament' });
    } catch (err) {
        next(err);
    }
});

// @desc    Start unique tournament (Generate Matches)
// @route   POST /api/tournaments/:id/start
// @access  Organizer/Admin
const { generateMatches } = require('../services/matchmakingService');

router.post('/:id/start', protect, organizer, async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        if (tournament.participants.length < 4) {
            return res.status(400).json({ message: 'Not enough teams to start tournament' });
        }

        const matches = await generateMatches(req.params.id);
        res.status(200).json({ message: 'Tournament started', matches });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
