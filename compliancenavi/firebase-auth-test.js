const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.resolve(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env file not found in current directory.');
        process.exit(1);
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            value = value.replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

async function testAuth() {
    loadEnv();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('--- Firebase Auth Test ---');
    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);

    if (!rawPrivateKey) {
        console.error('Error: FIREBASE_PRIVATE_KEY is missing in .env');
        return;
    }

    // PEM Normalization
    let pk = rawPrivateKey.trim().replace(/^["']|["']$/g, '');
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    let content = pk;
    if (pk.includes(header)) content = content.split(header)[1];
    if (content.includes(footer)) content = content.split(footer)[0];
    content = content.replace(/\s+/g, '').replace(/\\n/g, '');
    const wrappedContent = content.match(/.{1,64}/g).join('\n');
    const finalKey = `${header}\n${wrappedContent}\n${footer}\n`;

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: finalKey
            })
        });
        const db = admin.firestore();
        console.log('Attempting to connect to Firestore...');
        // Try to read a dummy doc to verify auth
        await db.collection('users').limit(1).get();
        console.log('Successfully authenticated and connected to Firestore!');
    } catch (error) {
        console.error('Authentication Failed:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.message.includes('UNAUTHENTICATED')) {
            console.error('\nPossible Causes:');
            console.error('1. The Private Key is invalid or belongs to a different project.');
            console.log('2. The Client Email does not match the Private Key.');
            console.log('3. System clock is out of sync.');
        }
    }
}

testAuth();
