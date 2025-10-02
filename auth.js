import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { ui } from './ui.js';

export async function handleAuthSubmit(isRegisterMode) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const displayName = document.getElementById('auth-display-name').value;
    const authError = document.getElementById('auth-error');
    authError.textContent = '';

    try {
        if (isRegisterMode) {
            if (!displayName || !email || !password) { authError.textContent = 'All fields are required.'; return; }
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), { displayName, activeGames: [] });
        } else {
            if (!email || !password) { authError.textContent = 'All fields are required.'; return; }
            await signInWithEmailAndPassword(auth, email, password);
        }
        ui.authModal.classList.add('hidden');
    } catch (error) {
        authError.textContent = error.message;
    }
}

export function handleLogout() {
    signOut(auth);
}

