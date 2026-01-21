const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios');
const crc32 = require('crc-32');
const nodemailer = require('nodemailer');

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Init Error: Check FIREBASE_SERVICE_ACCOUNT env var.", e);
    }
}
const db = admin.firestore();

// --- Signature Verification Helpers ---
async function downloadAndCacheCert(url) {
    // In a real constrained environment (like AWS Lambda), we might cache this.
    // Generally the cert URL is valid for a while.
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        console.error("Failed to download PayPal cert:", err);
        throw err;
    }
}

function getCRC32(data) {
    // PayPal uses CRC32 checksum for the webhook ID in the signature string
    return crc32.str(data) >>> 0; // consistent unsigned integer
}

async function verifySignature(event) {
    try {
        const headers = event.headers;
        // Normalize headers to upper-case checking or use what Netlify provides (usually lower-case or original)
        // Let's look for both just in case.
        const getHeader = (name) => headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];

        const transmissionId = getHeader('PAYPAL-TRANSMISSION-ID');
        const transmissionTime = getHeader('PAYPAL-TRANSMISSION-TIME');
        const certUrl = getHeader('PAYPAL-CERT-URL');
        const authAlgo = getHeader('PAYPAL-AUTH-ALGO');
        const transmissionSig = getHeader('PAYPAL-TRANSMISSION-SIG');
        const webhookId = process.env.PAYPAL_WEBHOOK_ID; // Must be set in Netlify Env

        if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
            console.error("Missing Security Headers");
            return false;
        }

        // 1. Download Cert
        const cert = await downloadAndCacheCert(certUrl);

        // 2. Construct Signature String
        // format: transmissionId | transmissionTime | webhookId | crc32(body)
        const crc = getCRC32(event.body);
        const expectedSig = `${transmissionId}|${transmissionTime}|${webhookId}|${crc}`;

        // 3. Verify
        const verifier = crypto.createVerify('SHA256'); // PayPal usually use SHA256withRSA
        verifier.update(expectedSig);
        const isValid = verifier.verify(cert, transmissionSig, 'base64');

        return isValid;

    } catch (err) {
        console.error("Verification logic failed:", err);
        return false;
    }
}

// Helper: Generate Key
function generateKey() {
    const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `XD-${segment()}-${segment()}-${segment()}`;
}

// Helper: Send Email
async function sendLicenseEmail(toEmail, licenseKey) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP config missing. Skipping email.");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"X Draft Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: '【X Draft】ライセンスキーの発行',
        text: `ご購入ありがとうございます。\n\n以下のライセンスキーをアプリに入力してください。\n\nライセンスキー: ${licenseKey}\n\nダウンロード: https://xdraft.spacegleam.co.jp/download.html\n\nもし不明点があればこのメールに返信してください。`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent to:", toEmail);
    } catch (error) {
        console.error("Email send error:", error);
    }
}

// 2. Main Handler
exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'submit via POST' };
    }

    try {
        // --- SECURITY CHECK ---
        // If PAYPAL_WEBHOOK_ID is set, we enforce verification.
        // If not set, we skip (for testing only, reckless in prod).
        if (process.env.PAYPAL_WEBHOOK_ID) {
            const isSecure = await verifySignature(event);
            if (!isSecure) {
                console.warn("Signature Verification Failed! Rejecting request.");
                return { statusCode: 403, body: 'Signature Verification Failed' };
            }
            console.log("Signature Verified.");
        } else {
            console.warn("WARNING: PAYPAL_WEBHOOK_ID not set. Skipping signature verification.");
        }
        // ----------------------

        const body = JSON.parse(event.body);

        // Check Event Type (Capture or Sale completed)
        if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED' || body.event_type === 'PAYMENT.SALE.COMPLETED') {
            const resource = body.resource;
            const payerEmail = resource.payer?.email_address;

            if (!payerEmail) {
                return { statusCode: 400, body: 'No payer email' };
            }

            // Idempotency
            const transactionId = resource.id;
            const existing = await db.collection('licenses').where('transactionId', '==', transactionId).get();

            if (!existing.empty) {
                return { statusCode: 200, body: 'Already Issued' };
            }

            // Issue
            const newKey = generateKey();
            const licenseData = {
                key: newKey,
                userEmail: payerEmail,
                transactionId: transactionId,
                status: 'issued',
                source: 'paypal_webhook_verified',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                amount: resource.amount?.value || 'unknown',
                currency: resource.amount?.currency_code || 'JPY'
            };

            await db.collection('licenses').add(licenseData);
            console.log("License Issued Safe:", newKey);

            // Send Email
            await sendLicenseEmail(payerEmail, newKey);

            return { statusCode: 200, body: 'License Issued' };
        }

        return { statusCode: 200, body: 'Event Ignored' };

    } catch (error) {
        console.error("Webhook Error:", error);
        return { statusCode: 500, body: 'Internal Error' };
    }
};
