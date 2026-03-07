/**
 * ABIF Deep Scraper — Comprehensive Funding IQ Agent
 * 
 * DESIGN PRINCIPLE:
 * Unlike the standard scraper which is optimized for speed, the Deep Scraper 
 * is optimized for accuracy and discovery. It runs overnight, takes its time,
 * uses AI to find and validate content, and crawls deeper into portals.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../public/data/opportunities.json');

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const MODEL_NAME = "gemini-1.5-pro"; // Upgraded for 2M context window

// --- CORE UTILS ---

async function randomDelay(min = 3000, max = 7000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(res => setTimeout(res, delay));
}

/**
 * Intelligent AI Discovery (v2.0 - Pro Mode)
 */
async function aiDetectOpportunities(page) {
    if (!genAI) return [];

    try {
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 50000));
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });
        const prompt = `You are the ABIF Funding Intelligence Agent. Analyze the following webpage text and extract all ACTIVE funding opportunities, grants, or schemes for Indian Startups or Incubators.
        
        Text: ${bodyText}
        
        Return a JSON array of objects with these keys: 
        - name: Full name of the scheme
        - body: Providing organization
        - deadline: Deadline if mentioned (else "Rolling")
        - maxAward: Funding amount if mentioned
        - description: Brief 1-sentence summary
        - targetAudience: Array including 'startup' or 'incubator'
        - category: One of 'national', 'international', 'state', or 'csr'
        - detailUrl: If the text contains a specific link/URL for more details on this scheme, include it.
        
        Return an empty array [] if no active grants are found. Only return JSON.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(text);
    } catch (e) {
        console.error('    ❌ AI Detection/Validation failed:', e.message);
        return [];
    }
}

/**
 * AI-Powered Fuzzy Deduplication
 */
async function aiIsDuplicate(candidateName, existingNames) {
    if (!genAI || existingNames.length === 0) return false;

    // Direct match check first
    if (existingNames.some(name => name.toLowerCase() === candidateName.toLowerCase())) return true;

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `Compare these funding scheme names. Do they refer to the SAME scheme?
        
        New Candidate: "${candidateName}"
        Existing Schemes: ${JSON.stringify(existingNames.slice(-40))}
        
        Respond ONLY with "YES" if it is a duplicate or very similar variant, "NO" otherwise.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim().toUpperCase();
        return response.includes('YES');
    } catch (e) {
        console.error('    ❌ Fuzzy Deduplication failed:', e.message);
        return false;
    }
}

// --- TARGET SCRAPERS ---

async function deepScanBIRAC(browser) {
    console.log('🔍 Deep Scanning: BIRAC Portals...');
    const page = await browser.newPage();
    try {
        await page.goto('https://birac.nic.in/cfp.php', { waitUntil: 'domcontentloaded', timeout: 90000 });
        const html = await page.content();
        const $ = cheerio.load(html);
        const schemes = [];

        $('table#current tbody tr').each((i, el) => {
            const anchor = $(el).find('td:nth-child(2) a').first();
            const name = anchor.text().trim();
            const link = anchor.attr('href');
            if (name) {
                schemes.push({
                    name,
                    link: link ? (link.startsWith('http') ? link : `https://birac.nic.in/${link}`) : 'https://birac.nic.in/cfp.php',
                    body: 'BIRAC (DBT)',
                    status: 'Open',
                    targetAudience: ['startup'],
                    dataSource: 'scraper:deep:birac'
                });
            }
        });
        return schemes;
    } catch (e) {
        console.error('    ❌ BIRAC scan failed:', e.message);
        return [];
    } finally {
        await page.close();
    }
}

async function deepScanStartupIndia(browser) {
    console.log('🔍 Deep Scanning: Startup India Portals...');
    const page = await browser.newPage();
    try {
        const sites = [
            'https://seedfund.startupindia.gov.in/',
            'https://www.startupindia.gov.in/content/sih/en/reources.html'
        ];

        const allSchemes = [];
        for (const site of sites) {
            console.log(`    🌐 Crawling: ${site}`);
            await page.goto(site, { waitUntil: 'networkidle2', timeout: 90000 });
            const aiFound = await aiDetectOpportunities(page);
            aiFound.forEach(s => {
                s.link = site;
                s.dataSource = 'scraper:deep:ai';
            });
            allSchemes.push(...aiFound);
            await randomDelay();
        }
        return allSchemes;
    } catch (e) {
        console.error('    ❌ Startup India scan failed:', e.message);
        return [];
    } finally {
        await page.close();
    }
}

// --- MAIN ---

async function main() {
    console.log('\n🚀 Starting ABIF Deep Intelligence Scan (v2.0 - Pro Mode)...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const [birac, startupIndia] = await Promise.all([
            deepScanBIRAC(browser),
            deepScanStartupIndia(browser)
        ]);

        const rawResults = [...birac, ...startupIndia];
        console.log(`\n✅ Deep Scan complete. Found ${rawResults.length} candidates.`);

        if (fs.existsSync(DATA_FILE)) {
            const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const existingNames = existingData.map(d => d.name);
            const mergedData = [...existingData];

            console.log('🧠 Running AI Fuzzy Deduplication & Metadata Enrichment...');
            for (const item of rawResults) {
                // Skip if exact name exists
                if (existingNames.includes(item.name)) {
                    const idx = mergedData.findIndex(d => d.name === item.name);
                    mergedData[idx] = { ...mergedData[idx], ...item, lastScanned: new Date().toISOString() };
                    continue;
                }

                // Check for fuzzy duplicates (batching or individual as needed, here individual for Pro accuracy)
                const isFuzzyDup = await aiIsDuplicate(item.name, existingNames);
                if (isFuzzyDup) {
                    console.log(`   ⏩ Fuzzy Skip: "${item.name}" (Duplicate of existing mandate)`);
                    continue;
                }

                console.log(`   ✨ New Discovery: "${item.name}"`);
                mergedData.push({
                    ...item,
                    category: item.category || 'national',
                    lastScanned: new Date().toISOString(),
                    dataSource: item.dataSource || 'scraper:deep:ai'
                });
            }

            fs.writeFileSync(DATA_FILE, JSON.stringify(mergedData, null, 4));
            console.log(`\n📁 Data synchronized. Total opportunities: ${mergedData.length}`);
        } else {
            fs.writeFileSync(DATA_FILE, JSON.stringify(rawResults, null, 4));
        }

    } catch (e) {
        console.error('❌ Deep Scraper Failed:', e);
    } finally {
        await browser.close();
        console.log('👋 Scan agent deactivated.');
    }
}

main();
