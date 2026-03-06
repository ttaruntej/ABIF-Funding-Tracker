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

    const match = deadlineStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) {
        const [_, day, month, year] = match;
        const deadlineDate = new Date(`${year}-${month}-${day}`);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Closed';
        if (diffDays <= 7) return 'Closing Soon';
        return 'Open';
    }

    return 'Open';
}


// --- Scrapers ---

async function scrapeBirac(browser) {
    console.log('--- Scraping BIRAC ---');
    const url = 'https://birac.nic.in/cfp.php';
    const opportunities = [];

    try {
        const page = await browser.newPage();
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        const html = await page.content();
        const $ = cheerio.load(html);

        $('table#current tbody tr').each((i, el) => {
            const anchor = $(el).find('td:nth-child(2) a');
            const name = anchor.text().trim();
            const relativeLink = anchor.attr('href');
            const link = relativeLink ? (relativeLink.startsWith('http') ? relativeLink : `https://birac.nic.in/${relativeLink}`) : url;

            const smallText = $(el).find('td:nth-child(2) small').text().trim();
            let amountStr = "Grant matching scale";
            let deadlineStr = smallText || "Check website for details";

            const status = determineStatus(smallText);

            if (name) {
                opportunities.push({
                    name: name,
                    provider: 'BIRAC (DBT)',
                    amount: amountStr,
                    deadline: deadlineStr,
                    link: link,
                    category: 'National',
                    status: status,
                    lastScraped: new Date().toISOString()
                });
            }
        });

        console.log(`Found ${opportunities.length} opportunities from BIRAC.`);
        await page.close();
    } catch (error) {
        console.error('Error scraping BIRAC:', error.message);
    }
    return opportunities;
}

async function scrapeSISFS() {
    console.log('--- Checking SISFS ---');
    // Static record since it's a permanently rolling React SPA
    return [
        {
            name: "Startup India Seed Fund Scheme",
            provider: "DPIIT",
            amount: "Up to ₹50 Lakhs",
            deadline: "Rolling (Open All Year)",
            link: "https://seedfund.startupindia.gov.in/",
            category: "National",
            status: "Rolling",
            lastScraped: new Date().toISOString()
        }
    ];
}

// --- Data Merging ---

function mergeData(existingDataArray, newDataArray) {
    console.log('Merging data...');
    const mergedObj = {};

    // Convert existing array to a map keyed by link
    existingDataArray.forEach(item => {
        mergedObj[item.link] = item;
    });

    newDataArray.forEach(newItem => {
        const existingByName = Object.values(mergedObj).find(x => x.name === newItem.name);

        if (mergedObj[newItem.link]) {
            mergedObj[newItem.link] = { ...mergedObj[newItem.link], ...newItem };
        } else if (existingByName) {
            mergedObj[existingByName.link] = { ...existingByName, ...newItem };
            mergedObj[existingByName.link].link = newItem.link;
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
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    } catch (err) {
        console.error("Failed to launch puppeteer:", err);
        return;
    }

    const newBirac = await scrapeBirac(browser);
    const newSisfs = await scrapeSISFS();

    await browser.close();

    const allScraped = [...newBirac, ...newSisfs];

    if (allScraped.length === 0) {
        console.log('No data scraped. Exiting without changing existing data.');
        return;
    }

    let existingData = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            existingData = JSON.parse(raw);
            if (!Array.isArray(existingData)) {
                // Backward compatibility if it was an object
                existingData = existingData.opportunities || [];
            }
        } catch (e) {
            console.error("Could not parse existing data file. Starting fresh.", e);
        }
    }

    const updatedData = mergeData(existingData, allScraped);

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2));
    console.log(`Scraping complete! Saved ${updatedData.length} opportunities to ${DATA_FILE}.`);
}

runScrapers();
