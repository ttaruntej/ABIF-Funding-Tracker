import fs from 'fs';

async function testFetch() {
    try {
        console.log("Trying raw fetch...");
        const response = await fetch('https://birac.nic.in/calls_for_proposal.php', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        });

        const text = await response.text();
        fs.writeFileSync('birac-fetch.html', text);
        console.log(`Fetch completed with status ${response.status}. Length: ${text.length}`);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testFetch();
