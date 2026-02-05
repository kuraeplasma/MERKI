const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// --- ROBUST ENV LOADER (Must be called first) ---
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
    // 1. ALWAYS LOAD ENV FIRST
    loadEnvLocally();

    const targetEmail = "kuraeplasma@gmail.com";
    let authSuccess = false;

    // 2. Try loading User Provided JSON Credentials
    try {
        const jsonPath = path.resolve(process.cwd(), 'firebase-credentials.json');
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            if (!content.includes('"MESSAGE"')) {
                const serviceAccount = JSON.parse(content);
                if (!admin.apps.length) {
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                }
                console.log('[Manual] Firebase initialized from firebase-credentials.json');

                // Test Connection
                const db = admin.firestore();
                await db.collection('users').limit(1).get();
                console.log('[Manual] Authentication SUCCESS! (JSON file valid)');
                authSuccess = true;
            }
        }
    } catch (e) {
        console.log('[Manual] JSON auth failed:', e.message);
    }

    // 3. Fallback to .env Authentication
    if (!authSuccess && !admin.apps.length) {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && privateKey) {
                let rawKey = privateKey.trim().replace(/^["']|["']$/g, '');
                const header = '-----BEGIN PRIVATE KEY-----';
                const footer = '-----END PRIVATE KEY-----';
                let body = rawKey.replace(header, '').replace(footer, '').replace(/\s+/g, '').replace(/\\n/g, '');
                const wrappedBody = body.match(/.{1,64}/g).join('\n');
                const finalKey = `${header}\n${wrappedBody}\n${footer}`;

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: finalKey
                    })
                });
                console.log('[Manual] Firebase initialized from .env');
                authSuccess = true;
            }
        } catch (e) {
            console.error('[Manual] .env Authentication FAILED:', e.message);
        }
    }

    if (!authSuccess) {
        console.error('❌ Could not authenticate with Firebase. Please check credentials.');
        process.exit(1);
    }

    // 4. Send Email via SendGrid (Using PRODUCTION Templates)
    try {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY is missing from .env');
        }
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const DASHBOARD_URL = 'https://merki.jp/dashboard.html';

        // --- Production Templates (Extracted from send-notifications.js) ---
        const EMAIL_TEMPLATES = {
            30: {
                subject: '【MERKI】{{regulationName}}の期限まで、あと30日です',
                body: `{{companyName}}\n\nMERKIからのご連絡です。\n\n{{regulationName}}の期限が、約30日後に近づいています。\n\n■ 制度名：{{regulationName}}\n■ 期限日：{{deadlineDate}}\n\n現時点で対応いただく必要はありませんが、\nこの時期に一度ご確認いただくことで、\n今後の予定が立てやすくなります。\n\n必要な対応がある場合は、\nご自身のタイミングでご準備ください。\n\n▼ ダッシュボードはこちら\n${DASHBOARD_URL}\n\n――\nMERKI\n運営：SpaceGleam株式会社\nhttps://spacegleam.co.jp/`
            },
            7: {
                subject: '【MERKI】{{regulationName}}の期限まで、あと7日です',
                body: `{{companyName}}\n\nMERKIからのご連絡です。\n\n{{regulationName}}の期限が、1週間後に迫っています。\n\n■ 制度名：{{regulationName}}\n■ 期限日：{{deadlineDate}}\n\n対応が必要な制度の場合は、\nこのタイミングで準備状況をご確認ください。\n\n期限直前にも、あらためてお知らせいたします。\n\n▼ ダッシュボードはこちら\n${DASHBOARD_URL}\n\n――\nMERKI\n運営：SpaceGleam株式会社\nhttps://spacegleam.co.jp/`
            },
            1: {
                subject: '【MERKI】{{regulationName}}の期限は明日です',
                body: `{{companyName}}\n\nMERKIからのご連絡です。\n\n{{regulationName}}の期限は、明日となっています。\n\n■ 制度名：{{regulationName}}\n■ 期限日：{{deadlineDate}}\n\nすでに対応済みの場合は、\n本メールは読み流していただいて問題ありません。\n\n未対応の場合は、\nお時間の許す範囲でご確認ください。\n\n▼ ダッシュボードはこちら\n${DASHBOARD_URL}\n\n――\nMERKI\n運営：SpaceGleam株式会社\nhttps://spacegleam.co.jp/`
            }
        };

        // 5. Send 3 Emails (30, 7, 1 days)
        const testScenarios = [30, 7, 1];

        console.log(`[Manual] Sending 3 emails to: ${targetEmail}`);

        for (const days of testScenarios) {
            const template = EMAIL_TEMPLATES[days];
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + days);

            // Format deadline date
            const deadlineDate = deadline.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Mock Data
            const companyName = 'お客様';
            const regulationName = '法人税申告';

            // Replace Placeholders
            const subject = template.subject.replace(/\{\{regulationName\}\}/g, regulationName) + ' [TEST]';
            const body = template.body
                .replace(/\{\{companyName\}\}/g, companyName)
                .replace(/\{\{regulationName\}\}/g, regulationName)
                .replace(/\{\{deadlineDate\}\}/g, deadlineDate);

            const msg = {
                to: targetEmail,
                from: {
                    email: 'merki@spacegleam.co.jp', // Force override to match production logic if needed, or use verified sender
                    name: 'MERKI'
                },
                subject: subject,
                text: body,
                trackingSettings: {
                    clickTracking: {
                        enable: false
                    }
                }
            };

            await sgMail.send(msg);
            console.log(`✅ Sent ${days}-day notification to ${targetEmail}`);
        }

        console.log('✅✅✅ All 3 test emails sent successfully!');

    } catch (e) {
        console.error('❌ Failed to send:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.body));
    }
}

main();
