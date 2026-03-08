const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect } = require('../middleware/authMiddleware');

// @desc    Create a new team
// @route   POST /api/v1/teams/create
// @access  Private (Logged-in User)
router.post('/create', protect, async (req, res, next) => {
    try {
        const { name, maxMembers } = req.body;

        // Prevent user from creating multiple teams if already a captain
        const existingTeam = await Team.findOne({ captain: req.user._id });
        if (existingTeam) {
            return res.status(400).json({ message: 'You are already captain of a team' });
        }

        const team = new Team({
            name,
            captain: req.user._id,
            members: [req.user._id],
            maxMembers: maxMembers || 4
        });

        const createdTeam = await team.save();
        res.status(201).json({
            _id: createdTeam._id,
            name: createdTeam.name,
            inviteCode: createdTeam.inviteCode,
            captain: createdTeam.captain,
            members: createdTeam.members,
            maxMembers: createdTeam.maxMembers
        });
    } catch (err) {
        next(err);
    }
});

// @desc    Join an existing team via invite code
// @route   POST /api/v1/teams/join
// @access  Private
router.post('/join', protect, async (req, res, next) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) {
            return res.status(400).json({ message: 'Invite code is required' });
        }

        const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!team) {
            return res.status(404).json({ message: 'Invalid invite code or team not found' });
        }

        if (team.members.length >= team.maxMembers) {
            return res.status(400).json({ message: 'Team is already full' });
        }

        if (team.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(400).json({ message: 'You are already a member of this team' });
        }

        team.members.push(req.user._id);
        await team.save();

        res.status(200).json({ message: 'Successfully joined team', team });
    } catch (err) {
        next(err);
    }
});

// @desc    Get the current user's team
// @route   GET /api/v1/teams/my-team
// @access  Private
router.get('/my-team', protect, async (req, res, next) => {
    try {
        const team = await Team.findOne({ members: req.user._id })
            .populate('captain', 'username')
            .populate('members', 'username');

        if (!team) {
            return res.status(404).json({ message: 'You are not fully part of any team' });
        }
        res.status(200).json(team);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
