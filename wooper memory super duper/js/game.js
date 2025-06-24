// Game constants and variables
const totalPairs = 10;
const board = document.getElementById("memory-board");
const statusText = document.getElementById("status");
const playerCountDisplay = document.getElementById("player-count");
const playerScoresList = document.getElementById("player-scores");

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let currentPlayer = null;
let lockBoard = false;
let gameStarted = false;

// Initialize the game
function initGame() {
  createBoard();
  updateStatus();
}

// Create the game board with consistent shuffle for all players
function createBoard() {
  board.innerHTML = '';
  const cardValues = [];
  
  for (let i = 1; i <= totalPairs; i++) {
    cardValues.push(i);
    cardValues.push(i);
  }

  // Consistent shuffle using a fixed seed
  seededShuffle(cardValues, 42); // Fixed seed for consistent shuffle

  cardValues.forEach((value, index) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.value = value;

    const inner = document.createElement("div");
    inner.classList.add("card-inner");

    const front = document.createElement("div");
    front.classList.add("card-front");
    const img = document.createElement("img");
    img.src = `images/bild${value}.jpg`;
    front.appendChild(img);

    const back = document.createElement("div");
    back.classList.add("card-back");

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    board.appendChild(card);

    card.addEventListener("click", () => handleCardClick(card));
  });
}

// Seeded shuffle function for consistent card order
function seededShuffle(array, seed) {
  let m = array.length;
  let t, i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(random(seed) * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    
    seed++; // Change seed for next iteration
  }
  return array;
}

// Seeded random number generator
function random(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Handle card click
function handleCardClick(card) {
  if (!gameStarted) {
    startGame();
    return;
  }

  if (lockBoard || card.classList.contains("flipped") || currentPlayer !== clientId) return;

  card.classList.add("flipped");
  flippedCards.push(card);

  // Send card flip to other players
  sendRequest('*broadcast-message*', ['card-flipped', clientId, card.dataset.value, Array.from(board.children).indexOf(card)]);

  if (flippedCards.length === 2) {
    lockBoard = true;
    setTimeout(checkForMatch, 800);
  }
}

// Check for matching cards
function checkForMatch() {
  const [card1, card2] = flippedCards;
  const isMatch = card1.dataset.value === card2.dataset.value;

  if (isMatch) {
    matchedPairs++;
    
    // Update score
    playerScores[currentPlayer] = (playerScores[currentPlayer] || 0) + 1;
    sendRequest('*broadcast-message*', ['score-update', playerScores]);
    
    flippedCards = [];
    lockBoard = false;

    if (matchedPairs === totalPairs) {
      statusText.textContent = "🎉 Spiel beendet!";
      sendRequest('*broadcast-message*', ['game-ended', playerScores]);
    }
  } else {
    setTimeout(() => {
      card1.classList.remove("flipped");
      card2.classList.remove("flipped");
      flippedCards = [];
      lockBoard = false;

      // Switch player in round-robin fashion
      const players = getActivePlayers();
      if (players.length > 0) {
        const currentIndex = players.indexOf(currentPlayer);
        currentPlayer = players[(currentIndex + 1) % players.length];
        
        sendRequest('*broadcast-message*', [currentPlayer]);
        updateStatus();
      }
    }, 600);
  }
}

// Update game status display
function updateStatus() {
  let statusMessage = '';
  
  if (!gameStarted) {
    statusMessage = "Warte auf Spieler...";
  } else if (currentPlayer === clientId) {
    statusMessage = "Du bist am Zug!";
  } else {
    statusMessage = `Spieler ${currentPlayer} ist am Zug`;
  }

  // Update scores display
  playerScoresList.innerHTML = '';
  for (const [playerId, score] of Object.entries(playerScores)) {
    const li = document.createElement('li');
    li.textContent = `Spieler ${playerId}: ${score} Paare`;
    if (playerId === clientId) li.style.fontWeight = 'bold';
    playerScoresList.appendChild(li);
  }

  statusText.textContent = statusMessage;
}

// Start the game when enough players are present
function startGame() {
  if (clientCount >= 1 && !gameStarted) {
    gameStarted = true;
    
    // Initialize player scores for first 4 players (0-3)
    playerScores = {};
    const players = [];
    for (let i = 0; i < Math.min(clientCount, 4); i++) {
      playerScores[i] = 0;
      players.push(i);
    }
    
    currentPlayer = players[0]; // Start with player 0
    matchedPairs = 0;
    createBoard();
    
    sendRequest('*broadcast-message*', ['game-started', playerScores, currentPlayer]);
    updateStatus();
  }
}

// Helper function to get active players in order
function getActivePlayers() {
  return Object.keys(playerScores)
    .map(Number)
    .sort((a, b) => a - b)
    .filter(id => id >= 0 && id <= 3);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);