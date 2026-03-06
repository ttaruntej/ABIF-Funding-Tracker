import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function dumpHTML(url, name) {
    console.log(`Fetching HTML for ${name}...`);
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const html = await page.content();
        fs.writeFileSync(`./scripts/${name.toLowerCase()}.html`, html);
        console.log(`Saved ${name.toLowerCase()}.html (Length: ${html.length})`);

        await browser.close();
    } catch (e) {
        console.error(`Error fetching ${name}:`, e);
    }
}

async function run() {
    await dumpHTML('https://birac.nic.in/', 'BIRAC_Home');
    await dumpHTML('https://birac.nic.in/cfp.php', 'BIRAC_CFP');
}

run();
