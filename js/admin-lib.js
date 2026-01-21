import { db, collection, getDocs, query, where, updateDoc, doc, addDoc } from './firebase-config.js';

const LICENSE_COLLECTION = 'licenses';

/**
 * Generate a new license key (Format: XD-XXXX-XXXX-XXXX)
 */
export function generateKey() {
    const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `XD-${segment()}-${segment()}-${segment()}`;
}

/**
 * Register a new license key to Firestore (Admin Only)
 * @param {string} userEmail - The email of the user who owns this license
 * @param {string} note - Optional note
 */
export async function issueLicense(userEmail, note = "") {
    const newKey = generateKey();
    await addDoc(collection(db, LICENSE_COLLECTION), {
        key: newKey,
        userEmail: userEmail, // Link to user
        status: 'issued',
        createdAt: new Date(),
        note: note
    });
    return newKey;
}

/**
 * RESET Device Lock (Admin Only Feature)
 * @param {string} keyString 
 */
export async function resetDeviceLock(keyString) {
    const q = query(collection(db, LICENSE_COLLECTION), where("key", "==", keyString));
    const docs = await getDocs(q);
    if (!docs.empty) {
        await updateDoc(doc(db, LICENSE_COLLECTION, docs.docs[0].id), {
            deviceId: null, // Clear device ID
            status: 'issued' // Revert to issued state to allow re-activation
        });
        return true;
    }
    return false;
}
