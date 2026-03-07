import React from 'react';
import { Database, Info, History, Radar } from 'lucide-react';

const CategoryNav = ({
    activeSector,
    setActiveSector,
    availableSectors,
    currentView
}) => {
    return (
        <div className="sticky top-[72px] z-[90] mb-6 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-2 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl border border-white/10 dark:border-white/5">

                {/* Sector HUD - Minimalist */}
                <div className="flex items-center gap-6 overflow-hidden flex-1">
                    <div className="flex items-center gap-2 shrink-0 border-r border-slate-200 dark:border-slate-800 pr-6 mr-4">
                        <Database size={12} className="text-blue-500" />
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Sector Focus</span>
                    </div>

                    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-1">
                        {['All Sectors', ...availableSectors].map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSector(sec)}
                                className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center gap-2 group/sec ${activeSector === sec
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <div className={`w-1 h-1 rounded-full transition-all duration-500 ${activeSector === sec ? 'bg-blue-500 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300 dark:bg-slate-800 opacity-30 group-hover/sec:opacity-100'}`} />
                                {sec}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-6 pl-6 border-l border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                        {currentView === 'archive' ? <History size={12} className="text-slate-400" /> : <Radar size={12} className="text-blue-500 animate-pulse" />}
                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">
                            {currentView === 'archive' ? 'VAULT' : 'RADAR'}
                        </span>
                    </div>

                    <button className="hidden sm:flex items-center gap-2 group/info hover:text-blue-500 transition-colors ml-4">
                        <Info size={12} className="text-slate-400 group-hover/info:text-blue-500" />
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">Context</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryNav;
