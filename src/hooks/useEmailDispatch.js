import { useState } from 'react';
import { triggerEmail, getEmailStatus } from '../services/api';

export const useEmailDispatch = (addLog) => {
    const [emailNotification, setEmailNotification] = useState(null);
    const [dispatching, setDispatching] = useState(false);
    const [lastEmailDispatchTs, setLastEmailDispatchTs] = useState(() => {
        try { return localStorage.getItem('lastEmailDispatchTs') || null; } catch (e) { return null; }
    });

    const [emailCooldown, setEmailCooldown] = useState(0);

    const handleEmailTrigger = async (targetEmails) => {
        if (dispatching || emailCooldown > 0) return;
        try {
            setDispatching(true);
            setEmailCooldown(60); // Start 60s cooldown

            // Cooldown ticker
            const cooldownTimer = setInterval(() => {
                setEmailCooldown(c => {
                    if (c <= 1) {
                        clearInterval(cooldownTimer);
                        return 0;
                    }
                    return c - 1;
                });
            }, 1000);

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

    return {
        emailNotification,
        dispatching,
        emailCooldown,
        lastEmailDispatchTs,
        handleEmailTrigger
    };
};
