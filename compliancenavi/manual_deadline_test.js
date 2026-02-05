
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

// TEMPLATE (Copied from send-notifications.js for "30 days")
const REGULATION_NAME = '法人税申告';
const COMPANY_NAME = '株式会社テストサンプル';
const DEADLINE_DATE = '2026年3月31日';
const DASHBOARD_URL = 'https://merki.jp/dashboard.html';

const subject = `【MERKI】${REGULATION_NAME}の期限まで、あと30日です`;
const body = `${COMPANY_NAME}様

MERKIからのご連絡です。

${REGULATION_NAME}の期限が、約30日後に近づいています。

■ 制度名：${REGULATION_NAME}
■ 期限日：${DEADLINE_DATE}

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
https://spacegleam.co.jp/`;

const msg = {
    to: 'kuraeplasma77@gmail.com', // User's email
    from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'merki@spacegleam.co.jp',
        name: 'MERKI'
    },
    subject: subject,
    text: body
};

(async () => {
    try {
        console.log('Sending test email to kuraeplasma77@gmail.com...');
        await sgMail.send(msg);
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending email:', error);
        if (error.response) {
            console.error(error.response.body);
        }
    }
})();
