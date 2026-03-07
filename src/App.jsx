import React, { useState, useEffect, useRef } from 'react';
import './index.css';

import { fetchOpportunities, triggerScraper, getScraperStatus, fetchResearchReport, triggerEmail, getEmailStatus } from './services/api';
import { exportToCSV } from './utils/csvExporter';
import { generateBriefing } from './utils/aiBriefing';
import { SECTIONS, CATEGORIES } from './constants/tracker';

import Header from './components/Header';
import StatsBoard from './components/StatsBoard';
import CategoryNav from './components/CategoryNav';
import SchemeCard from './components/SchemeCard';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';


const Dashboard = () => {
    // Theme setup based on system preference or local storage
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored) return stored;
            return 'light'; // Default
        }
        return 'light'; // Initial SSR
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, active: 0, closingSoon: 0, briefing: "Generating insights..." });
    const [report, setReport] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshSuccess, setRefreshSuccess] = useState(false);
    const [activeAudience, setActiveAudience] = useState('startup');
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSector, setActiveSector] = useState('All Sectors');
    const [searchQuery, setSearchQuery] = useState('');
    const [emailNotification, setEmailNotification] = useState(null);
    const [lastEmailDispatch, setLastEmailDispatch] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('lastEmailDispatch');
        }
        return null;
    });
    const [currentView, setCurrentView] = useState('dashboard');
    const [lastUpdated, setLastUpdated] = useState(
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
    const [serverStatus, setServerStatus] = useState(null);
    const [syncStartTime, setSyncStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const sectionRefs = useRef({});

    const loadData = async () => {
        try {
            const data = await fetchOpportunities();
            setOpportunities(data);

            const [reportData] = await Promise.allSettled([fetchResearchReport()]);
            if (reportData.status === 'fulfilled') setReport(reportData.value);

            const active = data.filter(o => ['Open', 'Rolling', 'Coming Soon'].includes(o.status)).length;
            const closing = data.filter(o => o.status === 'Closing Soon').length;
            const dynamicBriefing = generateBriefing(data);

            setStats({ total: data.length, active, closingSoon: closing, briefing: dynamicBriefing });
            setError(null);
            setLoading(false);
            setLastUpdated(
                `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            );
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let interval;
        if (isRefreshing && !refreshSuccess) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - syncStartTime) / 1000));
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isRefreshing, refreshSuccess, syncStartTime]);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setRefreshSuccess(false);
        setServerStatus('queued');
        setSyncStartTime(Date.now());

        try {
            await triggerScraper();
            const pollInterval = setInterval(async () => {
                try {
                    const statusData = await getScraperStatus();
                    setServerStatus(statusData.status);
                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval);
                        await loadData();
                        setRefreshSuccess(true);
                        setTimeout(() => {
                            setIsRefreshing(false);
                            setRefreshSuccess(false);
                            setServerStatus(null);
                        }, 3000);
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                }
            }, 5000);
            setTimeout(() => clearInterval(pollInterval), 600000);
        } catch (err) {
            console.error('Trigger failed:', err.message);
            setIsRefreshing(false);
        }
    };

    const handleEmailTrigger = async (targetEmails) => {
        try {
            // Start the dispatch process, notify user we are initializing
            setEmailNotification({ type: 'initializing', message: 'Connecting to Vercel API...' });

            // Get current run ID to have a baseline
            let initialStatus;
            try {
                initialStatus = await getEmailStatus();
            } catch (e) {
                console.warn("Could not fetch initial baseline status, proceeding anyway.");
            }
            const baselineRunId = initialStatus?.run_id;

            // Trigger the email
            await triggerEmail(targetEmails);
            setEmailNotification({ type: 'in_progress', message: 'Initiating secure data sync... (~10s)' });

            // Start polling for status
            let attempts = 0;
            const maxAttempts = 24; // 2 minutes total (24 * 5s)

            const pollInterval = setInterval(async () => {
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setEmailNotification({ type: 'error', message: 'Dispatch timed out. Please check logs.' });
                    setTimeout(() => setEmailNotification(null), 7000);
                    return;
                }

                try {
                    const statusData = await getEmailStatus();

                    // Wait for a NEW run to appear or if the status becomes in_progress
                    if (statusData.run_id && statusData.run_id !== baselineRunId) {
                        if (statusData.status === 'in_progress') {
                            setEmailNotification({ type: 'in_progress', message: 'Dispatching intelligence briefing...' });
                        } else if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            if (statusData.conclusion === 'success') {
                                const now = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                setLastEmailDispatch(now);
                                localStorage.setItem('lastEmailDispatch', now);
                                setEmailNotification({ type: 'success', message: 'Intelligence briefing dispatched successfully!' });
                            } else {
                                setEmailNotification({ type: 'error', message: `Dispatch failed: ${statusData.conclusion}` });
                            }
                            setTimeout(() => setEmailNotification(null), 10000);
                        }
                    }
                } catch (e) {
                    console.error('Email status polling error:', e);
                }
            }, 5000);

        } catch (err) {
            console.error('Email trigger failed:', err.message);
            setEmailNotification({ type: 'error', message: 'Failed to trigger email. Check connection.' });
            setTimeout(() => setEmailNotification(null), 5000);
        }
    };

    const scrollToSection = (key) => {
        const el = sectionRefs.current[key];
        if (el) {
            const yOffset = -120;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 font-medium">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            Loading ABIF Strategic Insights...
        </div>
    );

    const filteredByAudience = activeAudience === 'all'
        ? opportunities
        : opportunities.filter(o => o.targetAudience?.includes(activeAudience));

    const availableSectors = Array.from(new Set(filteredByAudience.flatMap(o => o.sectors || []))).sort();

    const filteredBySector = activeSector === 'All Sectors'
        ? filteredByAudience
        : filteredByAudience.filter(o => o.sectors?.includes(activeSector));

    const filteredByCategory = activeCategory === 'all'
        ? filteredBySector
        : filteredBySector.filter(o => (o.category || '').toLowerCase() === activeCategory);

    // Filter by Search Query
    const filtered = searchQuery === ''
        ? filteredByCategory
        : filteredByCategory.filter(o =>
            (o.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.sectors || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    const verifiedCount = filtered.filter(o => o.linkStatus === 'verified').length;
    const probableCount = filtered.filter(o => o.linkStatus === 'probable').length;
    const showCategoryBadge = activeCategory === 'all';

    const catCounts = {};
    CATEGORIES.forEach(c => {
        catCounts[c.key] = c.key === 'all'
            ? filteredBySector.length
            : filteredBySector.filter(o => o.category === c.key).length;
    });

    const visibleSections = SECTIONS.map(s => ({
        ...s,
        items: filtered.filter(s.filter),
    })).filter(s => s.items.length > 0);

    // AI Intelligence: Dynamic Processing Steps
    const getStatusMessage = () => {
        if (serverStatus === 'completed') return "Finalizing Strategic Report...";
        if (elapsedTime < 5) return "Initializing Neural Nodes...";
        if (elapsedTime < 15) return "Scraping BIRAC & DST Portals...";
        if (elapsedTime < 25) return "Extracting Metadata & Link Verification...";
        if (elapsedTime < 35) return "Calculating Capital Velocity Metrics...";
        if (elapsedTime < 45) return "Synthesizing Sectoral Intelligence...";
        return "Almost done. Final verification...";
    };

    // AI Intelligence: Market Sentiment calculation
    const marketSentiment = (() => {
        const activeRatio = stats.active / (stats.total || 1);
        if (activeRatio > 0.6) return { label: 'Aggressive / Bullish', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        if (activeRatio > 0.4) return { label: 'Stable / Balanced', color: 'text-blue-400', bg: 'bg-blue-500/10' };
        return { label: 'Cycles Transitioning', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    })();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-500/30 transition-colors duration-300">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-20 relative">

                {error && (
                    <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 mb-6 text-red-400 text-sm flex items-center justify-between z-50 relative">
                        <div>⚠️ <strong>Research sync unavailable:</strong> {error}</div>
                        <button onClick={loadData} className="px-3 py-1 border border-red-500/50 rounded hover:bg-red-500/10 transition-colors">Reconnect</button>
                    </div>
                )}

                {isRefreshing && (
                    <div className="fixed top-8 right-8 z-[100]">
                        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 shadow-2xl rounded-2xl p-5 w-[320px] transition-all animate-in slide-in-from-right-8 fade-in duration-300">
                            {refreshSuccess ? (
                                <div className="flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">✓</div>
                                    <div>
                                        <h3 className="font-bold text-emerald-400 m-0">System Synced</h3>
                                        <p className="text-xs text-slate-400 m-0">The research database is being updated. Dashboard will refresh soon.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-4 text-slate-200">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm m-0">
                                                {serverStatus === 'in_progress' ? 'AI Scraper Active' : 'Initializing Deep Scan...'}
                                            </h3>
                                            <p className="text-xs text-slate-400 m-0">{getStatusMessage()}</p>
                                        </div>
                                        <span className="font-mono text-emerald-500 text-sm">{elapsedTime}s</span>
                                    </div>
                                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: serverStatus === 'in_progress' ? '75%' : '25%' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Email Notification Toast */}
                {emailNotification && (
                    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className={`backdrop-blur-xl border shadow-2xl rounded-2xl p-4 flex items-center gap-4 w-[320px] bg-white/90 dark:bg-slate-800/90 ${emailNotification.type === 'success' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                            : emailNotification.type === 'error' ? 'border-red-500/50 text-red-600 dark:text-red-400'
                                : 'border-blue-500/50 text-blue-600 dark:text-blue-400'
                            }`}>
                            <div className={`w-10 h-10 min-w-10 rounded-full flex items-center justify-center font-bold text-lg 
                                ${emailNotification.type === 'success' ? 'bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500'
                                    : emailNotification.type === 'error' ? 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500'
                                        : 'bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-500'}`}>
                                {emailNotification.type === 'success' ? '✓'
                                    : emailNotification.type === 'error' ? '✗'
                                        : <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></div>}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold m-0 text-slate-800 dark:text-slate-100">
                                    {emailNotification.type === 'success' ? 'Dispatch Successful'
                                        : emailNotification.type === 'error' ? 'Dispatch Failed'
                                            : emailNotification.type === 'initializing' ? 'Initializing...'
                                                : 'Dispatching Alert...'}
                                </h3>
                                <p className="text-xs m-0 text-slate-500 dark:text-slate-400 leading-tight mt-1">{emailNotification.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                <Header
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    handleExportCSV={() => exportToCSV(filtered)}
                    handleRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastUpdated={lastUpdated}
                    lastEmailDispatch={lastEmailDispatch}
                    theme={theme}
                    setTheme={setTheme}
                    handleEmailTrigger={handleEmailTrigger}
                />

                {currentView === 'dashboard' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Audience Toggle */}
                        <div className="flex justify-center gap-2 mb-10 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full w-fit mx-auto shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                            <button
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeAudience === 'startup' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                onClick={() => { setActiveAudience('startup'); setActiveSector('All Sectors'); }}
                            >
                                🚀 Portfolio Startups
                            </button>
                            <button
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeAudience === 'incubator' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-slate-500 hover:text-slate-300'}`}
                                onClick={() => { setActiveAudience('incubator'); setActiveSector('All Sectors'); }}
                            >
                                🏢 Incubator Initiatives
                            </button>
                        </div>

                        <div className="relative group/briefing cursor-pointer" onClick={() => setShowReport(true)}>
                            <StatsBoard
                                stats={stats}
                                marketSentiment={marketSentiment}
                            />
                            <div className="absolute top-4 right-4 bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] px-2 py-1 rounded opacity-0 group-hover/briefing:opacity-100 transition-opacity uppercase font-black">
                                Click to Expand Report
                            </div>
                        </div>



                        <CategoryNav
                            activeCategory={activeCategory}
                            setActiveCategory={setActiveCategory}
                            catCounts={catCounts}
                            activeSector={activeSector}
                            setActiveSector={setActiveSector}
                            availableSectors={availableSectors}
                            visibleSections={visibleSections}
                            scrollToSection={scrollToSection}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />

                        {searchQuery && (
                            <div className="flex items-center justify-between mb-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-4">
                                <span className="text-sm font-medium text-blue-400">
                                    🔍 Found <strong>{filtered.length}</strong> results for "{searchQuery}"
                                </span>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                                >
                                    Clear Search
                                </button>
                            </div>
                        )}

                        {filtered.length === 0 ? (
                            <EmptyState
                                title={searchQuery ? "No Matches Found" : "No Mandates Found"}
                                message={searchQuery
                                    ? `We couldn't find any programs matching "${searchQuery}". Try a different keyword.`
                                    : "Refine your tags to see available funding sources."
                                }
                                actionLabel={searchQuery ? "Clear Search" : "View All Mandates"}
                                onAction={searchQuery ? () => setSearchQuery('') : () => setActiveCategory('all')}
                            />
                        ) : (
                            <div className="space-y-16">
                                {visibleSections.map(section => (
                                    <div key={section.key} id={section.key} ref={el => { sectionRefs.current[section.key] = el; }} className="scroll-mt-36">
                                        <div className={`flex flex-wrap items-center gap-4 mb-6 border-l-4 pl-4 ${section.borderColor}`}>
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic tracking-tighter">{section.label}</h2>
                                            <span className="text-sm font-medium text-slate-500 flex-1">{section.subtitle}</span>
                                            <span className="bg-slate-800 border border-slate-700 text-blue-400 text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                                                {section.items.length}
                                            </span>
                                        </div>
                                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {section.items.map((scheme, i) => (
                                                <SchemeCard key={`${section.key}-${i}`} scheme={scheme} showCategoryBadge={showCategoryBadge} />
                                            ))}
                                        </section>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-6 pt-10">
                        <div className="flex flex-wrap items-center gap-4 mb-8 border-l-4 border-slate-600 pl-4">
                            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 italic tracking-tighter">🗄️ Closed Research Archive</h2>
                            <p className="text-sm text-slate-500 flex-1 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4">Reference pool for benchmarking past grant success.</p>
                        </div>
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {opportunities.filter(o => ['Closed', 'Verify Manually'].includes(o.status)).map((scheme, i) => (
                                <SchemeCard key={`archive-${i}`} scheme={scheme} showCategoryBadge={true} />
                            ))}
                        </section>
                    </div>
                )}
            </div>
            {/* Detailed Report Modal */}
            {showReport && report && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowReport(false)}></div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-800">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{report.title}</h2>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1 uppercase tracking-widest">Advanced Research Insights v2026.03</p>
                            </div>
                            <button onClick={() => setShowReport(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10 text-slate-600 dark:text-slate-400">✕</button>
                        </div>
                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Executive Summary</h4>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{report.executiveSummary}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {report.keyTrends.map((t, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                        <h5 className="text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center gap-2">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> {t.trend}
                                        </h5>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t.detail}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Actionable Recommendations</h4>
                                <div className="space-y-3">
                                    {report.actionableRecommendations.map((r, idx) => (
                                        <div key={idx} className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold">0{idx + 1}</span>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{r}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-500 font-mono text-center uppercase tracking-widest">
                            {report.briefingFooter}
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
            `}} />
            <Footer />
        </div>
    );
};

export default Dashboard;
