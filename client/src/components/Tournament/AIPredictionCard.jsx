import React from 'react';
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const AIPredictionCard = ({ prediction, player1Name, player2Name }) => {
    if (!prediction) return null;

    const { win_probability = 0.5, confidence_score = 0, risk_level = 'LOW', is_fallback = false, predicted_winner } = prediction;

    // Determine colors based on risk
    const riskColors = {
        LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        HIGH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    };

    const riskColorClass = riskColors[risk_level] || riskColors.LOW;

    // Derived values
    const winPercentage = (win_probability * 100).toFixed(1);
    const p2Percentage = ((1 - win_probability) * 100).toFixed(1);
    const confidencePercentage = (confidence_score * 100).toFixed(0);
    const winnerName = predicted_winner === 'p1' ? player1Name : player2Name;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-indigo-500/20 overflow-hidden"
        >
            {/* Header Area */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-indigo-300 font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Cortex AI Prediction
                </h3>

                <div className="flex gap-2">
                    {is_fallback && (
                        <div className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 font-semibold shadow-sm">
                            <AlertTriangle className="w-3 h-3" /> Fallback Mode (Elo)
                        </div>
                    )}
                    <div className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold tracking-wide ${riskColorClass}`}>
                        {risk_level === 'HIGH' && <TrendingUp className="w-3 h-3" />}
                        Risk: {risk_level}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 relative">
                {/* Names and Probabilities */}
                <div className="flex justify-between items-end mb-2 text-sm font-medium">
                    <div className="text-slate-300">
                        {player1Name} <span className="text-slate-500">({winPercentage}%)</span>
                    </div>
                    <div className="text-slate-300">
                        <span className="text-slate-500">({p2Percentage}%)</span> {player2Name}
                    </div>
                </div>

                {/* Probability Bar */}
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex relative mb-6 border border-slate-700">
                    {/* Separator Line for exactly 50% */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-900 z-10" />

                    <motion.div
                        initial={{ width: '50%' }}
                        animate={{ width: `${winPercentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                    />
                    <motion.div
                        initial={{ width: '50%' }}
                        animate={{ width: `${p2Percentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-slate-700"
                    />
                </div>

                {/* Extra Stats Layer */}
                <div className="flex flex-col sm:flex-row justify-between text-sm text-slate-400 gap-4 mt-2">
                    <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <span className="font-semibold text-slate-300">Confidence:</span>
                        <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${confidencePercentage}%` }}
                                className={`h-full ${risk_level === 'HIGH' ? 'bg-emerald-500' : risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'}`}
                            />
                        </div>
                        <span className="text-xs">{confidencePercentage}%</span>
                    </div>

                    <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <span className="font-semibold text-slate-300">Predicted Winner:</span>
                        <span className="ml-2 font-bold text-indigo-400 capitalize bg-indigo-500/10 px-2 py-0.5 rounded">
                            {winnerName}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AIPredictionCard;
