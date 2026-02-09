
const admin = require('firebase-admin');
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
            console.log('[ManualForce] .env loaded.');
        }
    } catch (e) {
        console.error('[ManualForce] Env setup failed:', e.message);
    }
}

async function main() {
    loadEnvLocally();

    const targetEmail = "kuraeplasma@gmail.com";

    // --- SENDGRID SETUP ---
    if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY missing.');
        process.exit(1);
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // --- TEMPLATES ---
    const DASHBOARD_URL = 'https://merki.jp/dashboard.html';
    const TEMPLATE_1DAY = {
        subject: '【MERKI】{{regulationName}}の期限は明日です',
        body: `{{companyName}} 様\n\nMERKIからのご連絡です。\n\n{{regulationName}}の期限は、明日となっています。\n\n■ 制度名：{{regulationName}}\n■ 期限日：{{deadlineDate}}\n\nすでに対応済みの場合は、\n本メールは読み流していただいて問題ありません。\n\n未対応の場合は、\nお時間の許す範囲でご確認ください。\n\n▼ ダッシュボードはこちら\n${DASHBOARD_URL}\n\n――\nMERKI\n運営：SpaceGleam株式会社\nhttps://spacegleam.co.jp/`
    };

    // --- TARGETS ---
    // User requested specifically for the items due tomorrow (Feb 10, 2026)
    // Identified in previous step: "源泉所得税納付", "住民税特別徴収納付"
    // Deadline: 2026/02/10
    const TARGET_ITEMS = [
        { title: '源泉所得税納付', deadlineStr: '2026年2月10日' },
        { title: '住民税特別徴収納付', deadlineStr: '2026年2月10日' }
    ];

    const companyName = 'SpaceGleam株式会社'; // Or fetch from DB if needed, but hardcoding for quick fix based on known user context or generic placeholder. 
    // Wait, let's try to be precise. 
    // Ideally I should fetch the user's company name.
    // Given allow me to fetch or I can just use placeholder if urgency is high.
    // The previous script `check_user_notification.js` showed `Company: undefined`.
    // So likely the user record doesn't have it set or I accessed it wrong.
    // I will use "お客様" as safe fallback if I can't find it, or "SpaceGleam株式会社" if I know it (User said "this user's notification" - Kurae is likely dev/admin).
    // Let's use "お客様" to be safe.

    console.log(`[ManualForce] Sending ${TARGET_ITEMS.length} missed notifications to ${targetEmail}...`);

    for (const item of TARGET_ITEMS) {
        const subject = TEMPLATE_1DAY.subject.replace(/\{\{regulationName\}\}/g, item.title);
        const body = TEMPLATE_1DAY.body
            .replace(/\{\{companyName\}\}/g, 'お客様')
            .replace(/\{\{regulationName\}\}/g, item.title)
            .replace(/\{\{deadlineDate\}\}/g, item.deadlineStr);

        const msg = {
            to: targetEmail,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'merki@spacegleam.co.jp',
                name: 'MERKI'
            },
            subject: subject,
            text: body
        };

        try {
            await sgMail.send(msg);
            console.log(`✅ Sent 1-Day notification for: ${item.title}`);
        } catch (e) {
            console.error(`❌ Failed to send for ${item.title}:`, e.message);
            if (e.response) console.error(JSON.stringify(e.response.body));
        }
    }
}

main();
