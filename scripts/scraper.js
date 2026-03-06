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

// --- Helper Functions ---

function determineStatus(deadlineStr) {
    if (!deadlineStr || deadlineStr.toLowerCase().includes('rolling') || deadlineStr.toLowerCase().includes('throughout the year')) {
        return 'Rolling';
    }

    // Match DD-MM-YYYY or DD/MM/YYYY
    const match = deadlineStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        const deadlineDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        const today = new Date();
        const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Closed';
        if (diffDays <= 14) return 'Closing Soon';
        return 'Open';
    }

    return 'Open';
}

function cleanName(raw) {
    return raw
        .replace(/\s+/g, ' ')     // collapse whitespace
        .replace(/\.{3,}$/g, '')   // strip trailing ellipsis
        .replace(/Last Date\s*:.*$/i, '') // strip inline deadline text
        .trim();
}

// --- Scrapers ---

async function scrapeBirac(browser) {
    console.log('--- Scraping BIRAC ---');
    const listingUrl = 'https://birac.nic.in/cfp.php';
    const opportunities = [];

    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        console.log(`Navigating to ${listingUrl}...`);
        await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const html = await page.content();
        const $ = cheerio.load(html);

        // Collect rows first
        const rows = [];
        $('table#current tbody tr').each((i, el) => {
            const anchor = $(el).find('td:nth-child(2) a');
            const rawName = anchor.text().trim();
            const name = cleanName(rawName);
            const relativeLink = anchor.attr('href');
            const detailLink = relativeLink
                ? (relativeLink.startsWith('http') ? relativeLink : `https://birac.nic.in/${relativeLink}`)
                : listingUrl;

            const smallText = $(el).find('td:nth-child(2) small').text().trim();
            const deadlineStr = smallText || 'Check website for details';
            const status = determineStatus(smallText);

            if (name) {
                rows.push({ name, detailLink, deadlineStr, status });
            }
        });

        console.log(`Found ${rows.length} BIRAC CFP rows. Fetching detail pages for apply links...`);
        await page.close();

        // Visit each detail page to find the actual apply/form link
        for (const row of rows) {
            let applyLink = row.detailLink; // fallback: the detail page itself
            try {
                const detailPage = await browser.newPage();
                await detailPage.goto(row.detailLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
                const detailHtml = await detailPage.content();
                const $d = cheerio.load(detailHtml);

                // Look for "Apply" / "Application" anchor pointing to an external URL or a form
                const applySelectors = [
                    'a[href*="apply"]',
                    'a[href*="form"]',
                    'a[href*="google"]',
                    'a[href*="submission"]',
                    'a[href*="register"]',
                    'a:contains("Apply")',
                    'a:contains("Submit")',
                    'a:contains("Application Form")',
                ];
                for (const sel of applySelectors) {
                    const found = $d(sel).first();
                    const href = found.attr('href');
                    if (href && href.startsWith('http') && !href.includes('birac.nic.in')) {
                        applyLink = href;
                        break;
                    }
                    // Also accept birac.nic.in links that look like application portals
                    if (href && href.includes('birac.nic.in') && (href.includes('form') || href.includes('apply') || href.includes('registration'))) {
                        applyLink = href.startsWith('http') ? href : `https://birac.nic.in/${href}`;
                        break;
                    }
                }
                await detailPage.close();
            } catch (err) {
                console.warn(`  Could not fetch detail page for "${row.name}": ${err.message}`);
            }

            opportunities.push({
                name: row.name,
                body: 'BIRAC (DBT)',
                maxAward: 'Grant (competitive scale)',
                deadline: row.deadlineStr,
                link: applyLink,
                category: 'national',
                status: row.status,
                linkStatus: applyLink !== row.detailLink ? 'verified' : 'probable',
                lastScraped: new Date().toISOString(),
            });

            console.log(`  ✓ "${row.name}" → ${applyLink}`);
        }

        console.log(`BIRAC: processed ${opportunities.length} opportunities.`);
    } catch (error) {
        console.error('Error scraping BIRAC:', error.message);
    }
    return opportunities;
}

async function scrapeSISFS() {
    console.log('--- Checking SISFS ---');
    // Permanently rolling React SPA — static record
    return [
        {
            name: 'Startup India Seed Fund Scheme (SISFS)',
            body: 'DPIIT / Startup India',
            maxAward: 'Up to ₹50 Lakhs',
            deadline: 'Rolling (Open All Year)',
            link: 'https://seedfund.startupindia.gov.in/',
            category: 'national',
            status: 'Rolling',
            linkStatus: 'verified',
            lastScraped: new Date().toISOString(),
        },
    ];
}

async function scrapeSIDBI() {
    console.log('--- Checking SIDBI ---');
    return [
        {
            name: 'SIDBI Revolving Fund for Technology Innovation (SRIJAN)',
            body: 'SIDBI',
            maxAward: 'Up to ₹1 Crore',
            deadline: 'Rolling (Open All Year)',
            link: 'https://www.sidbi.in/en/srijan',
            category: 'national',
            status: 'Rolling',
            linkStatus: 'probable',
            lastScraped: new Date().toISOString(),
        },
        {
            name: 'SIDBI Make in India Soft Loan Fund for MSMEs (SMILE)',
            body: 'SIDBI',
            maxAward: '₹25 Lakhs – ₹5 Crores',
            deadline: 'Rolling (Open All Year)',
            link: 'https://www.sidbi.in/en/smile',
            category: 'national',
            status: 'Rolling',
            linkStatus: 'probable',
            lastScraped: new Date().toISOString(),
        },
    ];
}

// --- Data Merging ---

function mergeData(existingDataArray, newDataArray) {
    console.log('Merging data...');
    const mergedObj = {};

    // Seed from existing array, keyed by link
    existingDataArray.forEach(item => {
        // Skip legacy scraped entries that used old schema (have 'provider' key but not 'body')
        if (item.provider && !item.body) return;
        mergedObj[item.link] = item;
    });

    newDataArray.forEach(newItem => {
        const existingByName = Object.values(mergedObj).find(x => x.name === newItem.name);

        if (mergedObj[newItem.link]) {
            // Update existing entry by link, preserving manually curated fields not in scraper output
            mergedObj[newItem.link] = { ...mergedObj[newItem.link], ...newItem };
        } else if (existingByName) {
            // Entry moved to a new link — update and rekey
            delete mergedObj[existingByName.link];
            mergedObj[newItem.link] = { ...existingByName, ...newItem };
        } else {
            mergedObj[newItem.link] = newItem;
        }
    });

    return Object.values(mergedObj);
}

// --- Main Execution ---

async function runScrapers() {
    console.log('Starting automated scraping process...');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    } catch (err) {
        console.error('Failed to launch puppeteer:', err);
        return;
    }

    const newBirac = await scrapeBirac(browser);
    const newSisfs = await scrapeSISFS();
    const newSidbi = await scrapeSIDBI();

    await browser.close();

    const allScraped = [...newBirac, ...newSisfs, ...newSidbi];

    if (allScraped.length === 0) {
        console.log('No data scraped. Exiting without changing existing data.');
        return;
    }

    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            existingData = Array.isArray(parsed) ? parsed : (parsed.opportunities || []);
        } catch (e) {
            console.error('Could not parse existing data file. Starting fresh.', e);
        }
    }

    const updatedData = mergeData(existingData, allScraped);

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2));
    console.log(`Scraping complete! Saved ${updatedData.length} opportunities to ${DATA_FILE}.`);
}

runScrapers();
