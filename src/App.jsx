import React, { useState, useEffect } from 'react';
import './index.css';

const Dashboard = () => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, closingSoon: 0 });

    useEffect(() => {
        fetch('/data/opportunities.json')
            .then(res => res.json())
            .then(data => {
                setOpportunities(data);
                const active = data.filter(o => o.status === 'Open' || o.status === 'Rolling' || o.status === 'Coming Soon').length;
                const closing = data.filter(o => o.status === 'Closing Soon').length;
                setStats({ total: data.length, active, closingSoon: closing });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch opportunities:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div style={{ backgroundColor: '#020c1b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64ffda', fontFamily: 'Inter' }}>
            Loading ABIF Funding Tracker...
        </div>
    );

    return (
        <div className="dashboard-container animate-in">
            <header>
                <div className="logo">
                    <h1>ABIF</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Opportunities Tracker</p>
                </div>
                <div className="last-updated" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                    Last Refreshed: {new Date().toLocaleDateString()} 09:00 AM
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
