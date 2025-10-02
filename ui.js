import { state } from './script.js';
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const ui = {};

export function assignUIElements() {
    const ids = [
        'auth-container', 'user-info', 'user-display-name', 'logout-btn', 'login-register-buttons', 
        'login-btn-nav', 'register-btn-nav', 'auth-modal', 'auth-modal-title', 'auth-display-name', 
        'auth-email', 'auth-password', 'auth-error', 'auth-submit-btn', 'auth-toggle-text', 
        'auth-toggle-btn', 'auth-close-btn', 'phrases-input', 'phrase-count', 'error-message', 
        'create-game-btn', 'game-link-input', 'copy-link-btn', 'go-to-my-card-btn', 
        'bingo-card-container', 'player-name-display', 'player-score-display', 'bingo-btn', 
        'winner-modal', 'winner-name', 'close-modal-btn', 'message-modal', 'message-modal-title', 
        'message-modal-text', 'message-modal-close-btn', 'leaderboard', 'recent-games', 
        'live-players-container', 'rare-phrases-input', 'rare-phrase-count', 'rare-phrases-container', 
        'active-games-container', 'active-games-list', 'join-by-id-input', 'join-by-id-btn', 'friends-list',
        'go-to-create-btn', 'go-to-join-btn', 'back-to-home-from-create-btn', 'back-to-home-from-join-btn',
        'home-game-view', 'back-to-home-from-board-btn', 'game-id-display', 'copy-game-id-btn'
    ];

    ids.forEach(id => {
        const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        ui[key] = document.getElementById(id);
    });
}

export function showMessage(title, text) {
    ui.messageModal.innerHTML = `
        <div class="modal-content bg-gray-800 text-center">
            <h2 id="message-modal-title" class="text-2xl font-bold text-gray-100 mb-4">${title}</h2>
            <p id="message-modal-text" class="text-lg text-gray-300">${text}</p>
            <button id="message-modal-close-btn" class="mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">OK</button>
        </div>`;
    ui.messageModal.classList.remove('hidden');
}

export function updateAuthUI(isLoggedIn, currentUser) {
    if (isLoggedIn) {
        ui.userDisplayName.textContent = `${currentUser.displayName}`;
        ui.userInfo.classList.remove('hidden');
        ui.loginRegisterButtons.classList.add('hidden');
    } else {
        ui.userInfo.classList.add('hidden');
        ui.loginRegisterButtons.classList.remove('hidden');
    }
}

export function openAuthModal(isRegister) {
    ui.authModal.innerHTML = `
        <div class="modal-content bg-gray-800 text-left w-full max-w-sm relative">
            <h2 id="auth-modal-title" class="text-2xl font-bold text-gray-100 mb-4">Login</h2>
            <div class="space-y-4">
                <input id="auth-display-name" type="text" class="w-full p-3 border border-gray-600 rounded-md bg-gray-700" placeholder="Display Name">
                <input id="auth-email" type="email" class="w-full p-3 border border-gray-600 rounded-md bg-gray-700" placeholder="Email">
                <input id="auth-password" type="password" class="w-full p-3 border border-gray-600 rounded-md bg-gray-700" placeholder="Password">
            </div>
            <p id="auth-error" class="text-red-500 text-sm mt-2 h-5"></p>
            <button id="auth-submit-btn" class="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Login</button>
            <p class="text-xs text-gray-400 mt-4 text-center">
                <span id="auth-toggle-text">Don't have an account?</span>
                <button id="auth-toggle-btn" class="text-blue-400 hover:underline">Register</button>
            </p>
            <button id="auth-close-btn" class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>`;
    ui.authModal.classList.remove('hidden');
    setupAuthModal(isRegister);
}


export function setupAuthModal(isRegister) {
    const authDisplayName = document.getElementById('auth-display-name');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    
    authDisplayName.style.display = isRegister ? 'block' : 'none';
    authModalTitle.textContent = isRegister ? 'Register' : 'Login';
    authSubmitBtn.textContent = isRegister ? 'Register' : 'Login';
    authToggleText.textContent = isRegister ? 'Already have an account?' : "Don't have an account?";
    authToggleBtn.textContent = isRegister ? 'Login' : 'Register';
}


export function showView(view) {
    const viewIds = ['home-game-view', 'create-game-view', 'link-game-view', 'join-game-view', 'board-game-view', 'loading-spinner'];
    viewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (view === 'loading') {
        document.getElementById('loading-spinner').classList.remove('hidden');
    } else {
        const viewElement = document.getElementById(`${view}-game-view`);
        if (viewElement) {
            viewElement.classList.remove('hidden');
        }
    }
}

export function renderBingoCard(card, markedCells, onCellClick) {
    ui.bingoCardContainer.innerHTML = "";
    card.forEach((row, r) => {
        row.forEach((phrase, c) => {
            const cell = document.createElement("div");
            cell.className = "bingo-cell bg-gray-700 text-gray-200";
            if (markedCells[r][c] === 'T') {
                cell.classList.add('marked', 'bg-blue-500', 'text-white');
            }
            cell.textContent = phrase;
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener("click", () => {
                cell.innerHTML = `<div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mx-auto"></div>`;
                onCellClick(r, c);
            }, { once: true });
            ui.bingoCardContainer.appendChild(cell);
        });
    });
}


export function renderPlayerProgress(players) {
    ui.livePlayersContainer.innerHTML = '';
    if (players.length === 0) {
        ui.livePlayersContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Waiting for players...</p>';
        return;
    }
    players.sort((a, b) => (b.score || 0) - (a.score || 0));
    players.forEach(player => {
        if (player.id === state.playerId) {
            ui.playerScoreDisplay.textContent = player.score || 0;
        }
        const playerCard = document.createElement('div');
        playerCard.className = 'bg-gray-700 p-3 rounded-md';
        const header = document.createElement('div');
        header.className = 'flex justify-between items-baseline text-sm mb-2';
        const nameEl = document.createElement('p');
        nameEl.className = 'font-bold truncate';
        nameEl.textContent = player.playerName;
        const scoreEl = document.createElement('p');
        scoreEl.className = 'text-blue-400 font-mono';
        scoreEl.textContent = player.score || 0;
        header.appendChild(nameEl);
        header.appendChild(scoreEl);
        playerCard.appendChild(header);
        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-card-grid';
        const markedCells = player.markedCells;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const miniCell = document.createElement('div');
                const isMarked = markedCells && markedCells[r] && markedCells[r][c] === 'T';
                miniCell.className = `mini-cell ${isMarked ? 'bg-blue-500' : 'bg-gray-600'}`;
                miniGrid.appendChild(miniCell);
            }
        }
        playerCard.appendChild(miniGrid);
        ui.livePlayersContainer.appendChild(playerCard);
    });
}

export function renderRarePhrases(phrases, onClaim, onUnclaim) {
    ui.rarePhrasesContainer.innerHTML = '';
    phrases.forEach((phrase, index) => {
        const cell = document.createElement('div');
        cell.className = 'rare-phrase-cell';

        if (phrase.claimedBy) {
            if (phrase.claimedBy === state.playerId) {
                cell.classList.add('bg-green-600', 'hover:bg-green-700', 'cursor-pointer');
                const textEl = document.createElement('p');
                textEl.textContent = phrase.text;
                const claimerEl = document.createElement('p');
                claimerEl.className = 'text-xs text-green-200 mt-1';
                claimerEl.textContent = `(Claimed by you)`;
                cell.appendChild(textEl);
                cell.appendChild(claimerEl);
                cell.addEventListener('click', () => {
                    cell.innerHTML = `<div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mx-auto"></div>`;
                    onUnclaim(index);
                }, { once: true });
            } else {
                cell.classList.add('bg-gray-700', 'cursor-not-allowed');
                const textEl = document.createElement('p');
                textEl.className = 'text-gray-400 line-through';
                textEl.textContent = phrase.text;
                const claimerEl = document.createElement('p');
                claimerEl.className = 'text-xs text-blue-400 mt-1';
                claimerEl.textContent = `Claimed by ${phrase.claimedByName}`;
                cell.appendChild(textEl);
                cell.appendChild(claimerEl);
            }
        } else {
            cell.classList.add('bg-purple-600', 'hover:bg-purple-700', 'cursor-pointer');
            cell.textContent = phrase.text;
            cell.addEventListener('click', () => {
                cell.innerHTML = `<div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mx-auto"></div>`;
                onClaim(index);
            }, { once: true });
        }
        ui.rarePhrasesContainer.appendChild(cell);
    });
}


export async function renderActiveGamesList(gameIds) {
    ui.activeGamesList.innerHTML = '';
    if (!gameIds || gameIds.length === 0) {
        ui.activeGamesList.innerHTML = '<p class="text-gray-500 text-center py-4">No active games found.</p>';
        return;
    }
    const gamePromises = gameIds.map(id => getDoc(doc(db, "bingoGames", id)));
    const gameDocs = await Promise.all(gamePromises);
    
    ui.activeGamesList.innerHTML = '';

    gameDocs.forEach(gameDoc => {
        if (gameDoc.exists()) {
            const gameData = gameDoc.data();
            const currentGameId = gameDoc.id;
            const entry = document.createElement('div');
            entry.className = 'bg-gray-700 p-3 rounded-md mb-2 flex justify-between items-center';
            const dateEl = document.createElement('span');
            dateEl.className = 'text-sm text-gray-400';
            dateEl.textContent = `Game from ${gameData.createdAt?.toDate().toLocaleDateString() || 'Recent'}`;
            const rejoinBtn = document.createElement('button');
            rejoinBtn.className = 'bg-green-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-green-700';
            rejoinBtn.textContent = 'Rejoin';
            
            rejoinBtn.onclick = () => {
                window.location.href = `${window.location.origin}${window.location.pathname}?game=${currentGameId}`;
            };

            entry.appendChild(dateEl);
            entry.appendChild(rejoinBtn);
            ui.activeGamesList.appendChild(entry);
        }
    });
}

