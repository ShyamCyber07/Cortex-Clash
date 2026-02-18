const validateMatchResult = (game, participants, submission) => {
    const { winnerId, score, result } = submission;

    if (!game) throw new Error('Game configuration not found');

    /* 
       Format of 'result' expected from frontend:
       - win-loss: { winnerId }
       - round-based: { scores: { [participantId]: number } }
       - points-based: { scores: { [participantId]: { rank: number, kills: number, points: number } } }
    */

    switch (game.scoringType) {
        case 'win-loss':
            if (!winnerId) throw new Error('Winner must be selected');
            if (!participants.includes(winnerId)) throw new Error('Invalid winner selected');
            return {
                winner: winnerId,
                score: 'Win', // Simple display
                result: { manualWinner: true }
            };

        case 'round-based':
            if (!result || !result.scores) throw new Error('Scores are required for round-based games');

            // Validate score entries
            let highScore = -1;
            let computedWinner = null;
            let scoreStringParts = [];

            // Sort participants to ensure consistent score string order (e.g. Host - Guest)
            // But we might just iterate.
            participants.forEach(pId => {
                const s = result.scores[pId];
                if (typeof s !== 'number' || s < 0) throw new Error('Invalid score value');
                scoreStringParts.push(s);

                if (s > highScore) {
                    highScore = s;
                    computedWinner = pId;
                } else if (s === highScore) {
                    computedWinner = null; // Draw
                }
            });

            if (!computedWinner) throw new Error('Draws are not supported, play overtime');

            return {
                winner: computedWinner,
                score: scoreStringParts.join('-'),
                result: result // save full structure
            };

        case 'points-based':
            // E.g. Battle Royale logic or Kill Race
            if (!result || !result.scores) throw new Error('Stats are required');

            let maxPoints = -1;
            let pointsWinner = null;

            participants.forEach(pId => {
                const stats = result.scores[pId]; // { kills, rank, score }
                // Calculate derived score if needed, or trust submitted score
                // Simple implementation: Trust 'score' field in stats
                const finalScore = stats.score || (stats.kills * 1 + (20 - stats.rank)); // Example formula

                if (finalScore > maxPoints) {
                    maxPoints = finalScore;
                    pointsWinner = pId;
                }
            });

            return {
                winner: pointsWinner,
                score: `Points: ${maxPoints}`,
                result: result
            };

        default:
            // Default to manual winner selection behavior
            if (!winnerId) throw new Error('Winner must be selected');
            return { winner: winnerId, score: 'Win', result: {} };
    }
};

module.exports = { validateMatchResult };
