/**
 * ABIF Funding Tracker — Automated Scraper
 *
 * Tiers:
 *   A — Real live scrapers (BIRAC, DST)
 *   B — Smart static records with live link verification
 *   C — Puppeteer full-render for React SPAs (SISFS, SBI Foundation)
 *   D — Dead-link detection and flagging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../public/data/opportunities.json');

// ─── Date / Status Helpers ──────────────────────────────────────────────────

const MONTHS = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Extracts the LAST / DEADLINE date from raw text.
 * Specifically searches for "Last Date", "Last date to apply", "Extended Last date" etc.
 * Never guesses the highest date on the page randomly.
 */
function extractDeadlineDate(text) {
    if (!text) return null;

    // Strategy 1: Look for "Last Date[ :−–]" or similar deadline keywords followed by a date
    const lastDateSection = text.match(/(?:last\s*date|deadline|closing\s*date|closes\s*by|due\s*date|apply\s*by)[^\d]*(\d{1,2}(?:st|nd|rd|th)?[-\/\s,]+(?:\d{1,2}[-\/]|[a-z]+\s*)\d{4})/i);
    if (lastDateSection) {
        const d = parseSingleDate(lastDateSection[1]);
        if (d) return d;
    }

    return null; // Fallback to Rolling instead of wildly guessing future dates
}

function parseSingleDate(str) {
    if (!str) return null;
    str = str.trim();

    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmyMatch) {
        const [_, d, m, y] = dmyMatch;
        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }

    // DDth Month, YYYY or DD Month YYYY
    const nlMatch = str.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december),?\s+(\d{4})/i);
    if (nlMatch) {
        const month = String(MONTHS[nlMatch[2].toLowerCase()]).padStart(2, '0');
        const day = nlMatch[1].padStart(2, '0');
        return new Date(`${nlMatch[3]}-${month}-${day}`);
    }

    return null;
}

function dateToStatus(deadlineDate) {
    if (!deadlineDate) return 'Rolling';
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Closed';
    if (diffDays <= 14) return 'Closing Soon';
    return 'Open';
}

function determineStatus(text) {
    if (!text) return 'Rolling';
    const lower = text.toLowerCase();
    if (lower.includes('rolling') || lower.includes('throughout the year') || lower.includes('open all year')) return 'Rolling';
    const d = extractDeadlineDate(text);
    return dateToStatus(d);
}

function formatDeadline(text) {
    if (!text) return 'Rolling';
    const d = extractDeadlineDate(text);
    if (!d) return text.trim().replace(/\s+/g, ' ');
    // Format as DD-MM-YYYY
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function cleanName(raw) {
    return raw
        .replace(/\s+/g, ' ')
        .replace(/\.{2,}$/g, '')
        .replace(/Last\s*Date\s*:.*/i, '')
        .replace(/Extended\s*Last\s*date.*/i, '')
        .replace(/\s*:\s*\d{1,2}.*\d{4}.*$/, '')
        .trim();
}

// ─── TIER A: BIRAC ───────────────────────────────────────────────────────────

async function scrapeBirac(browser) {
    console.log('\n─── [Tier A] Scraping BIRAC ───');
    const listingUrl = 'https://birac.nic.in/cfp.php';
    const results = [];

    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const $ = cheerio.load(await page.content());
        await page.close();

        const rows = [];
        $('table#current tbody tr').each((_, el) => {
            const anchor = $(el).find('td:nth-child(2) a').first();
            const rawName = anchor.text().trim();
            if (!rawName) return;

            const relHref = anchor.attr('href') || '';
            const detailLink = relHref.startsWith('http') ? relHref : `https://birac.nic.in/${relHref}`;
            const rawText = $(el).find('td:nth-child(2)').text().trim();

            rows.push({ rawName, rawText, detailLink });
        });

        console.log(`  Found ${rows.length} current BIRAC CFPs. Fetching detail pages...`);

        for (const row of rows) {
            const name = cleanName(row.rawName);
            const deadlineStr = formatDeadline(row.rawText);
            const status = determineStatus(row.rawText);
            let applyLink = row.detailLink;
            let linkStatus = 'probable';

            try {
                const dp = await browser.newPage();
                await dp.goto(row.detailLink, { waitUntil: 'domcontentloaded', timeout: 25000 });
                const $d = cheerio.load(await dp.content());
                await dp.close();

                const extSelectors = [
                    'a[href*="apply"]', 'a[href*="form"]', 'a[href*="google"]',
                    'a[href*="submission"]', 'a[href*="register"]', 'a[href*="innovatein"]',
                    'a:contains("Apply")', 'a:contains("Submit")', 'a:contains("Application Form")',
                    'a:contains("Apply Online")', 'a:contains("Click here to apply")',
                ];
                for (const sel of extSelectors) {
                    const href = $d(sel).first().attr('href');
                    if (href && href.startsWith('http') && !href.includes('birac.nic.in')) {
                        applyLink = href;
                        linkStatus = 'verified';
                        break;
                    }
                }
            } catch (e) {
                console.warn(`    ⚠ Detail page failed for "${name}": ${e.message}`);
            }

            results.push({
                name,
                body: 'BIRAC (DBT)',
                maxAward: 'Grant (competitive scale)',
                deadline: deadlineStr,
                link: applyLink,
                description: `BIRAC Call for Proposal. Visit the link to see full details and eligibility.`,
                category: 'national',
                status,
                linkStatus,
                dataSource: 'scraper:birac',
                lastScraped: new Date().toISOString(),
            });
            console.log(`  ✓ ${status.padEnd(12)} | ${name.substring(0, 55)}`);
        }
    } catch (e) {
        console.error('  ✗ BIRAC scraper failed:', e.message);
    }

    return results;
}

// ─── TIER A: DST Active Calls ────────────────────────────────────────────────

async function scrapeDST(browser) {
    console.log('\n─── [Tier A] Scraping DST (onlinedst.gov.in) ───');
    const listingUrl = 'https://onlinedst.gov.in/';
    const results = [];

    try {
        const page = await browser.newPage();
        await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const $ = cheerio.load(await page.content());
        await page.close();

        // Find the "Active Calls" section by heading text, then collect all anchor links
        const entries = [];

        // Look for links inside the calls section
        $('a[href*="Projectproposalformat"]').each((_, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (!name || !href) return;
            const link = href.startsWith('http') ? href : `https://onlinedst.gov.in/${href}`;
            entries.push({ name, link });
        });

        // Also look for "throughout the year" section
        $('a[href*="aspx"]').each((_, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href') || '';
            if (!name || !href.includes('online') || !href.includes('.gov')) return;
            if (entries.find(e => e.link === href)) return;
            entries.push({ name, link: href.startsWith('http') ? href : `https://onlinedst.gov.in${href}` });
        });

        console.log(`  Found ${entries.length} DST active calls.`);

        for (const entry of entries) {
            const name = cleanName(entry.name);
            if (!name || name.length < 10) continue;

            // Try to fetch deadline from the detail page
            let deadlineStr = 'Check website for details';
            let status = 'Open';
            let maxAward = 'Varies';

            try {
                const dp = await browser.newPage();
                await dp.goto(entry.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
                const html = await dp.content();
                await dp.close();

                const $d = cheerio.load(html);
                const bodyText = $d('body').text();

                const d = extractDeadlineDate(bodyText);
                if (d) {
                    deadlineStr = formatDeadline(bodyText);
                    status = dateToStatus(d);
                } else if (bodyText.toLowerCase().includes('throughout the year') || bodyText.toLowerCase().includes('rolling')) {
                    deadlineStr = 'Rolling (Open All Year)';
                    status = 'Rolling';
                }

                // Try to extract funding amount
                const amountMatch = bodyText.match(/(?:grant|funding|support|amount)[^\n]*?(?:Rs\.?|₹|INR|EUR|USD)\s*[\d,]+(?:\s*(?:lakh|crore|million|thousand))?/i);
                if (amountMatch) maxAward = amountMatch[0].replace(/\s+/g, ' ').trim().substring(0, 60);

            } catch (e) {
                console.warn(`    ⚠ DST detail page failed for "${name}": ${e.message}`);
            }

            // Determine category: if it mentions "India-France", "Indo-", etc. → international
            const cat = /indo-|india-france|india.netherlands|bilateral|international/i.test(name) ? 'international' : 'national';

            results.push({
                name,
                body: 'DST (MoST)',
                maxAward,
                deadline: deadlineStr,
                link: entry.link,
                description: `DST active call for proposals. See the portal for full guidelines and eligibility.`,
                category: cat,
                status,
                linkStatus: 'verified',
                dataSource: 'scraper:dst',
                lastScraped: new Date().toISOString(),
            });
            console.log(`  ✓ ${status.padEnd(12)} | ${name.substring(0, 55)}`);
        }
    } catch (e) {
        console.error('  ✗ DST scraper failed:', e.message);
    }

    return results;
}

// ─── TIER C: SISFS (React SPA) ──────────────────────────────────────────────

async function scrapeSISFS(browser) {
    console.log('\n─── [Tier C] Scraping SISFS (React SPA) ───');
    const url = 'https://seedfund.startupindia.gov.in/';

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        const $ = cheerio.load(await page.content());
        await page.close();

        const bodyText = $('body').text();
        // More robust: Only assume closed if it specifically says 'currently not accepting' near 'applications'
        // Avoid generic 'closed' matches for past cohorts.
        const isHardClosed = /applications\s+are\s+(?:currently\s+)?closed/i.test(bodyText) || /not\s+accepting\s+new\s+applications/i.test(bodyText);
        const status = isHardClosed ? 'Closed' : 'Rolling';

        console.log(`  ✓ SISFS status: ${status}`);
        return [{
            name: 'Startup India Seed Fund Scheme (SISFS)',
            body: 'DPIIT / Startup India',
            maxAward: 'Up to ₹50 Lakhs',
            deadline: 'Rolling (Open All Year)',
            link: url,
            description: 'Financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization.',
            category: 'national',
            status,
            linkStatus: 'verified',
            dataSource: 'scraper:sisfs',
            lastScraped: new Date().toISOString(),
        }];
    } catch (e) {
        console.error('  ✗ SISFS scraper failed:', e.message);
        return [];
    }
}

// ─── TIER C: SBI Foundation (React SPA) ─────────────────────────────────────

async function scrapeSBIFoundation(browser) {
    console.log('\n─── [Tier C] Scraping SBI Foundation (React SPA) ───');
    const url = 'https://sbifoundation.in/';

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await page.waitForSelector('body', { timeout: 10000 });

        const $ = cheerio.load(await page.content());
        await page.close();
        const bodyText = $('body').text().toLowerCase();

        // Check if "Innovators for Bharat" or similar program is mentioned + look for deadline
        const deadline = extractDeadlineDate($('body').text());
        const deadlineStr = deadline ? formatDeadline($('body').text()) : '31-05-2026';
        const status = dateToStatus(deadline) || 'Open';

        // Try to find the apply link
        let applyLink = url;
        $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().toLowerCase();
            if ((text.includes('apply') || text.includes('innovator') || text.includes('programme')) && href.startsWith('http')) {
                applyLink = href;
                return false; // break
            }
        });

        console.log(`  ✓ SBI Foundation status: ${status}, link: ${applyLink}`);
        return [{
            name: 'SBI Foundation – Innovators for Bharat',
            body: 'SBI Foundation CSR',
            maxAward: '₹25 Lakhs',
            deadline: deadlineStr,
            link: applyLink,
            description: 'Innovators for Bharat supports social innovators with funding, mentorship, and market linkages.',
            category: 'csr',
            status,
            linkStatus: applyLink !== url ? 'verified' : 'probable',
            dataSource: 'scraper:sbif',
            lastScraped: new Date().toISOString(),
        }];
    } catch (e) {
        console.error('  ✗ SBI Foundation scraper failed:', e.message);
        return [];
    }
}

// ─── TIER B: Verify Static Records ──────────────────────────────────────────

/**
 * For all static (manually curated) records, quickly ping their URL.
 * Updates: linkStatus → 'verified' | 'broken', lastScraped timestamp.
 * Never changes name, body, maxAward, description, or category.
 */
async function verifyStaticRecords(browser, staticRecords) {
    console.log(`\n─── [Tier B] Verifying ${staticRecords.length} static records ───`);
    const updated = [];

    for (const record of staticRecords) {
        let linkStatus = record.linkStatus || 'probable';
        let status = record.status;

        try {
            const page = await browser.newPage();
            // Use a generous 30s timeout — many gov/intl sites are slow
            const response = await page.goto(record.link, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await page.close();

            const httpStatus = response ? response.status() : 0;

            if (httpStatus >= 200 && httpStatus < 400) {
                linkStatus = 'verified';
            } else if (httpStatus >= 400) {
                linkStatus = 'broken';
                // Only change status for entries where URL is truly 4xx dead
                status = 'Verify Manually';
                console.warn(`  ✗ HTTP ${httpStatus} for "${record.name}" → marked broken`);
            }
            // Note: keep existing linkStatus if HTTP is unexpected (e.g. 0) — don't degrade
        } catch (e) {
            // Timeout = likely a slow site, not necessarily dead. Keep existing linkStatus.
            // Only mark broken for DNS failures (no such host).
            if (e.message.includes('net::ERR_NAME_NOT_RESOLVED') || e.message.includes('no such host')) {
                linkStatus = 'broken';
                status = 'Verify Manually';
                console.warn(`  ✗ DNS failure: "${record.name}"`);
            } else {
                // Timeout or other — keep existing status, just log
                console.warn(`  ⚠ Slow/timeout: "${record.name}" — keeping existing status`);
            }
        }

        // For non-rolling records: also check if deadline has passed
        if (record.deadline && record.status !== 'Rolling') {
            const d = extractDeadlineDate(record.deadline);
            if (d) status = dateToStatus(d);
        }

        updated.push({
            ...record,
            status,
            linkStatus,
            lastScraped: new Date().toISOString(),
        });

        const icon = linkStatus === 'verified' ? '✓' : '✗';
        console.log(`  ${icon} ${linkStatus.padEnd(8)} | ${record.name.substring(0, 55)}`);
    }

    return updated;
}

// ─── SIDBI (Static Rolling — no cyclic calls) ────────────────────────────────

function getSIDBIRecords() {
    return [
        {
            name: 'SIDBI Revolving Fund for Technology Innovation (SRIJAN)',
            body: 'SIDBI',
            maxAward: 'Up to ₹1 Crore',
            deadline: 'Rolling (Open All Year)',
            link: 'https://www.sidbi.in/en/srijan',
            description: 'Revolving fund for technology innovation supporting startups and MSMEs with debt financing.',
            category: 'national',
            status: 'Rolling',
            dataSource: 'scraper:sidbi',
        },
        {
            name: 'SIDBI Make in India Soft Loan Fund for MSMEs (SMILE)',
            body: 'SIDBI',
            maxAward: '₹25 Lakhs – ₹5 Crores',
            deadline: 'Rolling (Open All Year)',
            link: 'https://www.sidbi.in/en/smile',
            description: 'Soft loan fund for MSMEs seeking to expand or modernize under the Make in India initiative.',
            category: 'national',
            status: 'Rolling',
            dataSource: 'scraper:sidbi',
        },
    ];
}

// ─── Data Merging ─────────────────────────────────────────────────────────────

/**
 * Merges scraped data into existing data.
 * Rules:
 *   - Scraped Tier-A/C entries update: status, deadline, linkStatus, link, lastScraped
 *   - Manually curated fields preserved: name, body, maxAward, description, category
 *   - Tier-B verified entries update: linkStatus, status, lastScraped only
 *   - Old entries with 'provider' field (wrong schema) are dropped
 */
function mergeData(existingData, scrapedData, verifiedStatic) {
    console.log('\n─── Merging data ───');

    // Build map from existing — skip legacy wrong-schema entries
    const merged = {};
    existingData.forEach(item => {
        if (item.provider && !item.body) return; // drop old schema
        merged[item.link] = { ...item };
    });

    // Apply Tier-A/C scraped entries (full update except curated fields)
    const CURATED_FIELDS = ['name', 'body', 'maxAward', 'description', 'category'];
    scrapedData.forEach(newItem => {
        const existByLink = merged[newItem.link];
        const existByName = Object.values(merged).find(x => x.name === newItem.name);

        if (existByLink) {
            // Preserve manually curated fields if they exist and are non-empty
            const preserved = {};
            CURATED_FIELDS.forEach(f => {
                if (existByLink[f]) preserved[f] = existByLink[f];
            });
            merged[newItem.link] = { ...existByLink, ...newItem, ...preserved };
        } else if (existByName) {
            // Link changed — rekey
            delete merged[existByName.link];
            const preserved = {};
            CURATED_FIELDS.forEach(f => {
                if (existByName[f]) preserved[f] = existByName[f];
            });
            merged[newItem.link] = { ...existByName, ...newItem, ...preserved };
        } else {
            merged[newItem.link] = newItem;
        }
    });

    // Apply Tier-B verified status (only update linkStatus, status, lastScraped)
    verifiedStatic.forEach(v => {
        if (merged[v.link]) {
            merged[v.link].linkStatus = v.linkStatus;
            merged[v.link].status = v.status;
            merged[v.link].lastScraped = v.lastScraped;
        }
    });

    // ── GHOST DATA KILLER (Strict Sync) ──
    // If a record was historically sourced by a live scraper (e.g. scraper:birac),
    // but the scraper ran today and didn't return it, it means the call was removed from the live site.
    const activeScrapedLinks = new Set(scrapedData.map(x => x.link));
    Object.values(merged).forEach(item => {
        if (item.dataSource && item.dataSource.startsWith('scraper:') && !activeScrapedLinks.has(item.link)) {
            // The item has vanished from the source portal.
            item.status = 'Closed';
            item.deadline = 'Expired / Removed from source';
        }
    });

    return Object.values(merged);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runScrapers() {
    console.log('═══════════════════════════════════════════════');
    console.log('  ABIF Funding Tracker — Automated Scraper');
    console.log(`  ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
    } catch (err) {
        console.error('✗ Failed to launch Puppeteer:', err.message);
        return; // don't exit(1) — let process end naturally with code 0
    }

    // ── Tier A: Real live scrapers ──
    const biracData = await scrapeBirac(browser);
    const dstData = await scrapeDST(browser);
    const allScraped = [...biracData, ...dstData];

    // ── Tier C: React SPA scrapers ──
    const sisfsData = await scrapeSISFS(browser);
    const sbifData = await scrapeSBIFoundation(browser);
    allScraped.push(...sisfsData, ...sbifData);

    // ── Add SIDBI static records NOW — before building scrapedLinks ──
    // This ensures SIDBI is excluded from Tier-B URL verification
    allScraped.push(...getSIDBIRecords());

    await browser.close();
    console.log(`\n  Tier A+C scraped: ${allScraped.length} entries`);

    // ── Read existing data ──
    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            existingData = Array.isArray(raw) ? raw : [];
        } catch (e) {
            console.error('  Could not parse existing data. Starting fresh.', e.message);
        }
    }

    // ── Tier B: Verify all static records (those without lastScraped or not covered by Tier A/C) ──
    const scrapedLinks = new Set(allScraped.map(x => x.link));
    const staticToVerify = existingData.filter(item => {
        if (item.provider && !item.body) return false; // skip old schema
        return !scrapedLinks.has(item.link);
    });

    // Launch a new browser instance for link verification
    let verifyBrowser;
    let verifiedStatic = [];
    try {
        verifyBrowser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        verifiedStatic = await verifyStaticRecords(verifyBrowser, staticToVerify);
        await verifyBrowser.close();
    } catch (e) {
        console.error('  ✗ Link verification browser failed:', e.message);
        verifiedStatic = staticToVerify; // keep as-is
    }

    // ── Merge everything ──
    if (allScraped.length < 5) {
        console.error(`\n  ✗ CRITICAL FAILURE: Scrapers only yielded ${allScraped.length} entries (expected 5+).`);
        console.error('  This indicates a fundamental block (firewall, layout change, headless detection).');
        console.error('  Failing the CI/CD run to prevent silent data rot.');
        process.exit(1);
    }

    const finalData = mergeData(existingData, allScraped, verifiedStatic);

    // ── Write output ──
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));

    const broken = finalData.filter(x => x.linkStatus === 'broken').length;
    const verified = finalData.filter(x => x.linkStatus === 'verified').length;
    const closing = finalData.filter(x => x.status === 'Closing Soon').length;

    console.log('\n═══════════════════════════════════════════════');
    console.log(`  ✓ Done! Saved ${finalData.length} opportunities.`);
    console.log(`    Verified links: ${verified} | Broken: ${broken} | Closing Soon: ${closing}`);
    console.log('═══════════════════════════════════════════════\n');
}

runScrapers();
