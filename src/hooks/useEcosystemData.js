import { useState, useEffect, useMemo } from 'react';
import { fetchOpportunities, fetchResearchReport } from '../services/api';
import { generateBriefing } from '../utils/aiBriefing';
import { CATEGORIES } from '../constants/tracker';

export const useEcosystemData = () => {
    // Data State
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [report, setReport] = useState(null);
    const [lastUpdatedTs, setLastUpdatedTs] = useState(() => {
        try { return localStorage.getItem('lastUpdatedTs') || null; } catch (e) { return null; }
    });

    // Navigation/Filter State
    const [activeAudience, setActiveAudience] = useState('startup');
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSector, setActiveSector] = useState('All Sectors');
    const [activeStatus, setActiveStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentView, setCurrentView] = useState('dashboard');

    // Operational Logs
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

    // Derived State
    const { filtered, catCounts, activeStats, availableSectors, dynamicSentiment } = useMemo(() => {
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

        const filteredResult = opportunities.filter(o => matches(o));

        const counts = {};
        CATEGORIES.forEach(c => {
            counts[c.key] = opportunities.filter(o => matches(o, { category: c.key })).length;
        });

        const activeItems = opportunities.filter(o => matches(o, { status: 'all', view: 'dashboard' }));
        const statsObj = {
            total: activeItems.length,
            active: activeItems.filter(o => ['Open', 'Rolling', 'Closing Soon'].includes(o.status)).length,
            closingSoon: activeItems.filter(o => o.status === 'Closing Soon').length,
            briefing: generateBriefing(activeItems)
        };

        const sectors = Array.from(new Set(
            opportunities
                .filter(o => matches(o, { sector: 'All Sectors' }))
                .flatMap(o => o.sectors || [])
        )).sort();

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

    const clearFilters = () => {
        setSearchQuery('');
        setActiveCategory('all');
        setActiveSector('All Sectors');
        setActiveStatus('all');
        addLog('Global Filters Reset', 'info');
    };

    return {
        opportunities, loading, error, report, setReport, lastUpdatedTs, loadData,
        activeAudience, setActiveAudience,
        activeCategory, setActiveCategory,
        activeSector, setActiveSector,
        activeStatus, setActiveStatus,
        searchQuery, setSearchQuery,
        currentView, setCurrentView,
        operationalLogs, addLog,
        filtered, catCounts, activeStats, availableSectors, dynamicSentiment,
        clearFilters
    };
};
