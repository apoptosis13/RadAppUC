import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json'; // Path relative to this script
const BACKUP_DIR = '../backups'; // Path relative to this script

// Polyfill for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
    const serviceAccount = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, SERVICE_ACCOUNT_PATH), 'utf8')
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized.');
} catch (error) {
    console.error('❌ Error initializing Firebase Admin. Make sure serviceAccountKey.json exists in the root directory.');
    console.error('Error:', error.message);
    process.exit(1);
}

const db = admin.firestore();

// --- BACKUP LOGIC ---
async function backupFirestore() {
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.resolve(__dirname, BACKUP_DIR, dateStr, timestamp);

    console.log(`📂 Creating backup directory: ${backupPath}`);

    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }

    try {
        const collections = await db.listCollections();

        for (const collection of collections) {
            console.log(`📦 Backing up collection: ${collection.id}...`);
            const snapshot = await collection.get();
            const data = {};

            snapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });

            const filePath = path.join(backupPath, `${collection.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`   mapped ${snapshot.size} documents to ${collection.id}.json`);
        }

        console.log('✨ Backup completed successfully!');
        console.log(`📂 Location: ${backupPath}`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
    }
}

// Run
backupFirestore();
