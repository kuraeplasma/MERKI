
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// --- ENV LOADER ---
function loadEnvLocally() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split(/\r?\n/).forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    let value = parts.slice(1).join('=').trim();
                    value = value.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
                    process.env[key] = value;
                }
            });
            console.log('[LinkTest] .env loaded.');
        }
    } catch (e) {
        console.error('[LinkTest] Env setup failed:', e.message);
    }
}

async function main() {
    loadEnvLocally();

    const targetEmail = "kuraeplasma@gmail.com";

    if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY missing.');
        process.exit(1);
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // --- NEW TEMPLATE ---
    const DASHBOARD_URL = 'https://merki.spacegleam.co.jp/dashboard.html';
    const BODY_TEMPLATE = `お客様 様

MERKIからのご連絡です。

これはリンク確認用のテストメールです（署名修正版）。

▼ ダッシュボードはこちら
${DASHBOARD_URL}

――
MERKI
https://merki.spacegleam.co.jp/`;

    const msg = {
        to: targetEmail,
        from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'merki@spacegleam.co.jp',
            name: 'MERKI'
        },
        subject: '【MERKI】テストメール（署名修正済み）',
        text: BODY_TEMPLATE,
        trackingSettings: {
            clickTracking: {
                enable: false
            }
        }
    };

    try {
        console.log(`Sending link test email to ${targetEmail}...`);
        await sgMail.send(msg);
        console.log(`✅ Email sent! Check Signature.\nMERKI\nhttps://merki.spacegleam.co.jp/`);
    } catch (e) {
        console.error(`❌ Failed to send:`, e.message);
        if (e.response) console.error(JSON.stringify(e.response.body));
    }
}

main();
