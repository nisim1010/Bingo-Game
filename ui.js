import { state } from './script.js';
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const ui = {};

export function assignUIElements() {
    const ids = [
        'app', 'auth-container', 'user-info', 'user-display-name', 'logout-btn', 'login-register-buttons', 
        'login-btn-nav', 'register-btn-nav', 'auth-modal', 'friend-requests-btn', 'friend-requests-count', 
        'friend-requests-modal', 'phrases-input', 'phrase-count', 'error-message', 
        'create-game-btn', 'game-link-input', 'copy-link-btn', 'go-to-my-card-btn', 
        'bingo-card-container', 'player-name-display', 'player-score-display', 'bingo-btn', 
        'winner-modal', 'message-modal', 'leaderboard', 'recent-games', 'live-players-container', 
        'rare-phrases-input', 'rare-phrase-count', 'rare-phrases-container', 
        'active-games-container', 'active-games-list', 'join-by-id-input', 'join-by-id-btn', 'friends-list',
        'go-to-create-btn', 'go-to-join-btn', 'home-game-view', 'create-game-view', 'join-game-view', 
        'link-game-view', 'board-game-view', 'loading-spinner', 'game-id-display', 'copy-game-id-btn',
        'friend-search-input', 'friend-search-btn', 'friend-search-results', 'leaderboard-panel', 'friends-panel',
        'leaderboard-tab-btn', 'friends-tab-btn', 'invite-modal', 'game-invites-btn', 'game-invites-count',
        'game-invites-modal', 'page-title', 'back-to-home-btn', 'game-invites-container', 'game-invites-list'
    ];

    ids.forEach(id => {
        const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        ui[key] = document.getElementById(id);
    });
}

export function showMessage(title, text) {
    ui.messageModal.innerHTML = `
        <div class="modal-content bg-gray-800 text-center">
            <h2 class="text-2xl font-bold text-gray-100 mb-4">${title}</h2>
            <p class="text-lg text-gray-300">${text}</p>
            <button data-action="close" class="mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">OK</button>
        </div>`;
    ui.messageModal.classList.remove('hidden');
}

export function updateAuthUI(isLoggedIn, currentUser) {
    if (isLoggedIn) {
        ui.userDisplayName.textContent = `${currentUser.displayName}`;
        ui.userInfo.classList.remove('hidden');
        ui.friendRequestsBtn.classList.remove('hidden');
        ui.gameInvitesBtn.classList.remove('hidden');
        ui.loginRegisterButtons.classList.add('hidden');
    } else {
        ui.userInfo.classList.add('hidden');
        ui.friendRequestsBtn.classList.add('hidden');
        ui.gameInvitesBtn.classList.add('hidden');
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
            <button data-action="submit-auth" class="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Login</button>
            <p class="text-xs text-gray-400 mt-4 text-center">
                <span id="auth-toggle-text">Don't have an account?</span>
                <button data-action="toggle-auth-mode" class="text-blue-400 hover:underline">Register</button>
            </p>
            <button data-action="close" class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>`;
    ui.authModal.classList.remove('hidden');
    setupAuthModal(isRegister);
}


export function setupAuthModal(isRegister) {
    const authDisplayName = document.getElementById('auth-display-name');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authSubmitBtn = document.querySelector('[data-action="submit-auth"]');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authToggleBtn = document.querySelector('[data-action="toggle-auth-mode"]');
    
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

    ui.backToHomeBtn.classList.toggle('hidden', view === 'home');
    
    switch(view) {
        case 'home':
            ui.pageTitle.textContent = "Bingo Game";
            break;
        case 'create':
            ui.pageTitle.textContent = "Create a Game";
            break;
        case 'join':
            ui.pageTitle.textContent = "Join a Game";
            if (state.currentUser) {
                if(ui.activeGamesContainer) ui.activeGamesContainer.classList.remove('hidden');
                if(ui.gameInvitesContainer) ui.gameInvitesContainer.classList.remove('hidden');
            }
            break;
        case 'board':
             ui.pageTitle.textContent = "Your Bingo Card";
            break;
    }

    if (view === 'loading') {
        ui.loadingSpinner.classList.remove('hidden');
    } else {
        const viewElement = document.getElementById(`${view}-game-view`);
        if (viewElement) {
            viewElement.classList.remove('hidden');
        }
    }
}

export function switchTab(activeTab) {
    if (activeTab === 'friends') {
        ui.friendsPanel.classList.remove('hidden');
        ui.leaderboardPanel.classList.add('hidden');
        
        ui.friendsTabBtn.classList.add('bg-gray-800', 'border-b-2', 'border-blue-500');
        ui.friendsTabBtn.classList.remove('text-gray-400');
        
        ui.leaderboardTabBtn.classList.add('text-gray-400');
        ui.leaderboardTabBtn.classList.remove('bg-gray-800', 'border-b-2', 'border-blue-500');
    } else { // Default to leaderboard
        ui.leaderboardPanel.classList.remove('hidden');
        ui.friendsPanel.classList.add('hidden');

        ui.leaderboardTabBtn.classList.add('bg-gray-800', 'border-b-2', 'border-blue-500');
        ui.leaderboardTabBtn.classList.remove('text-gray-400');

        ui.friendsTabBtn.classList.add('text-gray-400');
        ui.friendsTabBtn.classList.remove('bg-gray-800', 'border-b-2', 'border-blue-500');
    }
}

export function renderWinnerModal(winnerName) {
    ui.winnerModal.innerHTML = `
        <div class="modal-content bg-gray-800 text-center">
            <h2 class="text-4xl font-bold text-amber-500 mb-4">BINGO CALLED!</h2>
            <p class="text-lg text-gray-300">The player with the highest score wins...</p>
            <p class="mt-4 text-2xl">The winner is <strong class="text-blue-400">${winnerName}</strong>!</p>
            <button data-action="play-again" class="mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Play Again</button>
        </div>`;
    ui.winnerModal.classList.remove('hidden');
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


export function renderPlayerProgress(players, currentPlayerId) {
    if(!ui.livePlayersContainer) return;
    ui.livePlayersContainer.innerHTML = '';
    if (players.length === 0) {
        ui.livePlayersContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Waiting for players...</p>';
        return;
    }
    players.sort((a, b) => (b.score || 0) - (a.score || 0));
    players.forEach(player => {
        if (player.id === currentPlayerId) {
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

export function renderRarePhrases(phrases, currentPlayerId, onClaim, onUnclaim) {
    if(!ui.rarePhrasesContainer) return;
    ui.rarePhrasesContainer.innerHTML = '';
    phrases.forEach((phrase, index) => {
        const cell = document.createElement('div');
        cell.className = 'rare-phrase-cell';

        if (phrase.claimedBy) {
            if (phrase.claimedBy === currentPlayerId) {
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
    if (!ui.activeGamesList) return;
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

export function updateFriendRequestCount(count) {
    if(!ui.friendRequestsCount) return;
    ui.friendRequestsCount.textContent = count;
    ui.friendRequestsCount.classList.toggle('hidden', count === 0);
}

export function renderFriendRequestsModal(requests) {
    let requestsHtml = requests.map(req => `
        <div class="flex items-center justify-between bg-gray-700 p-2 rounded mb-2">
            <span>${req.displayName}</span>
            <div>
                <button data-action="accept-friend" data-id="${req.id}" class="bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700">Accept</button>
                <button data-action="decline-friend" data-id="${req.id}" class="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-700 ml-2">Decline</button>
            </div>
        </div>
    `).join('');

    if (requests.length === 0) {
        requestsHtml = '<p class="text-gray-500 text-center">No new friend requests.</p>';
    }

    ui.friendRequestsModal.innerHTML = `
        <div class="modal-content bg-gray-800 w-full max-w-md text-left relative">
            <h2 class="text-2xl font-bold text-gray-100 mb-4">Friend Requests</h2>
            <div class="space-y-2">${requestsHtml}</div>
            <button data-action="close" class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>`;
    ui.friendRequestsModal.classList.remove('hidden');
}

export function renderFriendsList(friends) {
    if(!ui.friendsList) return;
    ui.friendsList.innerHTML = '';
    if (friends.length === 0) {
        ui.friendsList.innerHTML = '<p class="text-gray-500 text-center py-4">Your friends will appear here.</p>';
        return;
    }
    
    friends.forEach(friend => {
        const friendDiv = document.createElement('div');
        friendDiv.className = 'flex items-center justify-between bg-gray-700 p-2 rounded mb-2';
        friendDiv.textContent = friend.displayName;
        const inviteBtn = document.createElement('button');
        inviteBtn.className = 'bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-blue-700';
        inviteBtn.textContent = 'Invite';
        inviteBtn.dataset.action = 'invite-friend';
        inviteBtn.dataset.id = friend.id;
        inviteBtn.dataset.name = friend.displayName;
        friendDiv.appendChild(inviteBtn);
        ui.friendsList.appendChild(friendDiv);
    });
}

export async function renderInviteModal(friendId, friendName, gameIds) {
    let gamesHtml = '<p class="text-gray-500 text-center">You have no active games to invite them to.</p>';
    
    if (gameIds && gameIds.length > 0) {
        const gamePromises = gameIds.map(id => getDoc(doc(db, "bingoGames", id)));
        const gameDocs = await Promise.all(gamePromises);

        const trulyActiveGames = gameDocs.filter(doc => doc.exists() && !doc.data().winner);

        if (trulyActiveGames.length > 0) {
            gamesHtml = trulyActiveGames.map(gameDoc => {
                const gameId = gameDoc.id;
                return `
                <div class="flex items-center justify-between bg-gray-700 p-2 rounded mb-2">
                    <span class="truncate">Game: ${gameId}</span>
                    <button data-action="send-game-invite" data-game-id="${gameId}" data-friend-id="${friendId}" class="bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700">Send Invite</button>
                </div>
            `}).join('');
        }
    }

    ui.inviteModal.innerHTML = `
        <div class="modal-content bg-gray-800 w-full max-w-md text-left relative">
            <h2 class="text-2xl font-bold text-gray-100 mb-4">Invite ${friendName}</h2>
            <p class="text-gray-400 mb-4">Choose an active game to invite them to:</p>
            <div class="space-y-2">${gamesHtml}</div>
            <button data-action="close" class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>`;
    ui.inviteModal.classList.remove('hidden');
}

export function updateGameInviteCount(count) {
    if (!ui.gameInvitesCount) return;
    ui.gameInvitesCount.textContent = count;
    ui.gameInvitesCount.classList.toggle('hidden', count === 0);
}

export function renderGameInvitesModal(invites) {
    let invitesHtml = invites.map(inv => `
        <div class="flex items-center justify-between bg-gray-700 p-2 rounded mb-2">
            <div>
                <p>From: <span class="font-bold">${inv.from}</span></p>
                <p class="text-xs text-gray-400 truncate">Game ID: ${inv.gameId}</p>
            </div>
            <div>
                <button data-action="accept-game-invite" data-game-id="${inv.gameId}" class="bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700">Accept</button>
                <button data-action="decline-game-invite" data-game-id="${inv.gameId}" class="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-700 ml-2">Decline</button>
            </div>
        </div>
    `).join('');

    if (invites.length === 0) {
        invitesHtml = '<p class="text-gray-500 text-center">No new game invites.</p>';
    }

    ui.gameInvitesModal.innerHTML = `
        <div class="modal-content bg-gray-800 w-full max-w-md text-left relative">
            <h2 class="text-2xl font-bold text-gray-100 mb-4">Game Invites</h2>
            <div class="space-y-2">${invitesHtml}</div>
            <button data-action="close" class="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>`;
    ui.gameInvitesModal.classList.remove('hidden');
}

export function renderGameInvitesList(invites) {
    if (!ui.gameInvitesList) return;
    ui.gameInvitesList.innerHTML = '';
    if (invites.length === 0) {
        ui.gameInvitesList.innerHTML = '<p class="text-gray-500 text-center py-4">No new game invites.</p>';
        return;
    }

    let invitesHtml = invites.map(inv => `
        <div class="flex items-center justify-between bg-gray-700 p-2 rounded mb-2">
            <div>
                <p>From: <span class="font-bold">${inv.from}</span></p>
                <p class="text-xs text-gray-400 truncate">Game ID: ${inv.gameId}</p>
            </div>
            <div>
                <button data-action="accept-game-invite" data-game-id="${inv.gameId}" class="bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700">Accept</button>
                <button data-action="decline-game-invite" data-game-id="${inv.gameId}" class="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-700 ml-2">Decline</button>
            </div>
        </div>
    `).join('');
    ui.gameInvitesList.innerHTML = invitesHtml;
}

