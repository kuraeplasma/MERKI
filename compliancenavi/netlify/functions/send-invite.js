const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
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
            console.log('[LocalDev] .env re-loaded from disk.');
        }
    } catch (e) {
        console.error('[LocalDev] Failed to load .env:', e.message);
    }
}

// --- FIREBASE INIT ---
if (!admin.apps.length) {
    loadEnvLocally(); // Ensure env is loaded before init
    try {
        const credPath = path.resolve(process.cwd(), 'firebase-credentials.json');
        if (fs.existsSync(credPath)) {
            console.log("Loading Firebase credentials from JSON file...");
            admin.initializeApp({
                credential: admin.credential.cert(credPath)
            });
        } else {
            console.log("Loading Firebase credentials from Environment Variables...");
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
                })
            });
        }
        console.log("Firebase Admin Initialized");
    } catch (error) {
        console.error("Firebase Init Error:", error);
    }
}

const db = admin.firestore();

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Ensure Env Variables are loaded
    loadEnvLocally();

    const { email, role, senderName, senderEmail, senderUid } = JSON.parse(event.body);

    if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API key missing');
        return { statusCode: 500, body: 'Email configuration missing on server.' };
    }

    if (!senderUid) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Sender UID is required' }) };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
        // 1. Check Plan & Limits
        const userDoc = await db.collection('users').doc(senderUid).get();
        if (!userDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
        }

        const userData = userDoc.data();
        const plan = userData.plan || 'lite'; // Default to lite

        // PLAN LIMITS (Total members allowed including owner? Or additional invites?)
        // Interpretation: "Member Slots".
        // Lite: 1 slot (Owner only? or Owner + 1?) -> Let's assume Owner + 1 invite for now based on user request "Lite: 1"
        // Standard: 3
        // Pro: 10
        const LIMITS = {
            'lite': 1,
            'standard': 3,
            'pro': 5
        };
        const maxMembers = LIMITS[plan] || 0;

        // Count current members (users with this owner_uid)
        // AND pending invitations
        const membersSnapshot = await db.collection('users').where('owner_uid', '==', senderUid).get();
        const invitesSnapshot = await db.collection('invitations').where('owner_uid', '==', senderUid).get();

        const currentCount = membersSnapshot.size + invitesSnapshot.size;

        if (currentCount >= maxMembers) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'Plan limit reached',
                    details: `Your ${plan} plan allows ${maxMembers} members. You have ${currentCount}.`
                })
            };
        }

        // 2. Check if already invited or member
        const existingUser = await db.collection('users').where('email', '==', email).get();
        if (!existingUser.empty) {
            // Logic: If user exists but is not linked, maybe allow? For now, prevent dupes or check status.
            // Simple check:
            const existingData = existingUser.docs[0].data();
            if (existingData.owner_uid === senderUid) {
                return { statusCode: 409, body: JSON.stringify({ error: 'User is already a team member.' }) };
            }
        }

        // 3. Save Invitation to Firestore
        await db.collection('invitations').doc(email).set({
            owner_uid: senderUid,
            owner_email: senderEmail,
            owner_name: senderName,
            role: role,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });

        // 4. Send Email
        const roleName = role === 'admin' ? '管理者' : role === 'editor' ? '編集者' : '閲覧者';

        // Strict Production URL (No dynamic host to avoid long Netlify URLs)
        const inviteLink = `https://merki.spacegleam.co.jp/dashboard.html?email=${encodeURIComponent(email)}`;

        const msg = {
            to: email,
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

以下のリンクよりダッシュボードへアクセスすることで、
すぐにチームへ参加いただけます。

▼ チームに参加する
${inviteLink}

※ 本メールにお心当たりのない場合は、対応不要です。
　本メールは破棄してください。

――――――――――――――
MERKI（メルキ）
日々の事業運営を支える制度期限の通知サービス

運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp
――――――――――――――
            `,
            trackingSettings: {
                clickTracking: {
                    enable: false
                }
            }
        };

        await sgMail.send(msg);
        return { statusCode: 200, body: JSON.stringify({ message: 'Invitation sent and saved.' }) };

    } catch (error) {
        console.error('Handler Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};
