import fs from 'fs';
import path from 'path';

const DATA_FILE = 'public/data/opportunities.json';
const NEW_FINDS_FILE = 'scripts/global_finds.json';

function getSimilarityScore(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = new Set(str1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const s2 = new Set(str2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    if (s1.size === 0 || s2.size === 0) return 0;
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    return intersection.size / union.size;
}

try {
    const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const newFinds = JSON.parse(fs.readFileSync(NEW_FINDS_FILE, 'utf8'));
    const existingNames = existingData.map(d => d.name);

    const mergedData = [...existingData];
    let addCount = 0;

    for (const item of newFinds) {
        const isExactDup = existingNames.some(ext => ext.toLowerCase() === item.name.toLowerCase());
        if (isExactDup) {
            console.log(`⏩ Exact Skip: ${item.name}`);
            continue;
        }

        let maxSim = 0;
        let matchName = '';
        for (const ext of existingNames) {
            const sim = getSimilarityScore(item.name, ext);
            if (sim > maxSim) {
                maxSim = sim;
                matchName = ext;
            }
        }

        if (maxSim > 0.85) {
            console.log(`⏩ Vector Skip: ${item.name} (Sim: ${Math.round(maxSim * 100)}% with "${matchName}")`);
            continue;
        }

        console.log(`✨ Adding: ${item.name}`);
        mergedData.push({
            ...item,
            lastScanned: new Date().toISOString()
        });
        addCount++;
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(mergedData, null, 2));
    console.log(`\n✅ Merge complete. Added ${addCount} new mandates. Total items: ${mergedData.length}`);
} catch (err) {
    console.error(`❌ Error merging data: ${err.message}`);
    process.exit(1);
}
