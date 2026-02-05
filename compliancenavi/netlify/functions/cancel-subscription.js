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

            // Priority 1: Use full JSON object from FIREBASE_SERVICE_ACCOUNT
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                try {
                    console.log('Using FIREBASE_SERVICE_ACCOUNT JSON object...');
                    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                    console.log('Firebase Admin initialized successfully via JSON');
                } catch (jsonError) {
                    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', jsonError);
                    // Continue to legacy method as fallback
                }
            }

            // Priority 2: Legacy individual env vars (Only if not initialized yet)
            if (!admin.apps.length) {
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
                    const pkg = process.env.FIREBASE_PRIVATE_KEY;
                    if (!pkg) throw new Error('FIREBASE_PRIVATE_KEY is not defined');

                    // 1. Extract only the Base64 portion by removing headers and any non-base64 characters
                    // This is the most robust way to handle any environment variable mangling
                    const base64Content = pkg
                        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
                        .replace(/-----END PRIVATE KEY-----/g, '')
                        .replace(/[^A-Za-z0-9+/=]/g, ''); // Removes \n, spaces, quotes, etc.

                    // 2. Reconstruct the PEM format correctly (64 chars per line)
                    const formattedKey = [
                        '-----BEGIN PRIVATE KEY-----',
                        ...(base64Content.match(/.{1,64}/g) || []),
                        '-----END PRIVATE KEY-----'
                    ].join('\n');

                    console.log('Reconstructed Private Key (Length):', formattedKey.length);
                    console.log('Key Sample (Start):', formattedKey.substring(0, 30));

                    admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId: process.env.FIREBASE_PROJECT_ID,
                            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                            privateKey: formattedKey
                        })
                    });
                    console.log('Firebase Admin initialized via individual env vars');
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
