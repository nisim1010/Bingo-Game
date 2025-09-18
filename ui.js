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
        'active-games-container', 'active-games-list'
    ];

    ids.forEach(id => {
        const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        ui[key] = document.getElementById(id);
    });
}

export function showMessage(title, text) {
    ui.messageModalTitle.textContent = title;
    ui.messageModalText.textContent = text;
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
    ui.authModal.classList.remove('hidden');
    setupAuthModal(isRegister);
}

export function setupAuthModal(isRegister) {
    ui.authError.textContent = '';
    ui.authDisplayName.style.display = isRegister ? 'block' : 'none';
    ui.authModalTitle.textContent = isRegister ? 'Register' : 'Login';
    ui.authSubmitBtn.textContent = isRegister ? 'Register' : 'Login';
    ui.authToggleText.textContent = isRegister ? 'Already have an account?' : "Don't have an account?";
    ui.authToggleBtn.textContent = isRegister ? 'Login' : 'Register';
}

export function showView(view) {
    const viewIds = ['create-game-view', 'link-game-view', 'board-game-view', 'loading-spinner'];
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
            cell.addEventListener("click", () => onCellClick(r, c));
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
                cell.addEventListener('click', () => onUnclaim(index));
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
            cell.addEventListener('click', () => onClaim(index), { once: true });
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

