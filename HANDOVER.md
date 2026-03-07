# Handover Documentation: ABIF Funding Intelligence Radar
**Status:** Alpha/Operational | **Maintainer:** [New Maintainer Name]

## 🚨 The Brutal Truth (Read This First)
This codebase is a highly customized, "lean-and-mean" automation machine. It is NOT a standard enterprise CRUD app. If you try to treat it like one, you will break the automation flows.

### 1. Scrapers are Fragile
The heart of the data collection is `scripts/scraper.js`. It depends on **cheerio** and **puppeteer** to crawl government and institutional portals (BIRAC, DST, Startup India). 
- **The Problem:** These websites change their HTML structure frequently. If a scraper fails, it's almost certainly because a CSS selector in the script is now obsolete. 
- **Honesty:** You will spend 40% of your maintenance time fixing selectors in `scripts/scraper.js`.

### 2. GitHub Actions "Backend"
There is no traditional database. The "database" is a static JSON file at `public/data/opportunities.json`.
- **The Workflow:** The system uses GitHub Actions (`.github/workflows/scraper-sync.yml`) as a serverless worker to run the scraper and *commit* the results back to the repo. This triggers the GitHub Pages deployment.
- **Why this matters:** If GitHub Actions are failing, the website data will go stale. 

### 3. Vercel + GitHub "CORS Hack"
Because GitHub Pages is static, the frontend cannot safely store a GitHub Token or SMTP password. 
- We use **Vercel Serverless Functions** (`api/trigger-sync.js` and `api/trigger-email.js`) to act as a secure proxy.
- The frontend calls the Vercel API -> Vercel uses the `GH_TOKEN` to trigger a GitHub Workflow Dispatch. 

### 4. Deep Intelligence Scraper (Overnight)
There is a second, more powerful scraper `scripts/deep-scraper.js`.
- **Purpose**: Runs overnight to perform deep audits using Gemini AI to discover *new* schemes that might not have fixed CSS selectors.
- **Workflow**: Triggered by `.github/workflows/deep-scan.yml` on a cron schedule. 
- **Honesty**: This uses more AI tokens than the standard scraper. If you hit Gemini rate limits, the deep scan will fall back to manual scraping.

---


## 🏗️ Architecture Stack
- **Frontend:** React (Vite) + Lucide Icons + Tailwind (via `@tailwindcss/vite` 4.0).
- **Automation:** Node.js + Puppeteer (Scraping) + Nodemailer (Emails).
- **AI Integration:** Google Gemini 1.5/2.5 Flash (for live briefings and email summaries).
- **Hosting:** GitHub Pages (Frontend) + Vercel (API Proxies).

---

## 🛠️ Key Files & their Secrets
- `scripts/scraper.js`: Data extraction logic. Requires `GEMINI_API_KEY` for AI descriptions.
- `scripts/send-email.js`: AI-enhanced email dispatch. Requires SMTP credentials.
- `src/App.jsx`: Main UI logic, theme management, and polling status for backend jobs.
- `src/utils/aiBriefing.js`: Client-side AI simulation/briefing algorithm.

### Necessary Secrets (GitHub Settings > Secrets > Actions)
You MUST have these configured for the system to function:
1. `GH_TOKEN`: Personal Access Token with `workflow` scope.
2. `GEMINI_API_KEY`: For AI descriptive/insight generation.
3. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: For the automated emailer.
4. `ABIF_TEAM_EMAIL`: Default receiver for alerts.

---

## 🚀 Common Maintenance Tasks

### Adding a New Funding Source
1. Go to `scripts/scraper.js`.
2. Find the Tier sections (Tier A, B, C).
3. Clone an existing scraping function (like `scrapeBIRAC`).
4. Map the new portal's HTML to the scheme object structure (`name`, `body`, `maxAward`, `deadline`, `description`, `link`, `targetAudience`).
5. Update the `main()` function to include your new scraper.

### Updating Terminology
The app uses specific "Incubator Ecosystem" language (Mandates, Deal Flow, Radar). If you need to change this, check:
- `src/constants/tracker.js` (Section labels)
- `src/components/Header.jsx`
- `src/components/StatsBoard.jsx`

---

## ⚠️ Technical Debt & Known Risks
- **Data Duplication:** The scraper tries to deduplicate based on scheme names, but subtle spelling differences might create duplicates.
- **Link Verification:** There is a basic `fetch` check for links, but many gov portals block automated HEAD requests, leading to "Verification Unknown" statuses.
- **Rate Limiting:** Do not run the "Sync Ecosystem" button too fast. GitHub will rate-limit the workflow dispatch API if hammered.

**Good luck. Keep the radar running.**
