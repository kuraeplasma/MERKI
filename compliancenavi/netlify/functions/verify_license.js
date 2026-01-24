const admin = require('firebase-admin');

// 1. Initialize Firebase Admin (Reuse pattern)
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

exports.handler = async function (event, context) {
    // CORS Headers for calling from Electron (Local or Distributed)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const { licenseKey, deviceId } = body;

        if (!licenseKey || !deviceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ valid: false, message: 'パラメータが不足しています' })
            };
        }

        // 2. Lookup License
        const snapshot = await db.collection('licenses').where('key', '==', licenseKey).limit(1).get();

        if (snapshot.empty) {
            return {
                statusCode: 400, // Or 200 with valid:false to handle gracefully
                headers,
                body: JSON.stringify({ valid: false, message: '無効なライセンスキーです' })
            };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // 3. Logic Check

        // A. Is it revoked?
        if (data.status === 'revoked') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ valid: false, message: 'このライセンスは無効化されています' })
            };
        }

        // B. Device Binding Check
        const registeredDevice = data.registered_device_id;

        if (!registeredDevice) {
            // -- First Activation --
            await doc.ref.update({
                status: 'active',
                registered_device_id: deviceId,
                activatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`License ${licenseKey} activated on device ${deviceId}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ valid: true, message: '認証に成功しました（初回登録）' })
            };

        } else if (registeredDevice === deviceId) {
            // -- Valid Re-activation --
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ valid: true, message: '認証に成功しました' })
            };

        } else {
            // -- Mismatch --
            console.warn(`License ${licenseKey} attempted on ${deviceId} but bound to ${registeredDevice}`);
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    valid: false,
                    message: 'このライセンスキーは既に使用されています。1ライセンスにつき1台のPCでのみ利用可能です。'
                })
            };
        }

    } catch (error) {
        console.error("Verification Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ valid: false, message: 'サーバーエラーが発生しました' })
        };
    }
};
