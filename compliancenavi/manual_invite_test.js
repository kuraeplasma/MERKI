const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// --- ROBUST ENV LOADER ---
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
            console.log('[Manual] .env loaded.');
        }
    } catch (e) {
        console.error('[Manual] Env setup failed:', e.message);
    }
}

async function main() {
    loadEnvLocally();

    const targetEmail = "kuraeplasma@gmail.com";

    if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SENDGRID_API_KEY is missing from .env');
        process.exit(1);
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Mock Data mimicking the payload from dashboard.html
    const role = 'editor';
    const senderName = 'テスト花子 (オーナー)';
    const senderEmail = 'owner@example.com';
    const roleName = '編集者'; // Logic from send-invite.js
    const inviteLink = 'https://merki.jp/dashboard.html';

    console.log(`[Manual] Sending Invite Email to: ${targetEmail}`);

    const msg = {
        to: targetEmail,
        from: {
            email: 'merki@spacegleam.co.jp',
            name: 'MERKI'
        },
        subject: `【MERKI】チームへの招待が届きました`,
        text: `
MERKIよりご連絡いたします。

${senderName} 様（${senderEmail}）より、
「MERKI」のチームへ招待されました。

■ 付与される権限
${roleName}

以下のリンクよりログイン、または新規登録を行っていただくことで、
チームに参加できます。

▼ チームに参加する
${inviteLink}

※ 本メールにお心当たりのない場合は、対応不要です。
　本メールは破棄してください。

――――――――――――――
MERKI（メルキ）
日々の事業運営を支える制度期限の通知サービス

運営：SpaceGleam株式会社
https://merki.jp
――――――――――――――
        `,
        trackingSettings: {
            clickTracking: {
                enable: false
            }
        }
    };

    try {
        await sgMail.send(msg);
        console.log('✅✅✅ Invite Email sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send:', error.message);
        if (error.response) console.error(JSON.stringify(error.response.body));
    }
}

main();
