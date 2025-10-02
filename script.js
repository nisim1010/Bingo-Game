import { initializeFirebase, auth, db } from './firebase.js';
import { assignUIElements, ui, updateAuthUI, openAuthModal, setupAuthModal, showView, showMessage, switchTab, renderInviteModal } from './ui.js';
import { handleAuthSubmit, handleLogout } from './auth.js';
import * as game from './game.js';
import * as friends from './friends.js';
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
            
            friends.listenForFriendsAndRequests(user.uid);
            game.listenForUserUpdates(user.uid);
        } else {
            state.currentUser = null;
            state.playerId = null;
            updateAuthUI(false, null);
        }
        handleRouting();
    });

    game.listenForLeaderboardUpdates();
    game.listenForRecentGames();
}

function setupEventListeners() {
    const appContainer = document.getElementById('app');

    appContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;

        const handleBackToHome = () => {
            if (state.unsubscribe.game) state.unsubscribe.game();
            if (state.unsubscribe.players) state.unsubscribe.players();
            state.gameId = null;
            window.history.pushState({}, '', window.location.pathname);
            showView('home');
        };

        const action = target.dataset.action || target.id;
        switch (action) {
            // Main Navigation
            case 'go-to-create-btn': showView('create'); break;
            case 'go-to-join-btn': showView('join'); break;
            case 'back-to-home-btn': handleBackToHome(); break;
            
            case 'leaderboard-tab-btn': switchTab('leaderboard'); break;
            case 'friends-tab-btn': switchTab('friends'); break;

            // Auth Navigation & Modals
            case 'login-btn-nav': openAuthModal(false); break;
            case 'register-btn-nav': openAuthModal(true); break;
            case 'logout-btn': handleLogout(); break;
            case 'friend-requests-btn': friends.openFriendRequestsModal(); break;
            case 'game-invites-btn': friends.openGameInvitesModal(); break;
            
            // Join/Create Flow
            case 'create-game-btn': game.createNewGame(); break;
            case 'copy-link-btn': game.copyGameLink(); break;
            case 'go-to-my-card-btn': handleRouting(); break;
            case 'join-by-id-btn':
                const input = ui.joinByIdInput.value.trim();
                try {
                    const url = new URL(input);
                    state.gameId = url.searchParams.get("game");
                } catch (_) { state.gameId = input; }
                handleRouting();
                break;
            
            // In-Game Actions
            case 'copy-game-id-btn': game.copyGameId(); break;
            case 'bingo-btn': game.checkBingo(); break;

            // Friend Actions
            case 'friend-search-btn': 
                const searchTerm = ui.friendSearchInput.value.trim();
                if (searchTerm) friends.searchUsers(searchTerm);
                break;
            case 'add-friend': friends.sendFriendRequest(target.dataset.id); break;
            case 'accept-friend': friends.acceptFriendRequest(target.dataset.id); break;
            case 'decline-friend': friends.declineFriendRequest(target.dataset.id); break;
            case 'invite-friend': 
                renderInviteModal(target.dataset.id, target.dataset.name, state.currentUser.activeGames);
                break;
            case 'send-game-invite':
                friends.sendGameInvite(target.dataset.friendId, target.dataset.gameId);
                break;
            case 'accept-game-invite': friends.acceptGameInvite(target.dataset.gameId); break;
            case 'decline-game-invite': friends.declineGameInvite(target.dataset.gameId); break;
            
            // Generic Modal Actions
            case 'close': target.closest('.modal-backdrop').classList.add('hidden'); break;
            case 'toggle-auth-mode':
                state.isRegisterMode = !state.isRegisterMode;
                setupAuthModal(state.isRegisterMode);
                break;
            case 'submit-auth': handleAuthSubmit(state.isRegisterMode); break;
            case 'play-again':
                ui.winnerModal.classList.add('hidden');
                handleBackToHome();
                break;
        }
    });

    appContainer.addEventListener('input', (event) => {
        const targetId = event.target.id;
        if (targetId === 'phrases-input' || targetId === 'rare-phrases-input') {
            game.updatePhraseCount();
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

