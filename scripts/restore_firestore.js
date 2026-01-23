import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json'; // Path relative to this script

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

// --- RESTORE LOGIC ---
async function restoreFirestore() {
    // Get backup folder from command line args
    // Usage: node scripts/restore_firestore.js <path_to_backup_folder>
    const backupFolderRelative = process.argv[2];

    if (!backupFolderRelative) {
        console.error('❌ Error: Please specify the backup folder to restore.');
        console.error('Usage: npm run restore -- backups/YYYY-MM-DD/TIMESTAMP');
        process.exit(1);
    }

    const backupPath = path.resolve(process.cwd(), backupFolderRelative);

    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Error: Backup path does not exist: ${backupPath}`);
        process.exit(1);
    }

    console.log(`📂 Reading backup from: ${backupPath}`);
    console.log('⚠️  WARNING: This will overwrite/merge existing documents with the same IDs.');
    // Ideally we might want a confirmation prompt here, but for now we trust the user calling the script.

    try {
        const files = fs.readdirSync(backupPath).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const collectionName = file.replace('.json', '');
            const filePath = path.join(backupPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const batchSize = 500; // Firestore batch limit

            console.log(`📦 Restoring collection: ${collectionName} (${Object.keys(data).length} docs)...`);

            let batch = db.batch();
            let count = 0;
            let total = 0;

            for (const [docId, docData] of Object.entries(data)) {
                const docRef = db.collection(collectionName).doc(docId);
                batch.set(docRef, docData, { merge: true }); // Merge to preserve fields not in backup? Or overwrite? merge: true is safer generally.
                count++;

                if (count >= batchSize) {
                    await batch.commit();
                    console.log(`   committed batch of ${count} documents...`);
                    batch = db.batch();
                    total += count;
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
                total += count;
            }

            console.log(`   ✅ Restored ${total} documents to ${collectionName}.`);
        }

        console.log('✨ Restore completed successfully!');

    } catch (error) {
        console.error('❌ Restore failed:', error);
    }
}

// Run
restoreFirestore();
