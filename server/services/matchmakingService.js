const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

const generateMatches = async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId).populate('participants');
    if (!tournament) throw new Error('Tournament not found');

    if (tournament.participants.length < 2) {
        throw new Error('Not enough participants to start tournament');
    }

    // Shuffle participants randomly
    const shuffledTeams = [...tournament.participants].sort(() => Math.random() - 0.5);

    const matches = [];

    // Pair teams
    for (let i = 0; i < shuffledTeams.length; i += 2) {
        // If there's an odd team out at the end, they get a BYE (no match created)
        if (i + 1 >= shuffledTeams.length) {
            break;
        }

        const teamA = shuffledTeams[i];
        const teamB = shuffledTeams[i + 1];

        const match = new Match({
            tournament: tournament._id,
            round: 1,
            teamA: teamA._id,
            teamB: teamB._id,
            status: 'scheduled',
            startTime: new Date()
        });

        matches.push(match);
    }

    // Save all matches
    const savedMatches = await Promise.all(matches.map(m => m.save()));

    // Update tournament with matches and change status
    tournament.matches = savedMatches.map(m => m._id);
    tournament.status = 'ongoing';
    await tournament.save();

    return savedMatches;
};

module.exports = { generateMatches };
