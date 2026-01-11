import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCaY6ZBpynZfSBczGgvItejsoIUUysHhTU",
    authDomain: "voxelhub.cl",
    projectId: "radiology-app-v2",
    storageBucket: "radiology-app-v2.firebasestorage.app",
    messagingSenderId: "912001376646",
    appId: "1:912001376646:web:e0d94d2f10f380b7a6cc07",
    measurementId: "G-DZQJQGBY6S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Initialize Firestore with long polling to avoid "Client Offline" errors
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
