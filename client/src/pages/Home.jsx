import { Share2, Zap, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="relative pt-20">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background Elements */}
                {/* Placeholder background - in production replace with optimized asset or generated image */}
                <div className="absolute inset-0 bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 z-0"></div>
                    {/* Abstract shapes */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="mb-8 inline-block"
                    >
                        <span className="px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-semibold tracking-wider uppercase">
                            The Future of Esports
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-6xl md:text-8xl font-display font-black tracking-tighter mb-6 leading-tight"
                    >
                        WIN YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">MIND</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
                    >
                        Cortex Clash is the intelligent tournament platform.
                        Smart matchmaking, real-time analytics, and dynamic rankings powered by AI.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center"
                    >
                        <StartCompetingButton />
                        <Link to="/tournaments" className="px-8 py-4 rounded-xl font-bold text-lg tracking-wide border border-white/10 hover:bg-white/5 transition-colors backdrop-blur-sm hover:border-white/20 flex items-center justify-center text-white">
                            Explore Tournaments
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Engineered for Excellence</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Build your legacy with tools designed for professional competitor management.</p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        <FeatureCard
                            icon={<Zap className="w-8 h-8 text-yellow-400" />}
                            title="Real-Time Analytics"
                            description="Track every click, every move. Our AI processes match data instantly to give you actionable insights."
                        />
                        <FeatureCard
                            icon={<Target className="w-8 h-8 text-red-400" />}
                            title="Smart Matchmaking"
                            description="Stop stomping noobs or getting crushed. Play against opponents that match your true skill level."
                        />
                        <FeatureCard
                            icon={<Share2 className="w-8 h-8 text-blue-400" />}
                            title="Dynamic Rankings"
                            description="ELO is outdated. Our multidimensional ranking system evolves with your playstyle and consistency."
                        />
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="glass-card hover:bg-slate-800/80 transition-colors group cursor-default">
        <div className="bg-slate-700/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 mesh-gradient">
            {icon}
        </div>
        <h3 className="text-xl font-bold font-display mb-4 text-white group-hover:text-indigo-400 transition-colors">{title}</h3>
        <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
            {description}
        </p>
    </div>
);

const StartCompetingButton = () => {
    const { user } = useAuth();
    return (
        <Link
            to={user ? "/dashboard" : "/signup"}
            className="btn-primary px-8 py-4 rounded-xl font-bold text-lg tracking-wide shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
            <Zap className="w-5 h-5" /> Start Competing
        </Link>
    );
};

export default Home;
