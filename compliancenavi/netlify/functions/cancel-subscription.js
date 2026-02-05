const admin = require('firebase-admin');

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

    console.log('Cancel subscription function triggered');

    try {
        // --- 1. Initialize Firebase Admin ---
        if (!admin.apps.length) {
            console.log('Initializing Firebase Admin SDK...');

            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
                console.error('Firebase environment variables are missing');
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Server configuration error: Firebase credentials missing'
                    })
                };
            }

            try {
                let pkg = process.env.FIREBASE_PRIVATE_KEY;
                console.log('Original Private Key Length:', pkg ? pkg.length : 0);

                // 1. Remove any outer double or single quotes (multiple times if needed)
                let privateKey = pkg.replace(/^["']+|["']+$/g, '');

                // 2. Handle literal \n and real newlines
                // Also handle cases where it's double-escaped (\\n)
                privateKey = privateKey.replace(/\\n/g, '\n');

                // 3. Final trim
                privateKey = privateKey.trim();

                // 4. If the key doesn't have headers, it's definitely broken, 
                // but we can try to wrap it if it looks like raw base64
                if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                    console.log('Warning: Private key headers missing, attempting to wrap...');
                    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
                }

                console.log('Cleaned Private Key First 20 chars:', privateKey.substring(0, 20) + '...');
                console.log('Cleaned Private Key Last 20 chars: ...' + privateKey.substring(privateKey.length - 20));

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: privateKey
                    })
                });
                console.log('Firebase Admin initialized successfully');
            } catch (initError) {
                console.error('Firebase initialization error:', initError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Failed to initialize Firebase: ' + initError.message
                    })
                };
            }
        }
        const db = admin.firestore();

        // --- 2. Prepare Payload ---
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            console.error('Invalid JSON in body');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON' })
            };
        }

        const { subscriptionId } = body;
        console.log('Request for subscriptionId:', subscriptionId);

        if (!subscriptionId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Subscription ID required' })
            };
        }

        // --- 3. PayPal Authentication ---
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
            console.error('PayPal credentials not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'PayPal credentials not configured'
                })
            };
        }

        console.log('Fetching PayPal access token...');
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

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('PayPal token error:', errorText);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to authenticate with PayPal: ' + errorText
                })
            };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        console.log('PayPal access token obtained');

        // --- 4. Cancel Subscription with PayPal ---
        console.log('Calling PayPal Cancel API...');
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
            const errorData = await cancelResponse.json().catch(() => ({}));
            const errorText = JSON.stringify(errorData);
            console.error('PayPal cancel error:', errorText);

            // Note: If already cancelled, treat as success or handle gracefully
            if (errorData.name === 'RESOURCE_NOT_FOUND' || errorData.message?.includes('already canceled')) {
                console.log('Subscription was already cancelled or not found, continuing to Firestore update');
            } else {
                return {
                    statusCode: cancelResponse.status || 500,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'PayPal API Error: ' + (errorData.message || 'Failed to cancel subscription')
                    })
                };
            }
        } else {
            console.log('PayPal cancellation successful');
        }

        // --- 5. Update Firestore ---
        console.log('Updating Firestore for subscriptionId:', subscriptionId);
        const usersSnapshot = await db.collection('users')
            .where('subscription_id', '==', subscriptionId)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
                subscription_status: 'cancelled',
                canceled_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('Firestore updated for user:', userDoc.id);
        } else {
            console.warn('User document not found for subscriptionId:', subscriptionId);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Internal Function Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error: ' + error.message
            })
        };
    }
};
