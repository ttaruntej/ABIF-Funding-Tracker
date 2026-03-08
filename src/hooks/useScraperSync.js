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

    const getScraperMessage = () => {
        if (serverStatus === 'completed') return "Finalizing Institutional Report...";
        if (elapsedTime < 5) return "Performing Strategic Synthesis...";
        if (elapsedTime < 15) return "Auditing Portfolio Portals...";
        if (elapsedTime < 25) return "Extracting Mandate Data...";
        return "Synthesizing Intelligence...";
    };

    return {
        isRefreshing,
        refreshSuccess,
        serverStatus,
        elapsedTime,
        handleRefresh,
        getScraperMessage
    };
};
