import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import TacticalSpear from './components/TacticalSpear';
import { Activity, X, TrendingUp, CheckCircle2, Cpu } from 'lucide-react';

const App = () => {
    // Theme setup
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('theme') || 'light';
        } catch (e) { return 'light'; }
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        try { localStorage.setItem('theme', theme); } catch (e) { }
    }, [theme]);

    // Data State
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, active: 0, closingSoon: 0, briefing: "Synthesizing ecosystem intelligence..." });
    const [report, setReport] = useState(null);
    const [showReport, setShowReport] = useState(false);

    // Operational State: Scraper
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshSuccess, setRefreshSuccess] = useState(false);
    const [serverStatus, setServerStatus] = useState(null);
    const [syncStartTime, setSyncStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Operational State: Email
    const [emailNotification, setEmailNotification] = useState(null);
    const [dispatching, setDispatching] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSyncingReport, setIsSyncingReport] = useState(false);
    const [lastEmailDispatchTs, setLastEmailDispatchTs] = useState(() => {
        try { return localStorage.getItem('lastEmailDispatchTs') || null; } catch (e) { return null; }
    });

    // Operational Logs (Telemetry)
    const [operationalLogs, setOperationalLogs] = useState(() => {
        try {
            const stored = localStorage.getItem('operationalLogs');
            return (stored ? JSON.parse(stored) : []).slice(0, 10);
        } catch (e) { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem('operationalLogs', JSON.stringify(operationalLogs)); } catch (e) { }
    }, [operationalLogs]);

    const addLog = (event, type = 'info') => {
        const newLog = {
            id: Date.now(),
            event,
            type,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setOperationalLogs(prev => [newLog, ...prev].slice(0, 10));
    };

    // Navigation/Filter State
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeAudience, setActiveAudience] = useState('startup');
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSector, setActiveSector] = useState('All Sectors');
    const [activeStatus, setActiveStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFloatingBar, setShowFloatingBar] = useState(false);
    const [lastUpdatedTs, setLastUpdatedTs] = useState(() => {
        try { return localStorage.getItem('lastUpdatedTs') || null; } catch (e) { return null; }
    });

    const sectionRefs = useRef({});
    const categoryNavRef = useRef(null);

    // 1. Data Loading
    const loadData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const data = await fetchOpportunities();
            setOpportunities(data);

            const [reportData] = await Promise.allSettled([fetchResearchReport()]);
            if (reportData.status === 'fulfilled') setReport(reportData.value);

            setError(null);

            const nowTs = Date.now().toString();
            setLastUpdatedTs(nowTs);
            try { localStorage.setItem('lastUpdatedTs', nowTs); } catch (e) { }

            if (isSilent) addLog(`Data Refresh Complete: ${data.length} records synced`, 'success');
        } catch (err) {
            setError("Ecosystem connection disrupted.");
            addLog(`Sync Failure: API issue`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // 2. Scraper Engine
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
        addLog('Initiating Deep Web Research Sync...', 'info');

        try {
            await triggerScraper();
            const pollInterval = setInterval(async () => {
                try {
                    const statusData = await getScraperStatus();
                    setServerStatus(statusData.status);
                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval);
                        await loadData(true);
                        setRefreshSuccess(true);
                        setTimeout(() => {
                            setIsRefreshing(false);
                            setRefreshSuccess(false);
                            setServerStatus(null);
                        }, 3000);
                    }
                } catch (e) { console.error('Polling error:', e); }
            }, 5000);
        } catch (err) {
            addLog(`Trigger failed`, 'error');
            setIsRefreshing(false);
        }
    };

    // 3. Email Dispatch Engine
    const handleEmailTrigger = async (targetEmails) => {
        try {
            setDispatching(true);
            setEmailNotification({ type: 'initializing', message: 'Connecting to Dispatch Proxy...' });
            addLog(`Initiating dispatch relay to stakeholder`, 'info');

            let baselineRunId;
            try {
                const initialStatus = await getEmailStatus();
                baselineRunId = initialStatus?.run_id;
            } catch (e) { }

            await triggerEmail(targetEmails);
            setEmailNotification({ type: 'in_progress', message: 'Synthesizing Strategic Briefing...' });

            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                if (attempts > 20) {
                    clearInterval(pollInterval);
                    setDispatching(false);
                    setEmailNotification({ type: 'error', message: 'Dispatch status unconfirmed.' });
                    addLog('Dispatch Timeout', 'error');
                    setTimeout(() => setEmailNotification(null), 5000);
                    return;
                }

                try {
                    const statusData = await getEmailStatus();
                    if (statusData.run_id && statusData.run_id !== baselineRunId) {
                        if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            setDispatching(false);
                            const nowTs = Date.now().toString();
                            setLastEmailDispatchTs(nowTs);
                            try { localStorage.setItem('lastEmailDispatchTs', nowTs); } catch (e) { }

                            setEmailNotification({ type: 'success', message: 'Intelligence briefing dispatched!' });
                            addLog(`Briefing Dispatched successfully`, 'success');
                            setTimeout(() => setEmailNotification(null), 8000);
                        }
                    }
                } catch (e) { }
            }, 5000);
        } catch (err) {
            setDispatching(false);
            setEmailNotification({ type: 'error', message: 'Failed to initiate dispatch.' });
            addLog('Critical Dispatch Failure', 'error');
            setTimeout(() => setEmailNotification(null), 5000);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (categoryNavRef.current) {
                const rect = categoryNavRef.current.getBoundingClientRect();
                // 72px is the header height where CategoryNav sticks
                setShowFloatingBar(rect.top <= 72);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDownloadPDF = () => {
        window.print();
    };

    const handleSyncIntelligence = async () => {
        try {
            setIsSyncingReport(true);
            addLog('Synching Neural Report...', 'info');
            const freshReport = await fetchResearchReport();
            if (freshReport) {
                setReport(freshReport);
                addLog('Intelligence Refreshed from Data Core', 'success');
            }
        } catch (e) {
            addLog('Report Sync Fault', 'error');
        } finally {
            setTimeout(() => setIsSyncingReport(false), 2000);
        }
    };

    const scrollToFilters = () => {
        if (categoryNavRef.current) {
            const yOffset = -72; // Header height
            const y = categoryNavRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const scrollToSection = (key) => {
        const el = sectionRefs.current[key];
        if (el) {
            const yOffset = -220;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const formatRelTime = (rawTs) => {
        if (!rawTs) return 'Never';
        try {
            const diff = Math.floor((Date.now() - parseInt(rawTs)) / 1000);
            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return 'Recently';
        } catch (e) { return 'Never'; }
    };

    const getScraperMessage = () => {
        if (serverStatus === 'completed') return "Finalizing Institutional Report...";
        if (elapsedTime < 5) return "Performing Strategic Synthesis...";
        if (elapsedTime < 15) return "Auditing Portfolio Portals...";
        if (elapsedTime < 25) return "Extracting Mandate Data...";
        return "Synthesizing Intelligence...";
    };

    // 4. Dynamic Insights & Stats Calculation
    const { filtered, catCounts, activeStats, availableSectors, dynamicSentiment } = useMemo(() => {
        // Base matching logic
        const matches = (o, filters = {}) => {
            const {
                audience = activeAudience,
                category = activeCategory,
                sector = activeSector,
                status = activeStatus,
                search = searchQuery,
                view = currentView
            } = filters;

            const matchesAudience = audience === 'all' || (o.targetAudience || []).includes(audience);
            const matchesCategory = category === 'all' || (o.category || '').toLowerCase() === category;
            const matchesSector = sector === 'All Sectors' || (o.sectors || []).includes(sector);
            const matchesStatus = status === 'all' ||
                (status === 'Open' ? ['Open', 'Closing Soon'].includes(o.status) : o.status === status);
            const matchesSearch = !search ||
                (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
                (o.description || '').toLowerCase().includes(search.toLowerCase());

            const isArchive = ['Closed', 'Verify Manually'].includes(o.status);
            const matchesView = view === 'dashboard' ? !isArchive : isArchive;

            return matchesAudience && matchesCategory && matchesSector && matchesStatus && matchesSearch && matchesView;
        };

        // 1. Filtered Opportunities (The ones actually displayed)
        const filteredResult = opportunities.filter(o => matches(o));

        // 2. Category Counts
        // For each category, count items that match all CURRENT active filters EXCEPT the category filter itself
        // This allows the user to see how many items exist in other categories given their other filter settings (search, audience, etc.)
        const counts = {};
        CATEGORIES.forEach(c => {
            counts[c.key] = opportunities.filter(o => matches(o, { category: c.key })).length;
        });

        // 3. Stats for StatsBoard
        // Stats should reflect the current context (audience, search, etc.)
        const activeItems = opportunities.filter(o => matches(o, { status: 'all', view: 'dashboard' }));
        const statsObj = {
            total: activeItems.length,
            active: activeItems.filter(o => ['Open', 'Rolling', 'Closing Soon'].includes(o.status)).length,
            closingSoon: activeItems.filter(o => o.status === 'Closing Soon').length,
            briefing: generateBriefing(activeItems)
        };

        // 4. Available Sectors
        const sectors = Array.from(new Set(
            opportunities
                .filter(o => matches(o, { sector: 'All Sectors' }))
                .flatMap(o => o.sectors || [])
        )).sort();

        // 5. Market Sentiment
        const sentiment = (statsObj.active / (statsObj.total || 1)) > 0.5
            ? { label: 'Aggressive / Bullish', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            : { label: 'Transition / Stable', color: 'text-blue-400', bg: 'bg-blue-500/10' };

        return {
            filtered: filteredResult,
            catCounts: counts,
            activeStats: statsObj,
            availableSectors: sectors,
            dynamicSentiment: sentiment
        };
    }, [opportunities, activeAudience, activeCategory, activeSector, activeStatus, searchQuery, currentView]);

    if (loading) return (
        <div className={`flex flex-col items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-blue-500' : 'bg-slate-50 text-blue-600'} font-black tracking-[0.5em] uppercase text-center px-4 transition-colors duration-500`}>
            <div className="w-12 h-1 bg-blue-500/20 rounded-full mb-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-500 animate-scan"></div>
            </div>
            Neural Link Active...
        </div>
    );

    const visibleSections = currentView === 'archive'
        ? [{ key: 'vault', label: 'Vault Records', subtitle: 'Archive Database', borderColor: 'border-slate-400', items: filtered }].filter(s => s.items.length > 0)
        : SECTIONS.map(s => ({ ...s, items: filtered.filter(s.filter) })).filter(s => s.items.length > 0);

    return (
        <div className={`min-h-screen transition-colors duration-1000 selection:bg-blue-500/30 ${currentView === 'archive' ? 'bg-slate-100 dark:bg-slate-900 arclight-gradient' : 'bg-slate-50 dark:bg-slate-950'}`}>

            {/* Operational Toasts */}
            {isRefreshing && (
                <div className="fixed top-24 right-8 z-[110] animate-in scale-95 origin-right">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-blue-500/20 shadow-2xl rounded-2xl p-4 w-[280px]">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 ${refreshSuccess ? '' : 'animate-spin'}`}>
                                {refreshSuccess && '✓'}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">{refreshSuccess ? 'Sync Complete' : 'Researching...'}</h3>
                                <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">{refreshSuccess ? 'Ecosystem Updated' : getScraperMessage()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {emailNotification && (
                <div className="fixed bottom-28 right-28 z-[110] animate-in slide-in-from-right-8">
                    <div className={`backdrop-blur-2xl border shadow-2xl rounded-2xl p-4 flex items-center gap-4 w-[280px] bg-white/90 dark:bg-slate-900/90 ${emailNotification.type === 'success' ? 'border-emerald-500/50' :
                        emailNotification.type === 'error' ? 'border-red-500/50' : 'border-blue-500/50'
                        }`}>
                        <div className="flex-1">
                            <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest leading-none">Transmission</h3>
                            <p className="text-[8px] text-slate-500 font-bold uppercase mt-2">{emailNotification.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <Header
                currentView={currentView}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                catCounts={catCounts}
                activeAudience={activeAudience} setActiveAudience={setActiveAudience}
                setActiveSector={setActiveSector}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-20">
                <div className={`animate-in delay-200 transition-all duration-700 ${currentView === 'archive' ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
                    <StatsBoard stats={activeStats} marketSentiment={dynamicSentiment} onReportClick={() => setShowReport(true)} />
                </div>

                <div ref={categoryNavRef}>
                    <CategoryNav
                        activeSector={activeSector} setActiveSector={setActiveSector}
                        availableSectors={availableSectors}
                        activeStatus={activeStatus} setActiveStatus={setActiveStatus}
                        currentView={currentView}
                    />
                </div>

                <div className="mt-6 transition-all duration-500 relative">
                    {filtered.length === 0 ? (
                        <EmptyState
                            title={currentView === 'archive' ? "Archives Empty" : "No Matches"}
                            message="Adjust filters or refresh the ecosystem research."
                            actionLabel="View All Opportunities"
                            onAction={() => {
                                setSearchQuery('');
                                setActiveCategory('all');
                                setActiveSector('All Sectors');
                                setActiveStatus('all');
                            }}
                        />
                    ) : (
                        <div className="space-y-12">
                            {visibleSections.map(section => (
                                <div key={section.key} id={section.key} ref={el => { sectionRefs.current[section.key] = el; }} className="scroll-mt-40 animate-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {section.items.map((scheme, i) => (
                                            <SchemeCard key={`${section.key}-${i}`} scheme={scheme} showCategoryBadge={activeCategory === 'all'} isArchivedMode={currentView === 'archive'} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <TacticalSpear
                handleRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                handleExportCSV={() => exportToCSV(filtered)}
                onEmailClick={() => setIsEmailModalOpen(true)}
                theme={theme}
                toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                currentView={currentView}
                setCurrentView={setCurrentView}
            />

            {/* Re-wired Email Modal from Header logic */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsEmailModalOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-3xl border border-white/5 p-8 animate-shutter">
                        <h3 className="font-black text-slate-900 dark:text-white text-[12px] uppercase mb-6 flex items-center gap-3">
                            Briefing Transmission
                        </h3>
                        <input
                            type="text"
                            placeholder="Recipient email..."
                            className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white mb-6"
                            onKeyDown={(e) => { if (e.key === 'Enter') { handleEmailTrigger(e.target.value); setIsEmailModalOpen(false); } }}
                        />
                        <button
                            onClick={() => { const val = document.querySelector('input[placeholder="Recipient email..."]').value; handleEmailTrigger(val); setIsEmailModalOpen(false); }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl transition-all"
                        >
                            TRANSMIT
                        </button>
                    </div>
                </div>
            )}

            {showReport && report && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print-report-active">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in no-print" onClick={() => setShowReport(false)}></div>
                    <div id="report-modal-content" className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[40px] overflow-hidden shadow-2xl animate-shutter flex flex-col max-h-[90vh]">
                        {/* Intelligence Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                    <Activity className="text-white" size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{report.title}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autonomous Research Cycle</span>
                                        <div className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                            {new Date(report.generatedAt).toLocaleDateString()} • {new Date(report.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowReport(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-red-500 transition-all active:scale-90 no-print">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Intelligence Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="max-w-4xl mx-auto space-y-12 pb-8">

                                {/* 1. Executive Summary */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Strategic Core</h3>
                                    </div>
                                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic border-l-4 border-slate-100 dark:border-slate-800 pl-6">
                                        "{report.executiveSummary}"
                                    </p>
                                </section>

                                {/* 2. Key Trends Analysis */}
                                <section>
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Market Vector Analysis</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {report.keyTrends.map((trend, i) => (
                                            <div key={i} className="group p-6 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all duration-500">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                                                        <TrendingUp size={18} />
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{trend.trend}</h4>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                    {trend.detail}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* 3. Actionable Directives */}
                                <section>
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Execution Directives</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {report.actionableRecommendations.map((rec, i) => (
                                            <div key={i} className="flex gap-4 p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm group hover:scale-[1.01] transition-transform">
                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg h-fit group-hover:bg-emerald-500/10 transition-colors">
                                                    <CheckCircle2 className="text-emerald-500" size={16} />
                                                </div>
                                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-snug">
                                                    {rec}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Intelligence Footer */}
                        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <Cpu size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{report.briefingFooter?.replace(/\s*\(Powered by Gemini 2\.5 Flash\)\s*/gi, '')}</span>
                            </div>
                            <div className="flex gap-6 no-print">
                                <button onClick={handleDownloadPDF} className="text-[10px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors cursor-pointer">Download PDF</button>
                                <button
                                    onClick={handleSyncIntelligence}
                                    disabled={isSyncingReport}
                                    className={`text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isSyncingReport ? 'text-blue-500 animate-pulse' : 'text-slate-400 hover:text-blue-500'}`}
                                >
                                    {isSyncingReport ? 'Syncing...' : 'Sync Intelligence'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showFloatingBar && currentView === 'dashboard' && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500 pointer-events-auto">
                    <div className="flex items-center p-1 bg-slate-950/80 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {[
                            { key: 'all', label: 'All', color: 'bg-slate-400', section: null },
                            { key: 'Open', label: 'Open', color: 'bg-emerald-500', section: 'open' },
                            { key: 'Rolling', label: 'Rolling', color: 'bg-blue-500', section: 'rolling' },
                            { key: 'Coming Soon', label: 'Soon', color: 'bg-amber-500', section: 'coming-soon' }
                        ].map(s => (
                            <button
                                key={s.key}
                                onClick={() => {
                                    setActiveStatus(s.key);
                                    scrollToFilters();
                                }}
                                className={`px-5 py-2.5 rounded-full transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ${activeStatus === s.key ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <div className={`w-1 h-1 rounded-full ${s.color} ${activeStatus === s.key ? 'animate-pulse' : 'opacity-40'}`} />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <Footer lastUpdatedTs={lastUpdatedTs} />
        </div>
    );
};

export default App;
