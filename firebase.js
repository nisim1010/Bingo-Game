import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDi4lqp8VnQK6OCWdTJ7nLg0MekDtuQqoY",
    authDomain: "phrasebingo.firebaseapp.com",
    projectId: "phrasebingo",
    storageBucket: "phrasebingo.firebasestorage.app",
    messagingSenderId: "67899629832",
    appId: "1:67899629832:web:bebc5dcb58dd89c0a90cbd",
    measurementId: "G-CGR9LQ8GJ3"
};

export let app, auth, db;

export function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully");
    } catch (e) {
        console.error("Firebase init failed:", e);
    }
}
