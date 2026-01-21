import { db, collection, getDocs, query, where } from './firebase-config.js';

const LICENSE_COLLECTION = 'licenses';

/**
 * Get license for the current user
 * @param {string} email
 */
export async function getUserLicense(email) {
    const q = query(collection(db, LICENSE_COLLECTION), where("userEmail", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
    }
    return null;
}

