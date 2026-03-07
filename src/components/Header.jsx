import React, { useState } from 'react';
import { Sun, Moon, Mail, Send, X } from 'lucide-react';

const Header = ({
    currentView,
    setCurrentView,
    handleExportCSV,
    handleRefresh,
    handleEmailTrigger,
    isRefreshing,
    lastUpdated,
    lastEmailDispatch,
    theme,
    setTheme
}) => {
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const onSendClick = async () => {
        setIsEmailModalOpen(false);
        handleEmailTrigger(emailInput);
        setEmailInput('');
    };

    return (
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 relative">
            <div className="flex flex-col text-center md:text-left relative">
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    ABIF
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold tracking-wider uppercase mt-1">
                    Funding Intelligence Radar
                </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full">
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-xl transition-all duration-300 border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-blue-500" />}
                    </button>

                    {/* View Toggle */}
                    <button
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border ${currentView === 'dashboard'
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 shadow-sm'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm'
                            }`}
                        onClick={() => setCurrentView(currentView === 'dashboard' ? 'archive' : 'dashboard')}
                    >
                        {currentView === 'dashboard' ? '🗄️ Past Mandates' : '📊 Back to Radar'}
                    </button>

                    {/* Export */}
                    <button
                        className="px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
                        onClick={handleExportCSV}
                    >
                        📥 Export Deal Flow
                    </button>

                    {/* Email */}
                    <button
                        className="px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 shadow-sm"
                        onClick={() => setIsEmailModalOpen(true)}
                    >
                        <Mail size={16} /> Dispatch Intelligence
                    </button>

                    {/* Refresh */}
                    <button
                        className="px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 border bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Sync Ecosystem
                    </button>
                </div>

                <div className="flex flex-col items-end text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                        Ecosystem Synced: {lastUpdated}
                    </div>
                    {lastEmailDispatch && (
                        <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400/80 mt-0.5 animate-in fade-in slide-in-from-right-2">
                            <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></span>
                            Last Intelligence Dispatched: {lastEmailDispatch}
                        </div>
                    )}
                </div>
            </div>

            {/* Email Modal */}
            {isEmailModalOpen && (
                <div className="absolute top-16 right-0 z-50 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                            <Mail size={16} className="text-indigo-500" /> Dispatch AI Alert
                        </h3>
                        <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-red-500">
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Send the daily intelligence briefing instantly. Leave blank to shoot it to the default team list.
                    </p>
                    <input
                        type="text"
                        placeholder="email1@u.com, email2@u.com"
                        className="w-full text-sm placeholder-slate-400 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <button
                        onClick={onSendClick}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        <span className="flex items-center gap-2"><Send size={14} /> Dispatch Email</span>
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;
