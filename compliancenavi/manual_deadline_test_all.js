
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

// TEMPLATES (Copied exactly from send-notifications.js)
const DASHBOARD_URL = 'https://merki.jp/dashboard.html';

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
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://spacegleam.co.jp/`
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
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.jp`
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
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.jp`
    }
};

// CORRECTED EMAIL ADDRESS
const TARGET_EMAIL = 'kuraeplasma@gmail.com';
const COMPANY_NAME = '株式会社テストサンプル';
const REGULATION_NAME = '法人税申告';

// Helper to calculate deadline date string
function getDeadlineStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function sendTestEmails() {
    const daysList = [30, 7, 1];

    for (const days of daysList) {
        const template = EMAIL_TEMPLATES[days];
        const deadlineDate = getDeadlineStr(days);

        const subject = template.subject.replace('{{regulationName}}', REGULATION_NAME);
        const body = template.body
            .replace('{{companyName}}', COMPANY_NAME)
            .replace(/\{\{regulationName\}\}/g, REGULATION_NAME)
            .replace('{{deadlineDate}}', deadlineDate);

        const msg = {
            to: TARGET_EMAIL,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'merki@spacegleam.co.jp',
                name: 'MERKI'
            },
            subject: subject,
            text: body
        };

        try {
            console.log(`Sending ${days}-day notification to ${TARGET_EMAIL}...`);
            await sgMail.send(msg);
            console.log(`✅ Sent: ${subject}`);
            // Wait a bit to avoid rate limits or ordering issues
            await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
            console.error(`❌ Error sending ${days}-day email:`, error.message);
            if (error.response) console.error(error.response.body);
        }
    }
}

sendTestEmails();
