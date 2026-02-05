const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// --- ROBUST ENV LOADER ---
// Directly reads .env to ensure we get the fresh, fixed variables, ignoring potential Netlify cache.
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
                    // Clean quotes and handle explicit \n literals just in case
                    value = value.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
                    process.env[key] = value;
                }
            });
            console.log('[LocalDev] .env re-loaded from disk.');
        }
    } catch (e) {
        console.error('[LocalDev] Failed to load .env:', e.message);
    }
}

let db;

function initializeFirebase() {
    loadEnvLocally();

    if (admin.apps.length) {
        db = admin.firestore();
        return;
    }

    // 0. Try loading from firebase-credentials.json (User provided valid key)
    try {
        const jsonPath = path.resolve(process.cwd(), 'firebase-credentials.json');
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            // Check if it's the real key, not the placeholder
            if (content.includes('private_key') && !content.includes('"MESSAGE"')) {
                const serviceAccount = JSON.parse(content);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                db = admin.firestore();
                console.log('[Firebase] Initialized successfully from firebase-credentials.json');
                return; // Early return if successful
            }
        }
    } catch (e) {
        console.error('[Firebase] JSON file load failed, falling back to .env:', e.message);
    }

    // Fallback to .env logic
    loadEnvLocally();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Firebase Config Missing. Project=${!!projectId}, Email=${!!clientEmail}, Key=${!!privateKey}`);
    }

    // Double-check key format. If it still has spaces instead of newlines, fix it in memory.
    let formattedKey = privateKey;
    if (!formattedKey.includes('\n') && formattedKey.includes(' ')) {
        formattedKey = formattedKey.replace(/-----BEGIN PRIVATE KEY----- /, '-----BEGIN PRIVATE KEY-----\n')
            .replace(/ -----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
            .replace(/ /g, '\n');
    }
    // Also handle literal \n if present
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: formattedKey
            })
        });
        db = admin.firestore();
        console.log('[Firebase] Initialized successfully.');
    } catch (e) {
        console.error('[Firebase] Init Failed:', e.message);
        throw e;
    }
}

const DASHBOARD_URL = 'https://merki.spacegleam.co.jp/dashboard.html';
const TEMPLATES = {
    30: { subject: '【MERKI】{{regName}}の期限まで30日', body: (c, r, d) => `${c}様\n\n${r}の期限が${d}に迫っています。` },
    7: { subject: '【MERKI】{{regName}}の期限まで7日', body: (c, r, d) => `${c}様\n\n${r}の期限が${d}に迫っています（残り1週間）。` },
    1: { subject: '【MERKI】{{regName}}の期限は明日', body: (c, r, d) => `${c}様\n\n${r}の期限は明日(${d})です。` }
};

exports.handler = async function (event, context) {
    const host = event.headers.host || '';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return { statusCode: 403, body: 'Not local' };
    }

    try {
        initializeFirebase();
        sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

        const { userId, daysType } = JSON.parse(event.body || '{}');
        if (!userId) throw new Error('userId is missing');

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error('User not found in Firestore');

        const userData = userDoc.data();
        if (!userData.email) throw new Error('User has no email');

        const days = parseInt(daysType) || 30;
        const template = TEMPLATES[days];
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);
        const deadlineStr = deadline.toLocaleDateString('ja-JP');

        const bodyText = template.body(userData.company_name || 'お客様', '法人税申告', deadlineStr);

        await sgMail.send({
            to: userData.email,
            from: 'merki@spacegleam.co.jp',
            subject: template.subject.replace('{{regName}}', '法人税申告'),
            text: bodyText
        });

        return { statusCode: 200, body: JSON.stringify({ success: true, message: `Sent to ${userData.email}` }) };
    } catch (error) {
        console.error('Handler Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
