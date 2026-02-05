
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
            console.log('[LocalDev] .env loaded.');
        }
    } catch (e) {
        console.error('[LocalDev] Failed to load .env:', e.message);
    }
}

loadEnvLocally();

if (!process.env.SENDGRID_API_KEY) {
    console.error('ERROR: SENDGRID_API_KEY is missing in .env');
    process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- CONFIG ---
const TARGET_EMAIL = 'kuraeplasma@gmail.com';
const REGULATION_NAME = '法人税申告';

// PRODUCTION URLs
const PRODUCTION_DASHBOARD_URL = 'https://merki.jp/dashboard.html';
const PRODUCTION_SITE_URL = 'https://merki.jp';
const OPERATING_COMPANY_URL = 'https://spacegleam.co.jp/';

// USER DATA FROM SCREENSHOT
const USER_DATA = {
    company_name: 'Space Gleam株式会社',
    company_type: 'corporation',
    contact_name: ''
};

// --- EMAIL TEMPLATES ---
const EMAIL_TEMPLATES = {
    30: {
        subject: '【MERKI】{{regulationName}}の期限まで、あと30日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限が、約30日後に近づいています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

現時点で対応いただく必要はありませんが、
この時期に一度ご確認いただくことで、
今後の予定が立てやすくなります。

必要な対応がある場合は、
ご自身のタイミングでご準備ください。

▼ ダッシュボードはこちら
${PRODUCTION_DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
${OPERATING_COMPANY_URL}`
    },
    7: {
        subject: '【MERKI】{{regulationName}}の期限まで、あと7日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限が、1週間後に迫っています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

対応が必要な制度の場合は、
このタイミングで準備状況をご確認ください。

期限直前にも、あらためてお知らせいたします。

▼ ダッシュボードはこちら
${PRODUCTION_DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
${PRODUCTION_SITE_URL}`
    },
    1: {
        subject: '【MERKI】{{regulationName}}の期限は明日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限は、明日となっています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

すでに対応済みの場合は、
本メールは読み流していただいて問題ありません。

未対応の場合は、
お時間の許す範囲でご確認ください。

▼ ダッシュボードはこちら
${PRODUCTION_DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
${PRODUCTION_SITE_URL}`
    }
};

function getDeadlineStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

// --- MAIN ---
async function main() {
    try {
        console.log(`Preparing clean emails (No Tracking) for: ${TARGET_EMAIL}`);

        let recipientName = 'お客様';
        const contactName = USER_DATA.contact_name || '';

        if (USER_DATA.company_type === 'corporation') {
            const corpName = USER_DATA.company_name || '';
            if (corpName && contactName) recipientName = `${corpName}様　${contactName}様`;
            else if (corpName) recipientName = `${corpName}様`;
            else if (contactName) recipientName = `${contactName}様`;
        }

        console.log(`✅ Using Name: ${recipientName}`);

        const daysList = [30, 7, 1];

        for (const days of daysList) {
            const template = EMAIL_TEMPLATES[days];
            const deadlineDate = getDeadlineStr(days);

            const subject = template.subject.replace('{{regulationName}}', REGULATION_NAME);
            const body = template.body
                .replace('{{companyName}}', recipientName)
                .replace(/\{\{regulationName\}\}/g, REGULATION_NAME)
                .replace('{{deadlineDate}}', deadlineDate);

            const msg = {
                to: TARGET_EMAIL,
                from: {
                    email: process.env.SENDGRID_FROM_EMAIL || 'merki@spacegleam.co.jp',
                    name: 'MERKI'
                },
                subject: subject,
                text: body,
                // CRITICAL: Disable Click Tracking to prevent long URLs
                trackingSettings: {
                    clickTracking: {
                        enable: false,
                        enableText: false
                    }
                }
            };

            console.log(`Sending ${days}-day notification...`);
            await sgMail.send(msg);
            console.log(`✅ Sent: ${subject}`);
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
