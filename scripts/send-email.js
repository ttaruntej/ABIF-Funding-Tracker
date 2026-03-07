import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'opportunities.json');

async function sendEmail() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ABIF_TEAM_EMAIL, TARGET_EMAILS } = process.env;

    // Determine recipients
    let finalRecipients = TARGET_EMAILS && TARGET_EMAILS.trim() !== '' ? TARGET_EMAILS : ABIF_TEAM_EMAIL;

    // Require config to send email
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !finalRecipients) {
        console.log('  ℹ Email notification skipped: SMTP credentials or recipient emails not fully configured.');
        process.exit(1);
    }

    if (!fs.existsSync(DATA_FILE)) {
        console.error('  ✗ Data file not found. Run scraper first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    const incubatorOpps = data.filter(x =>
        x.targetAudience && x.targetAudience.includes('incubator') && x.status !== 'Closed'
    );

    if (incubatorOpps.length === 0) {
        console.log('  ℹ No active incubator opportunities to email today.');
        process.exit(0);
    }

    console.log(`\n─── Preparing Email for ${incubatorOpps.length} Incubator Opportunities ───`);

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">🤖 ABIF Core AI Agent Reporting...</h2>
            <p>Good morning!</p>
            <p>I have just compiled my latest deep-scan across the Indian funding ecosystem on behalf of <strong>Tarun Tej Thadana</strong>. Here are the active opportunities specifically relevant for incubators and accelerators today:</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
    `;

    incubatorOpps.forEach((opp, i) => {
        htmlContent += `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #3b82f6; background-color: #f8fafc;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">${i + 1}. ${opp.name}</h3>
                <p style="margin: 0 0 5px 0;"><strong>Provider:</strong> ${opp.body}</p>
                <p style="margin: 0 0 5px 0;"><strong>Grant/Funding:</strong> ${opp.maxAward}</p>
                <p style="margin: 0 0 5px 0;"><strong>Deadline:</strong> ${opp.deadline} <span style="font-weight: bold; color: ${opp.status === 'Closing Soon' ? '#ef4444' : '#10b981'};">(${opp.status})</span></p>
                <p style="margin: 5px 0; font-size: 14px; color: #475569;">${opp.description}</p>
                <a href="${opp.link}" style="display: inline-block; margin-top: 10px; color: #2563eb; text-decoration: none; font-weight: bold;">Verify / Apply &rarr;</a>
            </div>
        `;
    });

    htmlContent += `
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 13px; color: #475569; text-align: center;"><em>"Your silent, autonomous funding researcher."</em></p>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Operated by your ABIF AI Agent &bull; <a href="https://github.com/ttaruntej/ABIF-Funding-Tracker" style="color: #94a3b8;">View Dashboard</a></p>
        </div>
    `;

    try {
        const recipients = finalRecipients.split(',').map(e => e.trim()).filter(e => e).join(', ');

        const info = await transporter.sendMail({
            from: SMTP_FROM || '"ABIF AI Agent" <abif.tbimanager@gmail.com>',
            to: recipients,
            subject: `🚀 [ABIF Alert] ${incubatorOpps.length} Active Incubator Grants & Funding Opportunities`,
            html: htmlContent,
        });
        console.log(`  ✓ Email sent successfully to: ${recipients} (ID: ${info.messageId})`);
    } catch (error) {
        console.error('  ✗ Error sending email:', error);
        process.exit(1);
    }
}

sendEmail();
