const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- FIREBASE INIT (Standardized for Local/Prod) ---
if (!admin.apps.length) {
    try {
        const credPath = path.resolve(process.cwd(), 'firebase-credentials.json');
        if (fs.existsSync(credPath)) {
            admin.initializeApp({
                credential: admin.credential.cert(credPath)
            });
        } else {
            // Environment variable fallback (for production)
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
                })
            });
        }
    } catch (error) {
        console.error("Firebase Init Error:", error);
    }
}

const db = admin.firestore();

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { requesterUid, targetUid, targetEmail, type } = JSON.parse(event.body);

    if (!requesterUid || (!targetUid && !targetEmail)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters' }) };
    }

    try {
        // 1. Authorization Check: Is the requester an admin or owner of the team?
        const requesterDoc = await db.collection('users').doc(requesterUid).get();
        if (!requesterDoc.exists) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized: Requester not found' }) };
        }

        const requesterData = requesterDoc.data();
        const isOwner = requesterData.owner_uid === undefined || requesterData.owner_uid === requesterUid;
        const isAdmin = requesterData.role === 'admin';

        if (!isOwner && !isAdmin) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized: Admin privileges required' }) };
        }

        // The owner of the team (whom to check against)
        const teamOwnerUid = isOwner ? requesterUid : requesterData.owner_uid;

        // 2. Perform Removal
        if (type === 'member' && targetUid) {
            const targetDocRef = db.collection('users').doc(targetUid);
            const targetDoc = await targetDocRef.get();

            if (!targetDoc.exists) {
                return { statusCode: 404, body: JSON.stringify({ error: 'Target member not found' }) };
            }

            const targetData = targetDoc.data();
            if (targetData.owner_uid !== teamOwnerUid) {
                return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized: Target is not in your team' }) };
            }

            // Remove from team: reset owner_uid and role
            await targetDocRef.update({
                owner_uid: null,
                role: 'viewer', // reset to default
                subscription_status: 'lite',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            return { statusCode: 200, body: JSON.stringify({ message: 'Member removed from team successfully' }) };

        } else if (type === 'invitation' && targetEmail) {
            const inviteRef = db.collection('invitations').doc(targetEmail);
            const inviteDoc = await inviteRef.get();

            if (!inviteDoc.exists) {
                return { statusCode: 404, body: JSON.stringify({ error: 'Invitation not found' }) };
            }

            const inviteData = inviteDoc.data();
            if (inviteData.owner_uid !== teamOwnerUid) {
                return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized: Invitation belongs to another team' }) };
            }

            // Delete the invitation
            await inviteRef.delete();

            return { statusCode: 200, body: JSON.stringify({ message: 'Invitation cancelled successfully' }) };
        }

        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid operation type' }) };

    } catch (error) {
        console.error('Removal Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};
