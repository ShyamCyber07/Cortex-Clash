import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const MatchCard = ({ match, isLast }) => {
    return (
        <div className="relative flex-shrink-0 w-64">
            <Link to={`/matches/${match._id}`} className="block group">
                <div className={`border rounded-lg p-3 bg-slate-800/80 backdrop-blur border-slate-700 shadow-xl 
                    ${match.status === 'completed' ? 'border-emerald-500/50' : match.verificationStatus === 'pending' ? 'border-amber-500/50' : 'border-slate-700'}
                    group-hover:border-indigo-500/80 transition-all cursor-pointer`}>

                    <div className="text-xs text-gray-500 mb-2 flex justify-between">
                        <span>Round {match.round}</span>
                        <span className={match.status === 'ongoing' && match.verificationStatus === 'pending' ? 'text-amber-400' : match.status === 'ongoing' ? 'text-emerald-400' : ''}>
                            {match.verificationStatus === 'pending' ? 'Pending' : match.status}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {/* Player 1 */}
                        <div className={`p-2 rounded flex justify-between items-center 
                            ${match.winner === match.participants[0]?._id ? 'bg-indigo-600/20 text-indigo-200' : 'bg-slate-900'}`}>
                            <span className="truncate text-sm font-medium">
                                {match.participants[0]?.username || 'TBD'}
                            </span>
                            {match.score && <span className="text-xs font-mono">{match.score.split('-')[0]}</span>}
                        </div>

                        {/* Player 2 */}
                        <div className={`p-2 rounded flex justify-between items-center 
                            ${match.winner === match.participants[1]?._id ? 'bg-indigo-600/20 text-indigo-200' : 'bg-slate-900'}`}>
                            <span className="truncate text-sm font-medium">
                                {match.participants[1]?.username || 'TBD'}
                            </span>
                            {match.score && <span className="text-xs font-mono">{match.score.split('-')[1]}</span>}
                        </div>
                    </div>
                </div>
            </Link>

            {!isLast && (
                <div className="absolute top-1/2 -right-8 w-8 h-0.5 bg-slate-700"></div>
            )}
        </div>
    );
};

const BracketView = ({ tournament }) => {
    const scrollRef = useRef(null);
    const { scrollXProgress } = useScroll({ container: scrollRef });
    const opacity = useTransform(scrollXProgress, [0, 0.1], [0, 1]);

    // Local state for socket updates
    const [matches, setMatches] = useState(tournament.matches || []);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.on('match_update', (updatedMatch) => {
                setMatches(prevMatches =>
                    prevMatches.map(m => m._id === updatedMatch._id ? updatedMatch : m)
                );
            });
            // We could also listen for 'tournament_update' to refetch everything, 
            // but for match status updates this is enough.
        }
        return () => {
            if (socket) socket.off('match_update');
        }
    }, [socket]);


    // Group matches by round
    const rounds = {};
    if (matches) {
        matches.forEach(match => {
            if (!rounds[match.round]) rounds[match.round] = [];
            rounds[match.round].push(match);
        });
    }

    const roundKeys = Object.keys(rounds).sort((a, b) => a - b);

    if (!matches || matches.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 bg-slate-800/20 rounded-lg">
                Bracket will be generated when the tournament starts.
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Tournament Bracket</h3>
                <div className="text-sm text-gray-400 flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    Live Updates
                </div>
            </div>

            <div
                ref={scrollRef}
                className="overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-slate-800"
            >
                <div className="flex gap-16 min-w-max px-4">
                    {roundKeys.map((round, rIndex) => (
                        <div key={round} className="flex flex-col justify-around gap-8">
                            <h4 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                                Round {round}
                            </h4>
                            {rounds[round].map((match, mIndex) => (
                                <MatchCard
                                    key={match._id}
                                    match={match}
                                    isLast={rIndex === roundKeys.length - 1}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BracketView;
