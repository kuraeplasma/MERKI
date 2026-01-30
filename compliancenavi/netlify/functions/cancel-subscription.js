const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { subscriptionId } = JSON.parse(event.body);

        if (!subscriptionId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Subscription ID required' })
            };
        }

        // Get PayPal access token
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64');

        const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Cancel subscription via PayPal API
        const cancelResponse = await fetch(
            `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: 'User requested cancellation'
                })
            }
        );

        if (!cancelResponse.ok) {
            throw new Error('PayPal cancellation failed');
        }

        // Update Firestore - find user by subscription_id
        const usersSnapshot = await db.collection('users')
            .where('subscription_id', '==', subscriptionId)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
                subscription_status: 'canceled',
                subscription_canceled_date: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Cancel subscription error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
