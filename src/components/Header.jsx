import React from 'react';
import { CATEGORIES } from '../constants/tracker';
import { Search, Globe, Landmark, Handshake, Database, Cpu, History, Radar } from 'lucide-react';

const Header = ({
    currentView,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    catCounts,
    activeAudience,
    setActiveAudience,
    setActiveSector
}) => {

    const getCatIcon = (key) => {
        switch (key) {
            case 'national': return <Landmark size={12} />;
            case 'international': return <Globe size={12} />;
            case 'state': return <Landmark size={12} />;
            case 'csr': return <Handshake size={12} />;
            default: return <Cpu size={12} />;
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center gap-4 pointer-events-auto bg-white/70 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 h-14 rounded-full px-4 shadow-2xl transition-all duration-700">

                {/* Tactical Brand */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative">
                        <img src="https://abif.iitkgp.ac.in/logos/logo.png" alt="ABIF" className="w-8 h-8 object-contain" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-lg rounded-full" />
                    </div>
                    <div className="hidden xl:flex flex-col text-left leading-none">
                        <span className="text-xs font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Intel Hub</span>
                    </div>
                </div>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>

                {/* Consolidated Primary Filters Row */}
                <div className="flex-1 flex items-center gap-4 overflow-hidden">

                    {/* Compact Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all ${searchQuery ? 'text-blue-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder={currentView === 'archive' ? "Search archives..." : "Search opportunities..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:border-blue-500/20 rounded-xl pl-10 pr-4 text-[12px] font-bold text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all outline-none"
                        />
                    </div>

                    {/* Integrated Category Pills */}
                    <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar mask-fade-right py-1">
                        {CATEGORIES.map(cat => {
                            const isActive = activeCategory === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl transition-all duration-500 whitespace-nowrap group relative active:scale-95 ${isActive
                                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md'
                                        : 'bg-slate-100/40 dark:bg-slate-800/40 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                >
                                    <span className={isActive ? 'text-blue-500' : 'text-slate-400'}>
                                        {getCatIcon(cat.key)}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-widest">{cat.label}</span>
                                    {catCounts[cat.key] > 0 && (
                                        <span className={`text-[8px] font-mono font-black px-1 rounded ${isActive ? 'bg-white/10 dark:bg-slate-950/20 text-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                            {catCounts[cat.key]}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0 hidden lg:block"></div>

                {/* Audience Switcher - Integrated */}
                <div className="hidden sm:flex bg-slate-200/50 dark:bg-slate-950/60 p-1 rounded-full border border-slate-200 dark:border-slate-800/80 shrink-0">
                    <div className="relative flex">
                        <div className={`absolute inset-y-0 h-full w-1/2 bg-white dark:bg-slate-800 shadow-md rounded-full transition-all duration-500 ${activeAudience === 'incubator' ? 'translate-x-full' : 'translate-x-0'}`} />
                        <button
                            onClick={() => { setActiveAudience('startup'); setActiveSector('All Sectors'); }}
                            className={`relative z-10 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-20 transition-colors ${activeAudience === 'startup' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                        >
                            STARTUP
                        </button>
                        <button
                            onClick={() => { setActiveAudience('incubator'); setActiveSector('All Sectors'); }}
                            className={`relative z-10 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-20 transition-colors ${activeAudience === 'incubator' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
                        >
                            INSTITUTION
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
