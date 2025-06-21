const totalPairs = 10;
const board = document.getElementById("memory-board");
const statusText = document.getElementById("status");

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let currentPlayer = 1;
let lockBoard = false;

// Spieler-Scores initialisieren (falls nötig)
playerScores[currentPlayer] = 0;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function createBoard() {
  const cardValues = [];
  for (let i = 1; i <= totalPairs; i++) {
    cardValues.push(i);
    cardValues.push(i);
  }

  shuffle(cardValues);

  cardValues.forEach(value => {
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

function handleCardClick(card) {
  if (lockBoard || card.classList.contains("flipped")) return;

  card.classList.add("flipped");
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    lockBoard = true;
    setTimeout(checkForMatch, 800);
  }
}

function checkForMatch() {
  const [card1, card2] = flippedCards;
  const isMatch = card1.dataset.value === card2.dataset.value;

  if (isMatch) {
    matchedPairs++;

    // Punktestand aktualisieren
    playerScores[currentPlayer] = (playerScores[currentPlayer] || 0) + 1;
    sendScoreUpdate();

    flippedCards = [];
    lockBoard = false;

    if (matchedPairs === totalPairs) {
      statusText.textContent = "🎉 Spiel beendet!";
    }
  } else {
    setTimeout(() => {
      card1.classList.remove("flipped");
      card2.classList.remove("flipped");
      flippedCards = [];
      lockBoard = false;

      // Spieler wechseln
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateStatus();
    }, 600);
  }
}

function updateStatus() {
  const score1 = playerScores[1] || 0;
  const score2 = playerScores[2] || 0;
  statusText.textContent = `Spieler ${currentPlayer} ist am Zug | P1: ${score1} Paare | P2: ${score2} Paare`;
}

// Dummy für zukünftige Server-Kommunikation
function sendScoreUpdate() {
  if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
    sendRequest('*game-update*', playerScores);
  }
}

// Start
createBoard();
updateStatus();
