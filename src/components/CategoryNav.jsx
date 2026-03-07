import React from 'react';
import { CATEGORIES, CAT_STYLES } from '../constants/tracker';

const CategoryNav = ({
    activeCategory,
    setActiveCategory,
    catCounts,
    activeSector,
    setActiveSector,
    availableSectors,
    visibleSections,
    scrollToSection,
    searchQuery,
    setSearchQuery
}) => {
    return (
        <nav className="sticky top-6 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 md:p-5 mb-8 flex flex-col gap-4 shadow-sm dark:shadow-2xl transition-all duration-500">
            {/* Search & Category Tabs */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center w-full">
                <div className="flex overflow-x-auto custom-scrollbar w-full lg:w-auto pb-3 lg:pb-0 gap-2.5 pr-2">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.key;
                        const activeStyle = CAT_STYLES[cat.key] || CAT_STYLES.all;

                        return (
                            <button
                                key={cat.key}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-300 ${isActive
                                    ? activeStyle
                                    : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                                    }`}
                                onClick={() => setActiveCategory(cat.key)}
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span className="font-semibold">{cat.label}</span>
                                <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[0.65rem] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center ml-1 text-slate-700 dark:text-slate-300">
                                    {catCounts[cat.key]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-80 flex-shrink-0 group">
                    <input
                        type="text"
                        placeholder="Scan deal flow..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Sector Filters */}
            <div className="flex overflow-x-auto custom-scrollbar gap-2 pt-4 pb-2 border-t border-slate-200 dark:border-slate-700/50 border-dashed w-full">
                <button
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-all duration-300 ${activeSector === 'All Sectors'
                        ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500'
                        : 'bg-transparent border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    onClick={() => setActiveSector('All Sectors')}
                >
                    All Sectors
                </button>
                {availableSectors.map(sec => (
                    <button
                        key={sec}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-all duration-300 ${activeSector === sec
                            ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500'
                            : 'bg-transparent border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        onClick={() => setActiveSector(sec)}
                    >
                        {sec}
                    </button>
                ))}
            </div>

            {/* Quick Jumps */}
            {visibleSections.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <span className="text-[0.7rem] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mr-1">
                        Jump to:
                    </span>
                    {visibleSections.map(s => (
                        <button
                            key={s.key}
                            className="inline-flex items-center gap-1.5 bg-transparent border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            onClick={() => scrollToSection(s.key)}
                        >
                            {s.label.split(' ').slice(0, 2).join(' ')}
                            <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-md ml-1">
                                {s.items.length}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default CategoryNav;
