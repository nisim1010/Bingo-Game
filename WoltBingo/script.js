import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, updateDoc, runTransaction, query, orderBy, limit, arrayUnion, arrayRemove, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDi4lqp8VnQK6OCWdTJ7nLg0MekDtuQqoY",
    authDomain: "phrasebingo.firebaseapp.com",
    projectId: "phrasebingo",
    storageBucket: "phrasebingo.firebasestorage.app",
    messagingSenderId: "67899629832",
    appId: "1:67899629832:web:bebc5dcb58dd89c0a90cbd",
    measurementId: "G-CGR9LQ8GJ3"
};

// --- App State ---
let app, auth, db;
let currentUser = null; 
let gameId, playerId;
let unsubscribeGame, unsubscribeLeaderboard, unsubscribePlayers, unsubscribeUser;
let isRegisterMode = false;

// --- UI Elements ---
let authContainer, userInfo, userDisplayName, logoutBtn, loginRegisterButtons, loginBtnNav, registerBtnNav, authModal, authModalTitle, authDisplayName, authEmail, authPassword, authError, authSubmitBtn, authToggleText, authToggleBtn, authCloseBtn, phrasesInput, phraseCount, errorMessage, createGameBtn, gameLinkInput, copyLinkBtn, goToMyCardBtn, bingoCardContainer, playerNameDisplay, playerScoreDisplay, bingoBtn, winnerModal, winnerName, closeModalBtn, messageModal, messageModalTitle, messageModalText, messageModalCloseBtn, leaderboardContainer, recentGamesContainer, livePlayersContainer, rarePhrasesInput, rarePhraseCount, rarePhrasesContainer, activeGamesContainer, activeGamesList;

// --- Core Functions ---

function showMessage(title, text) {
    messageModalTitle.textContent = title;
    messageModalText.textContent = text;
    messageModal.classList.remove('hidden');
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        userDisplayName.textContent = `${currentUser.displayName}`;
        userInfo.classList.remove('hidden');
        loginRegisterButtons.classList.add('hidden');
    } else {
        userInfo.classList.add('hidden');
        loginRegisterButtons.classList.remove('hidden');
    }
}

function openAuthModal(isRegister) {
    isRegisterMode = isRegister;
    authModal.classList.remove('hidden');
    setupAuthModal();
}

function setupAuthModal() {
    authError.textContent = '';
    authDisplayName.style.display = isRegisterMode ? 'block' : 'none';
    authModalTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    authToggleText.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
    authToggleBtn.textContent = isRegisterMode ? 'Login' : 'Register';
}

async function handleAuthSubmit() {
    const email = authEmail.value;
    const password = authPassword.value;
    const displayName = authDisplayName.value;
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
        authModal.classList.add('hidden');
    } catch (error) {
        authError.textContent = error.message;
    }
}

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get('game');
    
    if (urlGameId && !gameId) {
        gameId = urlGameId;
    }
    
    if (gameId) {
        joinGameFlow();
    } else {
        showView('create');
    }
}

function joinGameFlow() {
    if (currentUser) {
        joinGame(currentUser.displayName, currentUser.uid);
    } else {
        openAuthModal(false);
        showMessage("Login Required", "You must be logged in to join a game.");
    }
}

function showView(view) {
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

function getPhrasesFromInput() {
    return phrasesInput.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

function getRarePhrasesFromInput() {
    return rarePhrasesInput.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

function updatePhraseCount() {
    const commonPhrases = getPhrasesFromInput();
    const rarePhrases = getRarePhrasesFromInput();
    phraseCount.textContent = `${commonPhrases.length} phrases`;
    rarePhraseCount.textContent = `${rarePhrases.length} phrases`;

    const isCommonValid = commonPhrases.length >= 25;
    const isRareValid = rarePhrases.length >= 5;
    
    createGameBtn.disabled = !(isCommonValid && isRareValid);

    if (!isCommonValid && !isRareValid) {
        errorMessage.textContent = 'Need at least 25 common phrases and at least 5 rare phrases.';
    } else if (!isCommonValid) {
        errorMessage.textContent = 'You need at least 25 common phrases.';
    } else if (!isRareValid) {
        errorMessage.textContent = 'You need at least 5 rare phrases.';
    } else {
        errorMessage.textContent = '';
    }
}

async function createNewGame() {
    const commonPhrases = getPhrasesFromInput();
    const rarePhrasesRaw = getRarePhrasesFromInput();

    if (commonPhrases.length < 25 || rarePhrasesRaw.length < 5) {
        showMessage("Invalid Phrases", "Please ensure you have at least 25 common phrases and at least 5 rare phrases.");
        return;
    }
    
    showView('loading');

    const shuffledRare = [...rarePhrasesRaw].sort(() => 0.5 - Math.random());
    const selectedRare = shuffledRare.slice(0, 5);

    const rarePhrases = selectedRare.map(phrase => ({
        text: phrase,
        claimedBy: null,
        claimedByName: null
    }));

    try {
        const gameDocRef = await addDoc(collection(db, "bingoGames"), {
            creatorId: currentUser ? currentUser.uid : 'guest',
            createdAt: serverTimestamp(),
            allPhrases: commonPhrases,
            rarePhrases: rarePhrases,
            winner: null
        });

        gameId = gameDocRef.id;
        const newUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        gameLinkInput.value = newUrl;
        showView('link');

    } catch (error) {
        console.error("Error creating game:", error);
        showMessage("Error", "There was an error creating your game.");
        showView('create');
    }
}

function copyGameLink() {
    gameLinkInput.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => { copyLinkBtn.textContent = 'Copy'; }, 2000);
}

async function joinGame(pName, pId) {
    playerId = pId;
    showView('loading');
    
    try {
        const gameRef = doc(db, "bingoGames", gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
            showView('create'); 
            showMessage("Game Not Found", "The game link is broken or doesn't exist.");
            return;
        }

        const gameData = gameDoc.data();
        listenForGameUpdates(gameId);
        listenForPlayerUpdates(gameId);
        
        playerNameDisplay.textContent = pName;
        const playerRef = doc(db, `bingoGames/${gameId}/players`, playerId);
        const playerDoc = await getDoc(playerRef);

        if (playerDoc.exists()) {
            await updateDoc(playerRef, { playerName: pName });
            renderBingoCard(JSON.parse(playerDoc.data().card), playerDoc.data().markedCells);
        } else {
            const newCard = generateBingoCard(gameData.allPhrases);
            const initialMarkedCells = Array(5).fill("FFFFF");
            
            await setDoc(playerRef, {
                playerName: pName,
                card: JSON.stringify(newCard),
                markedCells: initialMarkedCells,
                score: 0
            });

            renderBingoCard(newCard, initialMarkedCells);
        }

        if (currentUser) {
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, { activeGames: arrayUnion(gameId) });
        }
        
        showView('board');
    } catch (error) {
        console.error("Error joining game:", error);
        showView('create');
    }
}

function generateBingoCard(phrases) {
    const shuffled = [...phrases].sort(() => 0.5 - Math.random());
    const cardPhrases = shuffled.slice(0, 25);
    const card = [];
    for (let i = 0; i < 5; i++) {
        card.push(cardPhrases.slice(i * 5, i * 5 + 5));
    }
    return card;
}

function renderBingoCard(card, markedCells) {
    bingoCardContainer.innerHTML = "";
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
            cell.addEventListener("click", () => toggleCell(r, c));
            bingoCardContainer.appendChild(cell);
        });
    });
}

function calculateScore(markedCells) {
    let markedCount = 0;
    let connectionCount = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (markedCells[r][c] === 'T') {
                markedCount++;
                if (c < 4 && markedCells[r][c + 1] === 'T') connectionCount++;
                if (r < 4 && markedCells[r + 1][c] === 'T') connectionCount++;
            }
        }
    }
    return (markedCount * 100) + (connectionCount * 50);
}

async function toggleCell(row, col) {
    try {
        const playerRef = doc(db, `bingoGames/${gameId}/players`, playerId);
        
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) throw "Player not found";

            let markedCells = playerDoc.data().markedCells;
            const rowArr = markedCells[row].split('');
            rowArr[col] = rowArr[col] === 'T' ? 'F' : 'T';
            markedCells[row] = rowArr.join('');

            const newScore = calculateScore(markedCells);
            transaction.update(playerRef, { markedCells, score: newScore });
        });

    } catch (error) {
        console.error("Error updating cell:", error);
        showMessage("Sync Error", "Could not save your last move.");
    }
}

async function checkBingo() {
    const playerRef = doc(db, `bingoGames/${gameId}/players`, playerId);
    const playerDoc = await getDoc(playerRef);
    if (!playerDoc.exists()) return;

    const playerData = playerDoc.data();
    const markedCells = playerData.markedCells;
    let hasBingo = false;

    for (let i = 0; i < 5; i++) {
        if (markedCells[i] === "TTTTT" || markedCells.every(row => row[i] === 'T')) {
            hasBingo = true;
            break;
        }
    }
    if (!hasBingo) {
        if (markedCells.every((r, i) => r[i] === 'T') || markedCells.every((r, i) => r[4 - i] === 'T')) {
             hasBingo = true;
        }
    }
    
    if (hasBingo) {
        const gameRef = doc(db, "bingoGames", gameId);
        await updateDoc(gameRef, { winner: playerData.playerName });
        await updateLeaderboard(playerData.playerName, playerId);
        await cleanupEndedGame(gameId);
    } else {
        showMessage("Not a Bingo!", "You don't have a valid 5-in-a-row.");
    }
}

async function cleanupEndedGame(endedGameId) {
    const playersSnapshot = await getDocs(collection(db, `bingoGames/${endedGameId}/players`));
    
    playersSnapshot.forEach(async (playerDoc) => {
        const pId = playerDoc.id;
        const userDocRef = doc(db, "users", pId);
        try {
            await updateDoc(userDocRef, {
                activeGames: arrayRemove(endedGameId)
            });
        } catch (error) {
            // This will fail for guests, which is fine.
        }
    });
}

async function updateLeaderboard(winnerName, winnerId) {
    const leaderboardRef = doc(db, "leaderboard", winnerId);
    try {
        await runTransaction(db, async (transaction) => {
            const leaderboardDoc = await transaction.get(leaderboardRef);
            if (!leaderboardDoc.exists()) {
                transaction.set(leaderboardRef, { wins: 1, displayName: winnerName });
            } else {
                const newWins = (leaderboardDoc.data().wins || 0) + 1;
                transaction.update(leaderboardRef, { wins: newWins, displayName: winnerName });
            }
        });
    } catch (e) { console.error("Leaderboard transaction failed: ", e); }
}

function listenForLeaderboardUpdates() {
    const q = query(collection(db, "leaderboard"), orderBy("wins", "desc"));
    unsubscribeLeaderboard = onSnapshot(q, (querySnapshot) => {
        const players = [];
        querySnapshot.forEach((doc) => players.push({ id: doc.id, ...doc.data() }));
        
        leaderboardContainer.innerHTML = ''; 
        if (players.length === 0) {
            leaderboardContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No winners yet!</p>';
            return;
        }

        players.forEach(player => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            const nameEl = document.createElement('span');
            nameEl.className = 'leaderboard-name';
            nameEl.textContent = player.displayName;
            const scoreEl = document.createElement('span');
            scoreEl.className = 'leaderboard-score';
            scoreEl.textContent = player.wins;
            entry.appendChild(nameEl);
            entry.appendChild(scoreEl);
            leaderboardContainer.appendChild(entry);
        });
    });
}

function listenForRecentGames() {
    const q = query(collection(db, "bingoGames"), orderBy("createdAt", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
        recentGamesContainer.innerHTML = '';
        if (snapshot.empty) {
            recentGamesContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No recent games found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const gameData = doc.data();
            const entry = document.createElement('div');
            entry.className = 'bg-gray-700 p-3 rounded-md mb-2 flex justify-between items-center';
            const dateEl = document.createElement('span');
            dateEl.className = 'text-sm text-gray-400';
            dateEl.textContent = gameData.createdAt?.toDate().toLocaleDateString() || 'Recent Game';
            const useBtn = document.createElement('button');
            useBtn.className = 'bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-blue-700';
            useBtn.textContent = 'Use';
            useBtn.onclick = () => {
                phrasesInput.value = gameData.allPhrases.join('\n');
                if(gameData.rarePhrases) {
                    rarePhrasesInput.value = gameData.rarePhrases.map(p => p.text).join('\n');
                }
                updatePhraseCount();
                window.scrollTo(0, 0); 
            };
            entry.appendChild(dateEl);
            entry.appendChild(useBtn);
            recentGamesContainer.appendChild(entry);
        });
    }, (error) => {
        console.error("Error fetching recent games:", error);
        recentGamesContainer.innerHTML = '<p class="text-red-500 text-center py-4">Could not load games.</p>';
    });
}

function listenForGameUpdates(id) {
    unsubscribeGame = onSnapshot(doc(db, "bingoGames", id), (doc) => {
        if (!doc.exists()) return;
        const gameData = doc.data();
        if (gameData.winner && winnerModal.classList.contains('hidden')) {
            winnerName.textContent = gameData.winner;
            winnerModal.classList.remove('hidden');
            confetti({ particleCount: 150, spread: 180, origin: { y: 0.6 } });
        }
        if (gameData.rarePhrases) {
            renderRarePhrases(gameData.rarePhrases);
        }
    });
}

function listenForPlayerUpdates(id) {
    unsubscribePlayers = onSnapshot(query(collection(db, `bingoGames/${id}/players`)), (snapshot) => {
        const players = [];
        snapshot.forEach((doc) => {
            players.push({ id: doc.id, ...doc.data() });
        });

        renderPlayerProgress(players);

        const currentPlayer = players.find(p => p.id === playerId);
        if (currentPlayer) {
            const cardData = JSON.parse(currentPlayer.card);
            const markedCellsData = currentPlayer.markedCells;
            renderBingoCard(cardData, markedCellsData);
        }
    });
}

function renderPlayerProgress(players) {
    livePlayersContainer.innerHTML = '';
    if (players.length === 0) {
        livePlayersContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Waiting for players...</p>';
        return;
    }
    players.sort((a, b) => (b.score || 0) - (a.score || 0));
    players.forEach(player => {
        if (player.id === playerId) {
            playerScoreDisplay.textContent = player.score || 0;
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
        livePlayersContainer.appendChild(playerCard);
    });
}

function renderRarePhrases(phrases) {
    rarePhrasesContainer.innerHTML = '';
    phrases.forEach((phrase, index) => {
        const cell = document.createElement('div');
        cell.className = 'rare-phrase-cell';

        if (phrase.claimedBy) {
            if (phrase.claimedBy === playerId) {
                cell.classList.add('bg-green-600', 'hover:bg-green-700', 'cursor-pointer');
                const textEl = document.createElement('p');
                textEl.textContent = phrase.text;
                const claimerEl = document.createElement('p');
                claimerEl.className = 'text-xs text-green-200 mt-1';
                claimerEl.textContent = `(Claimed by you)`;
                cell.appendChild(textEl);
                cell.appendChild(claimerEl);
                cell.addEventListener('click', () => unclaimRarePhrase(index));
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
            cell.addEventListener('click', () => claimRarePhrase(index), { once: true });
        }
        rarePhrasesContainer.appendChild(cell);
    });
}

async function claimRarePhrase(index) {
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = doc(db, "bingoGames", gameId);
            const playerRef = doc(db, `bingoGames/${gameId}/players`, playerId);
            const gameDoc = await transaction.get(gameRef);
            const playerDoc = await transaction.get(playerRef);
            if (!gameDoc.exists() || !playerDoc.exists()) throw "Game or player not found.";
            const gameData = gameDoc.data();
            const playerData = playerDoc.data();
            if (gameData.rarePhrases[index].claimedBy === null) {
                const updatedRarePhrases = [...gameData.rarePhrases];
                updatedRarePhrases[index] = { ...updatedRarePhrases[index], claimedBy: playerId, claimedByName: playerData.playerName };
                const newScore = (playerData.score || 0) + 300;
                transaction.update(gameRef, { rarePhrases: updatedRarePhrases });
                transaction.update(playerRef, { score: newScore });
            } else {
                showMessage("Too Late!", "Someone else just claimed that rare phrase.");
            }
        });
    } catch (error) {
        console.error("Failed to claim rare phrase:", error);
        showMessage("Error", "Could not claim the phrase. Please try again.");
    }
}

async function unclaimRarePhrase(index) {
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = doc(db, "bingoGames", gameId);
            const playerRef = doc(db, `bingoGames/${gameId}/players`, playerId);
            const gameDoc = await transaction.get(gameRef);
            const playerDoc = await transaction.get(playerRef);
            if (!gameDoc.exists() || !playerDoc.exists()) throw "Game or player not found.";
            const gameData = gameDoc.data();
            const playerData = playerDoc.data();
            if (gameData.rarePhrases[index].claimedBy === playerId) {
                const updatedRarePhrases = [...gameData.rarePhrases];
                updatedRarePhrases[index] = { ...updatedRarePhrases[index], claimedBy: null, claimedByName: null };
                const newScore = (playerData.score || 0) - 300;
                transaction.update(gameRef, { rarePhrases: updatedRarePhrases });
                transaction.update(playerRef, { score: newScore });
            }
        });
    } catch (error) {
        console.error("Failed to unclaim rare phrase:", error);
        showMessage("Error", "Could not unclaim the phrase. Please try again.");
    }
}

async function renderActiveGamesList(gameIds) {
    activeGamesList.innerHTML = '';
    if (!gameIds || gameIds.length === 0) {
        activeGamesList.innerHTML = '<p class="text-gray-500 text-center py-4">No active games found.</p>';
        return;
    }
    const gamePromises = gameIds.map(id => getDoc(doc(db, "bingoGames", id)));
    const gameDocs = await Promise.all(gamePromises);
    
    activeGamesList.innerHTML = '';

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
                gameId = currentGameId;
                handleRouting();
            };

            entry.appendChild(dateEl);
            entry.appendChild(rejoinBtn);
            activeGamesList.appendChild(entry);
        }
    });
}

function listenForUserUpdates(uid) {
    const userDocRef = doc(db, "users", uid);
    unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            renderActiveGamesList(doc.data().activeGames || []);
        }
    });
}

function setupEventListeners() {
    loginBtnNav.addEventListener('click', () => openAuthModal(false));
    registerBtnNav.addEventListener('click', () => openAuthModal(true));
    logoutBtn.addEventListener('click', () => signOut(auth));
    authCloseBtn.addEventListener('click', () => authModal.classList.add('hidden'));
    authToggleBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        setupAuthModal();
    });
    authSubmitBtn.addEventListener('click', handleAuthSubmit);
    phrasesInput.addEventListener('input', updatePhraseCount);
    rarePhrasesInput.addEventListener('input', updatePhraseCount);
    createGameBtn.addEventListener('click', createNewGame);
    copyLinkBtn.addEventListener('click', copyGameLink);
    goToMyCardBtn.addEventListener('click', joinGameFlow);
    bingoBtn.addEventListener('click', checkBingo);
    closeModalBtn.addEventListener('click', () => {
        if (unsubscribeGame) unsubscribeGame();
        if (unsubscribePlayers) unsubscribePlayers();
        window.location.href = window.location.origin + window.location.pathname;
    });
    messageModalCloseBtn.addEventListener('click', () => messageModal.classList.add('hidden'));
}

function assignUIElements() {
    authContainer = document.getElementById('auth-container');
    userInfo = document.getElementById('user-info');
    userDisplayName = document.getElementById('user-display-name');
    logoutBtn = document.getElementById('logout-btn');
    loginRegisterButtons = document.getElementById('login-register-buttons');
    loginBtnNav = document.getElementById('login-btn-nav');
    registerBtnNav = document.getElementById('register-btn-nav');
    authModal = document.getElementById('auth-modal');
    authModalTitle = document.getElementById('auth-modal-title');
    authDisplayName = document.getElementById('auth-display-name');
    authEmail = document.getElementById('auth-email');
    authPassword = document.getElementById('auth-password');
    authError = document.getElementById('auth-error');
    authSubmitBtn = document.getElementById('auth-submit-btn');
    authToggleText = document.getElementById('auth-toggle-text');
    authToggleBtn = document.getElementById('auth-toggle-btn');
    authCloseBtn = document.getElementById('auth-close-btn');
    phrasesInput = document.getElementById('phrases-input');
    phraseCount = document.getElementById('phrase-count');
    errorMessage = document.getElementById('error-message');
    createGameBtn = document.getElementById('create-game-btn');
    gameLinkInput = document.getElementById('game-link-input');
    copyLinkBtn = document.getElementById('copy-link-btn');
    goToMyCardBtn = document.getElementById('go-to-my-card-btn');
    bingoCardContainer = document.getElementById('bingo-card-container');
    playerNameDisplay = document.getElementById('player-name-display');
    playerScoreDisplay = document.getElementById('player-score-display');
    bingoBtn = document.getElementById('bingo-btn');
    winnerModal = document.getElementById('winner-modal');
    winnerName = document.getElementById('winner-name');
    closeModalBtn = document.getElementById('close-modal-btn');
    messageModal = document.getElementById('message-modal');
    messageModalTitle = document.getElementById('message-modal-title');
    messageModalText = document.getElementById('message-modal-text');
    messageModalCloseBtn = document.getElementById('message-modal-close-btn');
    leaderboardContainer = document.getElementById('leaderboard');
    recentGamesContainer = document.getElementById('recent-games');
    livePlayersContainer = document.getElementById('live-players-container');
    rarePhrasesInput = document.getElementById('rare-phrases-input');
    rarePhraseCount = document.getElementById('rare-phrase-count');
    rarePhrasesContainer = document.getElementById('rare-phrases-container');
    activeGamesContainer = document.getElementById('active-games-container');
    activeGamesList = document.getElementById('active-games-list');
}

// --- Entry Point ---
function init() {
    assignUIElements();
    setupEventListeners();

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) { console.error("Firebase init failed:", e); return; }

    onAuthStateChanged(auth, async user => {
        const previousPlayerId = playerId;
        if (unsubscribeUser) unsubscribeUser();

        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
            updateAuthUI(true);
            
            listenForUserUpdates(user.uid);
            activeGamesContainer.classList.remove('hidden');
        } else {
            currentUser = null;
            updateAuthUI(false);
            activeGamesContainer.classList.add('hidden');
        }
        handleRouting();
    });

    listenForLeaderboardUpdates();
    listenForRecentGames();
}

document.addEventListener('DOMContentLoaded', init);

