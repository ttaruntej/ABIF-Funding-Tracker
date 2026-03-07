import React, { useState, useEffect } from 'react';

const StatsBoard = ({ stats, marketSentiment }) => {
    // Handling both legacy string briefing and new structured object briefing
    const briefing = typeof stats.briefing === 'object' ? stats.briefing : {
        summary: stats.briefing || "Gathering insights...",
        insights: [],
        highlight: null,
        status: 'active'
    };

    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Active Opportunities Card */}
            <div className={`bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl text-center transition-all duration-500 hover:-translate-y-1 hover:border-blue-400/50 dark:hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] group ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                    <span className="text-blue-500 dark:text-blue-400">🔥</span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Funding Mandates</p>
                <div className="flex flex-col items-center">
                    <h2 className="text-4xl font-bold bg-gradient-to-br from-blue-300 to-blue-600 bg-clip-text text-transparent leading-tight">{stats.active}</h2>
                    <div className={`mt-2 px-2.5 py-0.5 rounded-full border border-current text-[10px] font-black uppercase tracking-wider ${marketSentiment.color} ${marketSentiment.bg} animate-in zoom-in-95 duration-500`}>
                        {marketSentiment.label}
                    </div>
                </div>
            </div>

            {/* AI BRIEFING AREA (Double Wide) */}
            <div className={`col-span-1 md:col-span-2 bg-gradient-to-br from-slate-50/90 to-white/60 dark:from-slate-900/60 dark:to-slate-800/40 backdrop-blur-xl border border-emerald-200 dark:border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between transition-all duration-700 hover:border-emerald-400/50 dark:hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] group relative overflow-hidden ${isVisible ? 'opacity-100' : 'opacity-0 delay-100'}`}>
                {/* Decorative pulse element */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 blur-3xl animate-pulse"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                            </div>
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Live Ecosystem Briefing</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{briefing.timestamp || 'Real-time'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100 leading-snug mb-3 pr-4 border-l-2 border-emerald-400/50 dark:border-emerald-500/30 pl-3">
                        {briefing.summary}
                    </h3>

                    {briefing.insights && briefing.insights.length > 0 ? (
                        <div className="space-y-2 mt-4">
                            {briefing.insights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 group/insight">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400/60 dark:bg-emerald-500/40 group-hover/insight:bg-emerald-500 dark:group-hover/insight:bg-emerald-400 transition-colors"></div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium group-hover/insight:text-slate-800 dark:group-hover/insight:text-slate-300 transition-colors">
                                        {insight}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 italic mt-4 animate-pulse">Deep scanning latest BIRAC & DST portal data...</p>
                    )}
                </div>

                {briefing.highlight && (
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Spotlight Recognition</span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{briefing.highlight.name}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-950/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{briefing.highlight.value}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Total Tracked Card */}
            <div className={`bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl text-center transition-all duration-500 hover:-translate-y-1 hover:border-purple-400/50 dark:hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] group ${isVisible ? 'opacity-100' : 'opacity-0 delay-200'}`}>
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-100 dark:border-purple-500/20 group-hover:scale-110 transition-transform">
                    <span className="text-purple-500 dark:text-purple-400">💎</span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Portfolio Size</p>
                <h2 className="text-4xl font-bold bg-gradient-to-br from-purple-400 to-purple-600 dark:from-purple-300 dark:to-purple-600 bg-clip-text text-transparent">{stats.total}</h2>
            </div>

            {/* Closing Soon - Mobile Only */}
            <div className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl text-center transition-all duration-300 hover:-translate-y-1 hover:border-red-400/50 dark:hover:border-red-500/50 mt-6 lg:mt-0 col-span-1 md:col-span-2 lg:col-span-4 max-w-sm mx-auto w-full lg:max-w-none lg:w-auto lg:hidden">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Closing Soon</p>
                <h2 className="text-4xl font-bold text-red-500">{stats.closingSoon}</h2>
            </div>

            {/* Closing Soon - Desktop */}
            <div className={`hidden lg:block bg-white/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl text-center transition-all duration-500 hover:-translate-y-1 hover:border-red-400/50 dark:hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] group ${isVisible ? 'opacity-100' : 'opacity-0 delay-300'}`}>
                <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 dark:border-red-500/20 group-hover:scale-110 transition-transform">
                    <span className="text-red-500 dark:text-red-400">⌛</span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Critical Phase</p>
                <h2 className="text-4xl font-bold bg-gradient-to-br from-red-400 to-red-600 dark:from-red-300 dark:to-red-600 bg-clip-text text-transparent">{stats.closingSoon}</h2>
            </div>
        </section>
    );
};

export default StatsBoard;
