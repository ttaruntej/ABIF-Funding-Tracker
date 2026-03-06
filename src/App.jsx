import React, { useState, useEffect } from 'react';
import './index.css';

const Dashboard = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, closingSoon: 0 });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

    const fetchData = () => {
        fetch('/data/opportunities.json')
            .then(res => res.json())
            .then(data => {
                setOpportunities(data);
                const active = data.filter(o => o.status === 'Open' || o.status === 'Rolling' || o.status === 'Coming Soon').length;
                const closing = data.filter(o => o.status === 'Closing Soon').length;
                setStats({ total: data.length, active, closingSoon: closing });
                setLoading(false);
                setIsRefreshing(false);
                setLastUpdated(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
            })
            .catch(err => {
                console.error("Failed to fetch opportunities:", err);
                setLoading(false);
                setIsRefreshing(false);
            });
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setCountdown(8);
    };

    useEffect(() => {
        let timer;
        if (isRefreshing && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (isRefreshing && countdown === 0) {
            fetchData();
        }
        return () => clearTimeout(timer);
    }, [isRefreshing, countdown]);

    if (loading) return (
        <div style={{ backgroundColor: '#020c1b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64ffda', fontFamily: 'Inter' }}>
            Loading ABIF Funding Tracker...
        </div>
    );

    return (
        <div className="dashboard-container animate-in">
            {isRefreshing && (
                <div className="refresh-overlay">
                    <div className="refresh-modal">
                        <div className="spinner"></div>
                        <h2>Updating Dashboard</h2>
                        <p>Syncing with latest funding databases...</p>
                        <div className="countdown-container">
                            <div className="countdown-bar" style={{ width: `${(8 - countdown) / 8 * 100}%` }}></div>
                        </div>
                        <span className="timer-text">{countdown}s</span>
                    </div>
                </div>
            )}

            <header>
                <div className="logo">
                    <h1>ABIF</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Opportunities Tracker</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn-refresh" onClick={handleRefresh} disabled={isRefreshing}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Update Dashboard
                    </button>
                    <div className="last-updated" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                        Last Refreshed: {lastUpdated}
                    </div>
                </div>
            </header>

            <section className="stats-grid">
                <div className="stat-card">
                    <p className="scheme-body">Active Opportunities</p>
                    <h2 className="stat-value">{stats.active}</h2>
                </div>
                <div className="stat-card" style={{ gridColumn: 'span 2', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p className="scheme-body" style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>AI Research Briefing</p>
                    <p className="scheme-body" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        "Agri-tech and AI remain top priorities for DST and MeitY in 2026. Focus areas include Bio-AI, Green Hydrogen, and Inclusive Innovation. High-value grants like Bio AI (₹10Cr+) and India-France AI calls are currently open."
                    </p>
                </div>
                <div className="stat-card">
                    <p className="scheme-body">Total Tracked</p>
                    <h2 className="stat-value">{stats.total}</h2>
                </div>
                <div className="stat-card">
                    <p className="scheme-body">Closing Soon</p>
                    <h2 className="stat-value" style={{ color: '#ff6b6b' }}>{stats.closingSoon}</h2>
                </div>
            </section>

            <section className="schemes-grid">
                {opportunities.map((scheme, index) => (
                    <div key={index} className="scheme-card">
                        <span className={`status-badge status-${scheme.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {scheme.status}
                        </span>
                        <h3 className="scheme-title">{scheme.name}</h3>
                        <p className="scheme-body" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                            {scheme.body}
                        </p>
                        <p className="scheme-body">
                            {scheme.description}
                        </p>
                        <div className="scheme-footer">
                            <span className="award-amount">{scheme.maxAward}</span>
                            <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="btn-apply">
                                {scheme.status === 'Coming Soon' ? 'View Details' : 'Apply Now'}
                            </a>
                        </div>
                        <div className="deadline" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                            Deadline: {scheme.deadline}
                        </div>
                    </div>
                ))
                }
            </section >
        </div >
    );
};

export default Dashboard;
