import { useState, useEffect } from 'react';
import { triggerScraper, getScraperStatus } from '../services/api';

export const useScraperSync = (addLog, loadData) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshSuccess, setRefreshSuccess] = useState(false);
    const [serverStatus, setServerStatus] = useState(null);
    const [syncStartTime, setSyncStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

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

    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleRefresh = async () => {
        if (isRefreshing || cooldown > 0) return;
        setIsRefreshing(true);
        setRefreshSuccess(false);
        setServerStatus('queued');
        setSyncStartTime(Date.now());
        setCooldown(60); // Start 60s cooldown
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

    const getScraperMessage = () => {
        if (serverStatus === 'completed') return "Finalizing Institutional Report...";
        if (elapsedTime < 5) return "Performing Strategic Synthesis...";
        if (elapsedTime < 15) return "Auditing Portfolio Portals...";
        if (elapsedTime < 25) return "Extracting Mandate Data...";
        return "Synthesizing Intelligence...";
    };

    const syncProgress = isRefreshing && !refreshSuccess
        ? Math.min(98, Math.floor((elapsedTime / 45) * 100))
        : refreshSuccess ? 100 : 0;

    return {
        isRefreshing,
        refreshSuccess,
        serverStatus,
        elapsedTime,
        syncProgress,
        cooldown,
        handleRefresh,
        getScraperMessage
    };
};
