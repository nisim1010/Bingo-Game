import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, onSnapshot, updateDoc, runTransaction, query, orderBy, limit, arrayUnion, arrayRemove, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase.js';
import { ui, showMessage, showView, renderBingoCard, renderPlayerProgress, renderRarePhrases, renderActiveGamesList } from './ui.js';
import { state } from './script.js';

export function getPhrasesFromInput() {
    return ui.phrasesInput.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

export function getRarePhrasesFromInput() {
    return ui.rarePhrasesInput.value.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

export function updatePhraseCount() {
    const commonPhrases = getPhrasesFromInput();
    const rarePhrases = getRarePhrasesFromInput();
    ui.phraseCount.textContent = `${commonPhrases.length} phrases`;
    ui.rarePhraseCount.textContent = `${rarePhrases.length} phrases`;

    const isCommonValid = commonPhrases.length >= 25;
    const isRareValid = rarePhrases.length >= 5;
    
    ui.createGameBtn.disabled = !(isCommonValid && isRareValid);

    if (!isCommonValid && !isRareValid) {
        ui.errorMessage.textContent = 'Need at least 25 common phrases and at least 5 rare phrases.';
    } else if (!isCommonValid) {
        ui.errorMessage.textContent = 'You need at least 25 common phrases.';
    } else if (!isRareValid) {
        ui.errorMessage.textContent = 'You need at least 5 rare phrases.';
    } else {
        ui.errorMessage.textContent = '';
    }
}

export async function createNewGame() {
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
            creatorId: state.currentUser ? state.currentUser.uid : 'guest',
            createdAt: serverTimestamp(),
            allPhrases: commonPhrases,
            rarePhrases: rarePhrases,
            winner: null
        });

        state.gameId = gameDocRef.id;
        const newUrl = `${window.location.origin}${window.location.pathname}?game=${state.gameId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        
        ui.gameLinkInput.value = newUrl;
        showView('link');

    } catch (error) {
        console.error("Error creating game:", error);
        showMessage("Error", "There was an error creating your game.");
        showView('create');
    }
}

export function copyGameLink() {
    ui.gameLinkInput.select();
    document.execCommand('copy');
    ui.copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => { ui.copyLinkBtn.textContent = 'Copy'; }, 2000);
}

export function copyGameId() {
    navigator.clipboard.writeText(state.gameId).then(() => {
        ui.copyGameIdBtn.textContent = 'Copied!';
        setTimeout(() => { ui.copyGameIdBtn.textContent = 'Copy'; }, 2000);
    });
}

export async function joinGame(pName, pId) {
    state.playerId = pId;
    showView('loading');
    
    try {
        const gameRef = doc(db, "bingoGames", state.gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
            showView('create'); 
            showMessage("Game Not Found", "The game link is broken or doesn't exist.");
            return;
        }

        const gameData = gameDoc.data();
        listenForGameUpdates(state.gameId);
        listenForPlayerUpdates(state.gameId);
        
        ui.playerNameDisplay.textContent = pName;
        ui.gameIdDisplay.textContent = state.gameId;

        const playerRef = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
        const playerDoc = await getDoc(playerRef);

        if (playerDoc.exists()) {
            await updateDoc(playerRef, { playerName: pName });
            renderBingoCard(JSON.parse(playerDoc.data().card), playerDoc.data().markedCells, toggleCell);
        } else {
            const newCard = generateBingoCard(gameData.allPhrases);
            const initialMarkedCells = Array(5).fill("FFFFF");
            
            await setDoc(playerRef, {
                playerName: pName,
                card: JSON.stringify(newCard),
                markedCells: initialMarkedCells,
                score: 0
            });

            renderBingoCard(newCard, initialMarkedCells, toggleCell);
        }

        if (state.currentUser) {
            const userDocRef = doc(db, "users", state.currentUser.uid);
            await updateDoc(userDocRef, { activeGames: arrayUnion(state.gameId) });
        }
        
        showView('board');
    } catch (error) {
        console.error("Error joining game:", error);
        showView('create');
    }
}

export function generateBingoCard(phrases) {
    const shuffled = [...phrases].sort(() => 0.5 - Math.random());
    const cardPhrases = shuffled.slice(0, 25);
    const card = [];
    for (let i = 0; i < 5; i++) {
        card.push(cardPhrases.slice(i * 5, i * 5 + 5));
    }
    return card;
}

export function calculateScore(markedCells) {
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

export async function toggleCell(row, col) {
    try {
        const playerRef = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
        
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

export async function checkBingo() {
    const playerRef = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
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
        const playerRefForBonus = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
        await runTransaction(db, async (transaction) => {
            const freshPlayerDoc = await transaction.get(playerRefForBonus);
            const currentScore = freshPlayerDoc.data().score || 0;
            transaction.update(playerRefForBonus, { score: currentScore + 1000 });
        });
        
        const allPlayersSnapshot = await getDocs(collection(db, `bingoGames/${state.gameId}/players`));
        let highestScore = -1;
        let winner = { name: "No one", id: null };

        allPlayersSnapshot.forEach(doc => {
            const pData = doc.data();
            if ((pData.score || 0) > highestScore) {
                highestScore = pData.score;
                winner.name = pData.playerName;
                winner.id = doc.id;
            }
        });

        const gameRef = doc(db, "bingoGames", state.gameId);
        await updateDoc(gameRef, { winner: winner.name });
        await updateLeaderboard(winner.name, winner.id);
        await cleanupEndedGame(state.gameId);
    } else {
        showMessage("Not a Bingo!", "You don't have a valid 5-in-a-row.");
    }
}

export async function cleanupEndedGame(endedGameId) {
    const playersSnapshot = await getDocs(collection(db, `bingoGames/${endedGameId}/players`));
    
    playersSnapshot.forEach(async (playerDoc) => {
        const pId = playerDoc.id;
        const userDocRef = doc(db, "users", pId);
        try {
            await updateDoc(userDocRef, {
                activeGames: arrayRemove(endedGameId)
            });
        } catch (error) {
            // This can fail if the player was a guest, which is expected.
        }
    });
}

export async function updateLeaderboard(winnerName, winnerId) {
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

export function listenForLeaderboardUpdates() {
    const q = query(collection(db, "leaderboard"), orderBy("wins", "desc"));
    state.unsubscribe.leaderboard = onSnapshot(q, (querySnapshot) => {
        const players = [];
        querySnapshot.forEach((doc) => players.push({ id: doc.id, ...doc.data() }));
        
        ui.leaderboard.innerHTML = ''; 
        if (players.length === 0) {
            ui.leaderboard.innerHTML = '<p class="text-gray-500 text-center py-4">No winners yet!</p>';
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
            ui.leaderboard.appendChild(entry);
        });
    });
}

export function listenForRecentGames() {
    const q = query(collection(db, "bingoGames"), orderBy("createdAt", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
        ui.recentGames.innerHTML = '';
        if (snapshot.empty) {
            ui.recentGames.innerHTML = '<p class="text-gray-500 text-center py-4">No recent games found.</p>';
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
                ui.phrasesInput.value = gameData.allPhrases.join('\n');
                if(gameData.rarePhrases) {
                    ui.rarePhrasesInput.value = gameData.rarePhrases.map(p => p.text).join('\n');
                }
                updatePhraseCount();
                window.scrollTo(0, 0); 
            };
            entry.appendChild(dateEl);
            entry.appendChild(useBtn);
            ui.recentGames.appendChild(entry);
        });
    }, (error) => {
        console.error("Error fetching recent games:", error);
        ui.recentGames.innerHTML = '<p class="text-red-500 text-center py-4">Could not load games.</p>';
    });
}

export function listenForGameUpdates(id) {
    state.unsubscribe.game = onSnapshot(doc(db, "bingoGames", id), (doc) => {
        if (!doc.exists()) return;
        const gameData = doc.data();
        if (gameData.winner && ui.winnerModal.classList.contains('hidden')) {
            ui.winnerName.textContent = gameData.winner;
            ui.winnerModal.classList.remove('hidden');
            confetti({ particleCount: 150, spread: 180, origin: { y: 0.6 } });
        }
        if (gameData.rarePhrases) {
            renderRarePhrases(gameData.rarePhrases, claimRarePhrase, unclaimRarePhrase);
        }
    });
}

export function listenForPlayerUpdates(id) {
    state.unsubscribe.players = onSnapshot(query(collection(db, `bingoGames/${id}/players`)), (snapshot) => {
        const players = [];
        snapshot.forEach((doc) => {
            players.push({ id: doc.id, ...doc.data() });
        });

        renderPlayerProgress(players);

        const currentPlayer = players.find(p => p.id === state.playerId);
        if (currentPlayer) {
            const cardData = JSON.parse(currentPlayer.card);
            const markedCellsData = currentPlayer.markedCells;
            renderBingoCard(cardData, markedCellsData, toggleCell);
        }
    });
}

export async function claimRarePhrase(index) {
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = doc(db, "bingoGames", state.gameId);
            const playerRef = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
            const gameDoc = await transaction.get(gameRef);
            const playerDoc = await transaction.get(playerRef);
            if (!gameDoc.exists() || !playerDoc.exists()) throw "Game or player not found.";
            const gameData = gameDoc.data();
            const playerData = playerDoc.data();
            if (gameData.rarePhrases[index].claimedBy === null) {
                const updatedRarePhrases = [...gameData.rarePhrases];
                updatedRarePhrases[index] = { ...updatedRarePhrases[index], claimedBy: state.playerId, claimedByName: playerData.playerName };
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

export async function unclaimRarePhrase(index) {
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = doc(db, "bingoGames", state.gameId);
            const playerRef = doc(db, `bingoGames/${state.gameId}/players`, state.playerId);
            const gameDoc = await transaction.get(gameRef);
            const playerDoc = await transaction.get(playerRef);
            if (!gameDoc.exists() || !playerDoc.exists()) throw "Game or player not found.";
            const gameData = gameDoc.data();
            const playerData = playerDoc.data();
            if (gameData.rarePhrases[index].claimedBy === state.playerId) {
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

export function listenForUserUpdates(uid) {
    const userDocRef = doc(db, "users", uid);
    state.unsubscribe.user = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            renderActiveGamesList(doc.data().activeGames || []);
        }
    });
}

