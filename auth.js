import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { ui } from './ui.js';
import { state } from './script.js';

export async function handleAuthSubmit() {
    const email = ui.authEmail.value;
    const password = ui.authPassword.value;
    const displayName = ui.authDisplayName.value;
    ui.authError.textContent = '';

    try {
        if (state.isRegisterMode) {
            if (!displayName || !email || !password) { ui.authError.textContent = 'All fields are required.'; return; }
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), { displayName, activeGames: [] });
        } else {
            if (!email || !password) { ui.authError.textContent = 'All fields are required.'; return; }
            await signInWithEmailAndPassword(auth, email, password);
        }
        ui.authModal.classList.add('hidden');
    } catch (error) {
        ui.authError.textContent = error.message;
    }
}

export function handleLogout() {
    signOut(auth);
}

