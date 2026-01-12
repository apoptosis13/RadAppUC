import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Initialize with default credentials
// Note: This relies on "GOOGLE_APPLICATION_CREDENTIALS" env var or "firebase login" state
try {
    admin.initializeApp();
} catch (e) {
    // Already initialized logic or error
}

async function getUid() {
    try {
        console.log("Attempting to fetch user by email...");
        const user = await admin.auth().getUserByEmail('gonzalodiazs@gmail.com');
        console.log('SUPER_ADMIN_UID:', user.uid);
    } catch (e) {
        console.error('Auth fetch failed, trying Firestore...');
        try {
            const db = admin.firestore();
            const snapshot = await db.collection('users').where('email', '==', 'gonzalodiazs@gmail.com').get();
            if (!snapshot.empty) {
                console.log('SUPER_ADMIN_UID_FROM_FIRESTORE:', snapshot.docs[0].id);
            } else {
                console.log('User not found in Auth or Firestore');
            }
        } catch (dbErr) {
            console.error("Firestore lookup failed:", dbErr);
        }
    }
}

getUid();
