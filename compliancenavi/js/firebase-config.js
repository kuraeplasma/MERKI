// Firebase Configuration
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAf2PSD2642QX_Wt1WkYzcF8UnBqUq4SzI",
    authDomain: "merki-1f5d5.firebaseapp.com",
    projectId: "merki-1f5d5",
    storageBucket: "merki-1f5d5.firebasestorage.app",
    messagingSenderId: "107224092542",
    appId: "1:107224092542:web:bd7be48ee438d1e0bb6d2f",
    measurementId: "G-MC8HQSR938"
};

// Initialize Firebase (Check if already initialized to avoid errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Environment Configuration
const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
export const PRODUCTS_COLLECTION = isLocal ? "products_dev" : "products";
export const ORDERS_COLLECTION = isLocal ? "orders_dev" : "orders";

console.log(`Environment: ${isLocal ? 'Development (products_dev, orders_dev)' : 'Production (products, orders)'}`);

// Export Firestore functions
export {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    ref,
    uploadBytes,
    getDownloadURL,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updateEmail
};

console.log('Firebase initialized successfully v20260127_26');
