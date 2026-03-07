export const generateBriefing = (data) => {
    if (!data || data.length === 0) return {
        summary: "No opportunities currently tracked.",
        insights: [],
        highlight: null,
        status: 'dormant'
    };

    const activeData = data.filter(s => ['Open', 'Rolling', 'Closing Soon'].includes(s.status));
    const highValueData = activeData.filter(s => s.maxAward && /(Crore|Cr)/i.test(s.maxAward));

    // Sector Analysis
    const sectorCounts = {};
    activeData.forEach(s => {
        (s.sectors || []).forEach(sector => {
            sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        });
    });
    const sortedSectors = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a);
    const topSector = sortedSectors[0]?.[0] || 'Agnostic';

    // Provider Analysis
    const providerCounts = {};
    activeData.forEach(s => {
        if (s.body) {
            const provider = s.body.split('/')[0].split('(')[0].trim();
            providerCounts[provider] = (providerCounts[provider] || 0) + 1;
        }
    });
    const sortedProviders = Object.entries(providerCounts).sort(([, a], [, b]) => b - a);
    const mainDriver = sortedProviders[0]?.[0] || "Government portals";

    // Urgency Check
    const closingSoon = activeData.filter(s => s.status === 'Closing Soon').length;

    // Highest Award identified
    const topAward = highValueData.sort((a, b) => {
        const valA = parseFloat(a.maxAward.match(/\d+(\.\d+)?/)?.[0] || 0);
        const valB = parseFloat(b.maxAward.match(/\d+(\.\d+)?/)?.[0] || 0);
        return valB - valA;
    })[0];

    // Structured Insight generation
    return {
        summary: `Institutional research synthesis of ${activeData.length} active opportunities indicates primary traction in ${topSector} funding segments.`,
        insights: [
            `Strategic Note: ${mainDriver} is currently orchestrating the majority of institutional capital frameworks.`,
            `Liquidity Exposure: ${highValueData.length} active programs provide capital in the Crore-plus tier.`,
            closingSoon > 0
                ? `Operational Priority: ${closingSoon} initiatives are reaching cycle maturity within the next 14 days.`
                : "Stability Assessment: Consistent availability observed for rolling strategic programs."
        ],
        highlight: topAward ? {
            name: topAward.name,
            value: topAward.maxAward
        } : null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'active'
    };
};
