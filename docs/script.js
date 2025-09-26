// --- DEV FEATURE FLAG ---
// Set to true to enable developer features (e.g., press 'C' to complete a level)
const DEV_MODE = true;

// --- DOM Elements ---
const startScreen = document.querySelector('.start-screen');
const gameContainer = document.querySelector('.game-container');
const winScreen = document.querySelector('.win-screen');
const startCampaignButton = document.getElementById('start-campaign-button');
const startReflexButton = document.getElementById('start-reflex-button');
const nextActionButton = document.getElementById('next-action-button');
const cardGrid = document.querySelector('.card-grid');
const levelDisplay = document.getElementById('level-display');
const turnsContainer = document.getElementById('turns-container');
const turnsDisplay = document.getElementById('turns');
const timerContainer = document.getElementById('timer-container');
const timerDisplay = document.getElementById('timer');
const winTitle = document.getElementById('win-title');
const winStatsLabel = document.getElementById('win-stats-label');
const winStatsValue = document.getElementById('win-stats-value');
const winXpContainer = document.getElementById('win-xp-container');
const winXpDisplay = document.getElementById('win-xp');
const winStarsContainer = document.getElementById('win-stars-container');

// --- Sound Elements ---
const sounds = { correct: document.getElementById('correct-sound'), incorrect: document.getElementById('incorrect-sound'), flip: document.getElementById('flip-sound'), reflex: document.getElementById('reflex-sound') };

// --- Game Content ---
const gameContent = { science: { level1: { pairs: [ 
            { symbol: 'Fe', name: 'Iron' }, 
            { symbol: 'C', name: 'Carbon' }, 
            { symbol: 'Cu', name: 'Copper' }, 
            { symbol: 'O', name: 'Oxygen' }, 
            { symbol: 'H', name: 'Hydrogen' }, 
            { symbol: 'N', name: 'Nitrogen' }, 
            { symbol: 'Au', name: 'Gold' }, 
            { symbol: 'Ag', name: 'Silver' }
        ] 
    }, 
    
    level2: { pairs: [ 
            { symbol: 'He', name: 'Helium' }, 
            { symbol: 'Li', name: 'Lithium' }, 
            { symbol: 'B', name: 'Boron' }, 
            { symbol: 'S', name: 'Sulphur' }, 
            { symbol: 'Ne', name: 'Neon' }, 
            { symbol: 'Na', name: 'Sodium' }, 
            { symbol: 'Si', name: 'Silicon' }, 
            { symbol: 'P', name: 'Phosphorus' }
        ], 
    timer: 60 }, 
        
        level3: { pairs: [ 
            { symbol: 'Ca', name: 'Calcium' }, 
            { symbol: 'Co', name: 'Cobalt' }, 
            { symbol: 'Mn', name: 'Manganese' }, 
            { symbol: 'Mg', name: 'Magnesium' }, 
            { symbol: 'K', name: 'Potassium' }, 
            { symbol: 'Pb', name: 'Lead' }, 
            { symbol: 'Sn', name: 'Tin' }, 
            { symbol: 'Zn', name: 'Zinc' }
        ], 
    timer: 45 } } };

// --- Game State ---
let gameState = {};

function resetGameState() {
    clearAllTimers();
    gameState = { gameMode: null, currentCampaignLevel: 1, flippedCards: [], lockBoard: false, turns: 0, timeRemaining: 0, timerId: null, matchedPairs: 0, totalPairs: 8, isReflexActive: false, reflexCard: null, reflexTimeoutId: null };
}

// --- Scoring and Feedback ---
function calculateXP(level, turns) { switch (level) { case 1: if (turns === 8) return 40; if (turns <= 12) return 35; return 30; case 2: if (turns <= 10) return 60; if (turns <= 14) return 50; return 40; case 3: if (turns <= 12) return 100; if (turns <= 16) return 80; return 60; default: return 0; } }
function calculateCampaignStars(level, turns) { const xp = calculateXP(level, turns); if (level === 1) { if (xp === 40) return 3; if (xp === 35) return 2; return 1; } if (level === 2) { if (xp === 60) return 3; if (xp === 50) return 2; return 1; } if (level === 3) { if (xp === 100) return 3; if (xp === 80) return 2; return 1; } return 0; }
function calculateReflexStars(moves) { if (moves === 8) return 3; if (moves <= 12) return 2; return 1; }

// --- Core Game Logic ---
function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }

function createBoard(pairs) {
    cardGrid.innerHTML = '';
    const cardArray = [];
    pairs.forEach(pair => { cardArray.push({ value: pair.symbol, match: pair.name }); cardArray.push({ value: pair.name, match: pair.symbol }); });
    shuffle(cardArray).forEach(item => { const card = document.createElement('div'); card.classList.add('card'); card.dataset.value = item.value; card.dataset.match = item.match; card.innerHTML = `<div class="front-face">${item.value}</div><div class="back-face"></div>`; card.addEventListener('click', flipCard); cardGrid.appendChild(card); });
}

function flipCard() {
    if ((gameState.lockBoard && !gameState.isReflexActive) || this.classList.contains('flipped')) return;
    if (gameState.isReflexActive) { handleReflexResponse(this); } else { handleNormalFlip(this); }
}

function handleNormalFlip(card) {
    sounds.flip.play().catch(e => {});
    card.classList.add('flipped');
    gameState.flippedCards.push(card);
    if (gameState.flippedCards.length === 2) { gameState.lockBoard = true; updateTurns(); checkForMatch(); }
}

function checkForMatch() {
    const [first, second] = gameState.flippedCards;
    first.dataset.value === second.dataset.match ? handleCorrectMatch() : handleIncorrectMatch();
}

function handleCorrectMatch() {
    const [first, second] = gameState.flippedCards;
    first.removeEventListener('click', flipCard); second.removeEventListener('click', flipCard);
    first.classList.add('correct'); second.classList.add('correct');
    sounds.correct.play().catch(e => {});
    gameState.matchedPairs++;
    resetTurnState();
    if (gameState.matchedPairs === gameState.totalPairs) {
        if (gameState.gameMode === 'campaign') handleCampaignWin();
        if (gameState.gameMode === 'reflex') handleReflexModeEnd();
    } else if (gameState.gameMode === 'reflex') {
        setTimeout(triggerNextReflexChallenge, 500);
    }
}

function handleIncorrectMatch() {
    const [first, second] = gameState.flippedCards;
    sounds.incorrect.play().catch(e => {});
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => { first.classList.add('shake'); second.classList.add('shake'); }, 200);
    setTimeout(() => {
        first.classList.remove('flipped', 'shake'); second.classList.remove('flipped', 'shake');
        resetTurnState();
        if (gameState.gameMode === 'reflex') { setTimeout(triggerNextReflexChallenge, 500); }
    }, 1200);
}

function resetTurnState() {
    if (gameState.reflexCard) gameState.reflexCard.classList.remove('reflex-active');
    gameState.flippedCards = [];
    gameState.lockBoard = false;
    gameState.isReflexActive = false;
    gameState.reflexCard = null;
}

// --- Specific Game Mode Logic ---
function updateTurns() { gameState.turns++; turnsDisplay.textContent = gameState.turns; }

function triggerNextReflexChallenge() {
    if (gameState.matchedPairs === gameState.totalPairs || gameState.isReflexActive) return;
    const unmatchedCards = Array.from(document.querySelectorAll('.card:not(.correct)'));
    if (unmatchedCards.length < 2) return;
    gameState.isReflexActive = true;
    gameState.lockBoard = true;
    sounds.reflex.play().catch(e => {});
    gameState.reflexCard = unmatchedCards[Math.floor(Math.random() * unmatchedCards.length)];
    gameState.reflexCard.classList.add('flipped', 'reflex-active');
    gameState.reflexTimeoutId = setTimeout(handleReflexTimeout, 4000);
}

function handleReflexResponse(playerCard) {
    clearTimeout(gameState.reflexTimeoutId);
    if (playerCard === gameState.reflexCard) return;
    updateTurns(); // A player's response counts as a move
    playerCard.classList.add('flipped');
    gameState.flippedCards = [gameState.reflexCard, playerCard];
    checkForMatch();
}

function handleReflexTimeout() {
    if (!gameState.isReflexActive) return;
    updateTurns(); // Timing out also counts as a move
    sounds.incorrect.play().catch(e => {});
    gameState.reflexCard.classList.remove('flipped', 'reflex-active');
    resetTurnState();
    setTimeout(triggerNextReflexChallenge, 500);
}

// --- Game Flow & Screen Management ---
function peekAtStart(duration, callback) {
    gameState.lockBoard = true;
    const cards = document.querySelectorAll('.card');
    const flipOpenDelay = 100; 
    const flipAnimationTime = 600; 

    setTimeout(() => {
        cards.forEach(card => card.classList.add('flipped'));
    }, flipOpenDelay);

    setTimeout(() => {
        cards.forEach(card => card.classList.remove('flipped'));
    }, duration + flipOpenDelay);
    
    setTimeout(() => {
        gameState.lockBoard = false;
        if (callback) {
            callback();
        }
    }, duration + flipOpenDelay + flipAnimationTime);
}


function startGame(level) {
    resetGameState();
    gameState.gameMode = 'campaign';
    gameState.currentCampaignLevel = level;
    const levelData = gameContent.science[`level${level}`];
    startScreen.classList.add('hidden'); winScreen.classList.add('hidden'); gameContainer.classList.remove('hidden');
    levelDisplay.textContent = `LEVEL ${level}`; turnsDisplay.textContent = '0';
    timerContainer.classList.toggle('hidden', !levelData.timer); turnsContainer.querySelector('span').textContent = "TURNS: ";
    createBoard(levelData.pairs);
    
    peekAtStart(2000, () => {
        if (levelData.timer) startTimer(levelData.timer);
    });
}

function startReflexMode() {
    resetGameState();
    gameState.gameMode = 'reflex';
    const allPairs = [ ...gameContent.science.level1.pairs, ...gameContent.science.level2.pairs, ...gameContent.science.level3.pairs ];
    const reflexPairs = shuffle(allPairs).slice(0, 8);
    startScreen.classList.add('hidden'); winScreen.classList.add('hidden'); gameContainer.classList.remove('hidden');
    levelDisplay.textContent = 'REFLEX MODE'; turnsDisplay.textContent = '0';
    timerContainer.classList.add('hidden'); turnsContainer.querySelector('span').textContent = "MOVES: ";
    createBoard(reflexPairs);
    
    peekAtStart(2000, () => {
        setTimeout(triggerNextReflexChallenge, 1000);
    });
}


function handleCampaignWin() {
    clearAllTimers();
    const level = gameState.currentCampaignLevel;
    const xp = calculateXP(level, gameState.turns);
    const stars = calculateCampaignStars(level, gameState.turns);
    setTimeout(() => {
        gameContainer.classList.add('hidden'); winScreen.classList.remove('hidden');
        winStarsContainer.classList.remove('hidden'); winXpContainer.classList.remove('hidden');
        winTitle.textContent = level < 3 ? `LEVEL ${level} COMPLETE!` : "CAMPAIGN COMPLETE!";
        winStatsLabel.textContent = "TURNS"; winStatsValue.textContent = gameState.turns;
        winXpDisplay.textContent = xp;
        const starElements = winStarsContainer.querySelectorAll('.star');
        starElements.forEach((star, index) => star.classList.toggle('filled', index < stars));
        if (level < 3) { nextActionButton.textContent = 'Next Level'; nextActionButton.onclick = () => startGame(level + 1); } 
        else { nextActionButton.textContent = 'Main Menu'; nextActionButton.onclick = showStartScreen; }
    }, 800);
}

function handleReflexModeEnd() {
    clearAllTimers();
    const stars = calculateReflexStars(gameState.turns);
    setTimeout(() => {
        gameContainer.classList.add('hidden'); winScreen.classList.remove('hidden');
        winTitle.textContent = "REFLEX COMPLETE!";
        winStatsLabel.textContent = "TOTAL MOVES"; winStatsValue.textContent = gameState.turns;
        winXpContainer.classList.add('hidden'); winStarsContainer.classList.remove('hidden');
        const starElements = winStarsContainer.querySelectorAll('.star');
        starElements.forEach((star, index) => star.classList.toggle('filled', index < stars));
        nextActionButton.textContent = 'Main Menu'; nextActionButton.onclick = showStartScreen;
    }, 500);
}

function startTimer(duration) {
    timerContainer.classList.remove('hidden'); gameState.timeRemaining = duration; timerDisplay.textContent = duration;
    gameState.timerId = setInterval(() => {
        gameState.timeRemaining--; timerDisplay.textContent = gameState.timeRemaining;
        if (gameState.timeRemaining <= 0) {
            clearAllTimers(); alert("Time's Up! Try again."); showStartScreen();
        }
    }, 1000);
}

function showStartScreen() { winScreen.classList.add('hidden'); gameContainer.classList.add('hidden'); startScreen.classList.remove('hidden'); }
function clearAllTimers() { clearTimeout(gameState.reflexTimeoutId); clearInterval(gameState.timerId); }

// --- Initial Event Listeners ---
startCampaignButton.addEventListener('click', () => startGame(1));
startReflexButton.addEventListener('click', startReflexMode);


// --- [NEW] DEV FEATURE: AUTO-COMPLETE LEVEL ---
window.addEventListener('keydown', (e) => {
    // Check if DEV_MODE is on, the 'c' key was pressed, and the main game screen is active
    if (DEV_MODE && e.key.toLowerCase() === 'c' && !gameContainer.classList.contains('hidden')) {
        
        // Ensure it only works for the campaign mode
        if (gameState.gameMode === 'campaign') {
            console.log("DEV: Auto-completing campaign level...");
            handleCampaignWin();
        }
    }
});