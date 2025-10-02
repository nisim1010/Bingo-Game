import { initializeFirebase, auth, db } from './firebase.js';
import { assignUIElements, ui, updateAuthUI, openAuthModal, setupAuthModal, showView, showMessage } from './ui.js';
import { handleAuthSubmit, handleLogout } from './auth.js';
import * as game from './game.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- App State ---
export let state = {
    currentUser: null,
    gameId: null,
    playerId: null,
    isRegisterMode: false,
    unsubscribe: {}
};

// --- Entry Point ---
function init() {
    assignUIElements();
    setupEventListeners();
    initializeFirebase();

    onAuthStateChanged(auth, async user => {
        if (state.unsubscribe.user) state.unsubscribe.user();

        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            state.currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
            state.playerId = user.uid;
            updateAuthUI(true, state.currentUser);
            
            game.listenForUserUpdates(user.uid);
            if(ui.activeGamesContainer) ui.activeGamesContainer.classList.remove('hidden');
        } else {
            state.currentUser = null;
            state.playerId = null;
            updateAuthUI(false, null);
            if(ui.activeGamesContainer) ui.activeGamesContainer.classList.add('hidden');
        }
        handleRouting();
    });

    game.listenForLeaderboardUpdates();
    game.listenForRecentGames();
}

function setupEventListeners() {
    ui.loginBtnNav.addEventListener('click', () => {
        state.isRegisterMode = false;
        openAuthModal(state.isRegisterMode);
    });
    ui.registerBtnNav.addEventListener('click', () => {
        state.isRegisterMode = true;
        openAuthModal(state.isRegisterMode);
    });
    ui.goToCreateBtn.addEventListener('click', () => showView('create'));
    ui.goToJoinBtn.addEventListener('click', () => showView('join'));
    ui.backToHomeFromCreateBtn.addEventListener('click', () => showView('home'));
    ui.backToHomeFromJoinBtn.addEventListener('click', () => showView('home'));
    ui.backToHomeFromBoardBtn.addEventListener('click', () => {
        window.location.href = window.location.origin + window.location.pathname;
    });
    ui.joinByIdBtn.addEventListener('click', () => {
        const input = ui.joinByIdInput.value.trim();
        try {
            const url = new URL(input);
            state.gameId = url.searchParams.get("game");
        } catch (_) {
            state.gameId = input; // Assume it's just an ID
        }
        handleRouting();
    });

    ui.logoutBtn.addEventListener('click', handleLogout);
    
    ui.authModal.addEventListener('click', (event) => {
        const targetId = event.target.id;
        if (targetId === 'auth-close-btn') {
            ui.authModal.classList.add('hidden');
        } else if (targetId === 'auth-toggle-btn') {
            state.isRegisterMode = !state.isRegisterMode;
            setupAuthModal(state.isRegisterMode);
        } else if (targetId === 'auth-submit-btn') {
            handleAuthSubmit();
        }
    });
    
    ui.phrasesInput.addEventListener('input', game.updatePhraseCount);
    ui.rarePhrasesInput.addEventListener('input', game.updatePhraseCount);
    ui.createGameBtn.addEventListener('click', game.createNewGame);
    ui.copyLinkBtn.addEventListener('click', game.copyGameLink);
    ui.goToMyCardBtn.addEventListener('click', handleRouting);
    ui.bingoBtn.addEventListener('click', game.checkBingo);
    ui.copyGameIdBtn.addEventListener('click', game.copyGameId);

    ui.winnerModal.addEventListener('click', (event) => {
        if (event.target.id === 'close-modal-btn') {
            if (state.unsubscribe.game) state.unsubscribe.game();
            if (state.unsubscribe.players) state.unsubscribe.players();
            window.location.href = window.location.origin + window.location.pathname;
        }
    });

    ui.messageModal.addEventListener('click', (event) => {
        if (event.target.id === 'message-modal-close-btn') {
            ui.messageModal.classList.add('hidden');
        }
    });
}

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get('game');
    
    if (urlGameId && !state.gameId) {
        state.gameId = urlGameId;
    }
    
    if (state.gameId) {
        if (state.currentUser) {
            game.joinGame(state.currentUser.displayName, state.currentUser.uid);
        } else {
            openAuthModal(false);
            showMessage("Login Required", "You must be logged in to join this game.");
        }
    } else {
        showView('home');
    }
}

document.addEventListener('DOMContentLoaded', init);

