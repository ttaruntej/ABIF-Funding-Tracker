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

// --- CORE UTILS ---

async function randomDelay(min = 3000, max = 7000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(res => setTimeout(res, delay));
}

/**
 * Intelligent AI Discovery
 * Asks Gemini to find and extract scheme details from a page's raw text.
 */
async function aiDetectOpportunities(page) {
    if (!genAI) return [];

    try {
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 15000));
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are the ABIF Funding Intelligence Agent. Analyze the following webpage text and extract all ACTIVE funding opportunities, grants, or schemes for Indian Startups or Incubators.
        
        Text: ${bodyText}
        
        Return a JSON array of objects with these keys: 
        - name: Full name of the scheme
        - body: Providing organization
        - deadline: Deadline if mentioned (else "Rolling")
        - maxAward: Funding amount if mentioned
        - description: Brief 1-sentence summary
        - targetAudience: Array including 'startup' or 'incubator'
        
        Return an empty array [] if no active grants are found. Only return JSON.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(text);
    } catch (e) {
        console.error('    ❌ AI Detection failed:', e.message);
        return [];
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
    console.log('\n🚀 Starting ABIF Deep Intelligence Scan (Overnight Agent)...');
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
            const dataMap = new Map();
            existingData.forEach(item => dataMap.set(item.name, item));

            rawResults.forEach(item => {
                const existing = dataMap.get(item.name) || {};
                dataMap.set(item.name, {
                    ...existing,
                    ...item,
                    lastScanned: new Date().toISOString()
                });
            });

            const mergedData = Array.from(dataMap.values());
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
