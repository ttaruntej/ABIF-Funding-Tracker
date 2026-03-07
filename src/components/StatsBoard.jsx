import React, { useMemo } from 'react';
import { TrendingUp, Target, DollarSign, Activity, FileText } from 'lucide-react';

const StatsBoard = ({ stats, marketSentiment, onReportClick }) => {
    const highlights = useMemo(() => [
        {
            label: 'Intelligence Scope',
            val: stats.total,
            sub: 'MANDATES',
            icon: Target,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            desc: 'TOTAL RECORDS'
        },
        {
            label: 'Liquidity Pool',
            val: stats.active,
            sub: 'AVAILABLE',
            icon: DollarSign,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            desc: 'ELIGIBLE NOW'
        },
        {
            label: 'Cycle Maturity',
            val: stats.closingSoon,
            sub: 'CLOSING',
            icon: TrendingUp,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            desc: 'IMMINENT'
        }
    ], [stats]);

    const briefingText = typeof stats.briefing === 'object' ? stats.briefing.summary : stats.briefing;

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* Tactical Metrics Grid - Compacter */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {highlights.map((h, i) => (
                        <div key={i} className="group bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className={`p-3 rounded-xl ${h.bg} transition-transform duration-500 group-hover:scale-110`}>
                                    <h.icon className={h.color} size={18} />
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{h.sub}</span>
                                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-0.5">{h.label}</h4>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter tabular-nums">{h.val}</span>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-black uppercase tracking-widest italic ${h.color}`}>Units</span>
                                    <span className="text-[7px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{h.desc}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* AI Briefing Command Center - Compacter */}
                <div className="lg:col-span-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[32px] p-6 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 dark:text-slate-950/40">Ecosystem Insight</h3>
                            </div>
                            <Activity size={14} className="text-blue-400" />
                        </div>

                        <p className="text-[12px] font-bold leading-relaxed italic opacity-95 group-hover:opacity-100 transition-opacity line-clamp-2 mb-4">
                            "{briefingText}"
                        </p>

                        <div className="flex items-center gap-4 pt-4 border-t border-white/10 dark:border-slate-950/10">
                            <div>
                                <p className="text-[8px] font-black text-white/40 dark:text-slate-950/40 uppercase tracking-widest">Sentiment</p>
                                <div className={`text-[9px] font-black uppercase ${marketSentiment.color}`}>{marketSentiment.label.split(' / ')[0]}</div>
                            </div>
                            <div className="h-6 w-px bg-white/10 dark:bg-slate-950/10" />
                            <button
                                onClick={onReportClick}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 ml-auto"
                            >
                                <FileText size={12} />
                                Full Report
                            </button>
                        </div>
                    </div>

                    {/* Background Decorative Mesh */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_107%,rgba(59,130,246,0.05)_0%,rgba(59,130,246,0)_50%)] pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export default StatsBoard;
