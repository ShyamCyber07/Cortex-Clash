import { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, AlertOctagon, Activity, Database, ServerCrash, Zap, CreditCard, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const RiskConsole = () => {
    const [metrics, setMetrics] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [systemState, setSystemState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRiskData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [metricsRes, riskRes, stateRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/v1/system/metrics`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/v1/system/risk`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/v1/system/state`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (metricsRes.ok && riskRes.ok && stateRes.ok) {
                    setMetrics(await metricsRes.json());
                    setRiskData(await riskRes.json());
                    setSystemState(await stateRes.json());
                }
            } catch (err) {
                console.error("Failed to fetch risk console data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRiskData();
        const interval = setInterval(fetchRiskData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const getSeverityColor = (value, thresholds) => {
        if (value >= thresholds.red) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (value >= thresholds.yellow) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    const getBadgeColor = (value, thresholds) => {
        if (value >= thresholds.red) return 'bg-red-500';
        if (value >= thresholds.yellow) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white font-display">Loading Risk Data...</div>;
    }

    if (!metrics || !riskData) {
        return <div className="min-h-screen flex items-center justify-center text-red-400 font-display">Failed to load risk data</div>;
    }

    // Alert threshold constants
    const THRESHOLDS = {
        suspicionScore: { yellow: 5, red: 15 }, // suspicious users 
        duplicateLedgers: { yellow: 2, red: 10 },
        failedPayouts: { yellow: 1, red: 5 },
        queueRetries: { yellow: 15, red: 50 },
        queueGrowth: { yellow: 3.0, red: 10.0 }
    };

    return (
        <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                        Operational Risk Console
                    </h1>
                    <p className="text-gray-400 mt-2">Monitor economic health, system degradation, and platform risk markers.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-300">Live Telemetry Active</span>
                </div>
            </div>

            {systemState && (
                <div className={`mb-8 p-6 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${systemState.state === 'CRITICAL' ? 'bg-red-500/20 border-red-500 text-red-100' :
                        systemState.state === 'DEGRADED' ? 'bg-amber-500/20 border-amber-500 text-amber-100' :
                            'bg-emerald-500/20 border-emerald-500 text-emerald-100'
                    }`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xl uppercase tracking-wider">SYSTEM {systemState.state}</span>
                        </div>
                        <p className="opacity-90">{systemState.reason}</p>
                    </div>
                    {systemState.state !== 'NORMAL' && (
                        <div className="px-4 py-2 bg-black/30 rounded-lg text-sm font-bold whitespace-nowrap">
                            {systemState.state === 'CRITICAL' ? 'All Writes Frozen' : 'Tournaments Locked'}
                        </div>
                    )}
                </div>
            )}

            {/* Top Level Risk Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-xl border ${getSeverityColor(riskData.duplicateLedgerAttempts, THRESHOLDS.duplicateLedgers)}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Database className="h-5 w-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Ledger Conflicts</h3>
                    </div>
                    <div className="text-3xl font-bold">{riskData.duplicateLedgerAttempts}</div>
                    <div className="text-xs mt-2 opacity-80">Idempotency rejections (24h)</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`p-6 rounded-xl border ${getSeverityColor(riskData.failedPayoutAttempts, THRESHOLDS.failedPayouts)}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="h-5 w-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Failed Payouts</h3>
                    </div>
                    <div className="text-3xl font-bold">{riskData.failedPayoutAttempts}</div>
                    <div className="text-xs mt-2 opacity-80">Prize distribution failures (24h)</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`p-6 rounded-xl border ${getSeverityColor(metrics.queueRetryVolume, THRESHOLDS.queueRetries)}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <ServerCrash className="h-5 w-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Queue Retries</h3>
                    </div>
                    <div className="text-3xl font-bold">{metrics.queueRetryVolume}</div>
                    <div className="text-xs mt-2 opacity-80">Total retries across all queues</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`p-6 rounded-xl border ${getSeverityColor(riskData.queueBacklogGrowthRate, THRESHOLDS.queueGrowth)}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Backlog Growth</h3>
                    </div>
                    <div className="text-3xl font-bold">{riskData.queueBacklogGrowthRate}%</div>
                    <div className="text-xs mt-2 opacity-80">Growth rate per hour</div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Economic Health */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-400" /> Economic Health
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-gray-400">Total CRX Circulation</span>
                                <span className="text-2xl font-bold text-white">{metrics.totalCrxCirculation?.toLocaleString() || 0} CRX</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">24h Inflow</span>
                                <span className="text-xl font-bold text-white">+{metrics.crxInflow24h?.toLocaleString() || 0}</span>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">24h Outflow</span>
                                <span className="text-xl font-bold text-white">-{metrics.crxOutflow24h?.toLocaleString() || 0}</span>
                            </div>
                        </div>

                        <div>
                            <span className="text-sm font-medium text-gray-400 block mb-3">Top 5 Wallet Balances</span>
                            <div className="space-y-2">
                                {metrics.topWallets?.slice(0, 5).map((wallet, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-800/50">
                                        <span className="text-sm text-gray-300 flex items-center gap-2">
                                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                                            {wallet.username}
                                        </span>
                                        <span className="text-sm font-bold text-indigo-400">{wallet.walletBalance} CRX</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Degradation */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-indigo-400" /> System Degradation Markers
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                            <div>
                                <h4 className="text-white font-bold text-sm">Worker Memory Usage Tracker</h4>
                                <p className="text-xs text-gray-400 mt-1">Redis Queue Memory Allocation</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-indigo-400">{metrics.redisMemory}</span>
                                <p className="text-xs text-gray-500 mt-1">Status: Stable</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                            <h4 className="text-white font-bold text-sm mb-4">Risk Severity Overview</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Suspicion Trends ({riskData.suspicionScoreTrend} users)</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-1.5 line-clamp-1">
                                        <div className={`h-1.5 rounded-full ${getBadgeColor(riskData.suspicionScoreTrend, THRESHOLDS.suspicionScore)}`} style={{ width: `${Math.min(100, (riskData.suspicionScoreTrend / THRESHOLDS.suspicionScore.red) * 100)}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Queue Degradation</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-1.5 line-clamp-1">
                                        <div className={`h-1.5 rounded-full ${getBadgeColor(riskData.queueBacklogGrowthRate, THRESHOLDS.queueGrowth)}`} style={{ width: `${Math.min(100, (riskData.queueBacklogGrowthRate / THRESHOLDS.queueGrowth.red) * 100)}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Escrow Sync Status</span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-1.5 line-clamp-1">
                                        <div className={`h-1.5 rounded-full ${getBadgeColor(riskData.failedPayoutAttempts, THRESHOLDS.failedPayouts)}`} style={{ width: `${Math.min(100, (riskData.failedPayoutAttempts / THRESHOLDS.failedPayouts.red) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default RiskConsole;
