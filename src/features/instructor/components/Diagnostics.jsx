import React, { useState } from 'react';
import { db } from '../../../config/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';

const Diagnostics = () => {
    const [status, setStatus] = useState('Ready');

    const runTest = async () => {
        setStatus('Testing Firestore Write...');
        try {
            const docRef = await addDoc(collection(db, 'diagnostics'), {
                test: true,
                timestamp: new Date()
            });
            setStatus(`Write Success. ID: ${docRef.id}. Testing Delete...`);

            await deleteDoc(doc(db, 'diagnostics', docRef.id));
            setStatus('Delete Success. Permissions OK.');
        } catch (error) {
            console.error('Diagnostics Error:', error);
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg my-4">
            <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Diagnóstico de Sistema</h3>
            <div className="flex items-center space-x-4">
                <button
                    onClick={runTest}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Probar Permisos
                </button>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{status}</span>
            </div>
        </div>
    );
};

export default Diagnostics;
