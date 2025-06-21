const titleDisplay = document.getElementById('title-display');
const infoDisplay = document.getElementById('info-display');
const gameBoard = document.getElementById('game-board');
const statusDisplay = document.getElementById('status-display');

// Address of the WebSocket server
const webRoomsWebSocketServerAddr = 'wss://nosch.uber.space/web-rooms/';

// Game variables
let clientId = null;
let clientCount = 0;
let gameState = {
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  currentPlayer: null,
  players: {},
  playerOrder: []
};

// Image pairs (10 pairs)
const cardImages = [
  'bild1.jpg', 'bild2.jpg', 'bild3.jpg', 'bild4.jpg', 'bild5.jpg',
  'bild6.jpg', 'bild7.jpg', 'bild8.jpg', 'bild9.jpg', 'bild10.jpg'
];

function start() {
  console.log("Memory game starting!");
  
  // Initialize game when there are at least 2 players
  if (clientCount >= 2 && !gameState.cards.length) {
    initializeGame();
  }
  
  updateStatus();
};

function initializeGame() {
  // Create pairs of cards
  const cards = [];
  cardImages.forEach((img, index) => {
    cards.push({ id: index * 2, image: img, matched: false });
    cards.push({ id: index * 2 + 1, image: img, matched: false });
  });
  
  // Shuffle cards
  gameState.cards = shuffleArray(cards);
  gameState.matchedPairs = 0;
  gameState.flippedCards = [];
  
  // Determine player order
  gameState.playerOrder = Object.keys(gameState.players);
  gameState.currentPlayer = gameState.playerOrder[0];
  
  // Render the game board
  renderGameBoard();
  
  // Broadcast the new game state to all players
  sendRequest('*broadcast-message*', ['game-state-update', gameState]);
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function renderGameBoard() {
  gameBoard.innerHTML = '';
  gameBoard.style.gridTemplateColumns = `repeat(5, 1fr)`;
  
  gameState.cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'memory-card';
    cardElement.dataset.index = index;
    
    if (card.matched) {
      cardElement.classList.add('matched');
    }
    
    if (gameState.flippedCards.includes(index)) {
      cardElement.style.backgroundImage = `url(${card.image})`;
      cardElement.classList.add('flipped');
    } else {
      cardElement.textContent = '?';
    }
    
    cardElement.addEventListener('click', () => handleCardClick(index));
    gameBoard.appendChild(cardElement);
  });
}

function handleCardClick(index) {
  // Only allow the current player to flip cards
  if (gameState.currentPlayer !== clientId) {
    statusDisplay.textContent = `It's ${gameState.players[gameState.currentPlayer]}'s turn!`;
    return;
  }
  
  const card = gameState.cards[index];
  
  // Don't allow flipping if:
  // - Card is already matched
  // - Card is already flipped
  // - Already two cards are flipped
  if (card.matched || 
      gameState.flippedCards.includes(index) || 
      gameState.flippedCards.length >= 2) {
    return;
  }
  
  // Flip the card
  gameState.flippedCards.push(index);
  sendRequest('*broadcast-message*', ['card-flip', clientId, index]);
  
  // Check for match if two cards are flipped
  if (gameState.flippedCards.length === 2) {
    setTimeout(() => checkForMatch(), 1000);
  }
  
  renderGameBoard();
}

function checkForMatch() {
  const [firstIndex, secondIndex] = gameState.flippedCards;
  const firstCard = gameState.cards[firstIndex];
  const secondCard = gameState.cards[secondIndex];
  
  if (firstCard.image === secondCard.image) {
    // Match found
    firstCard.matched = true;
    secondCard.matched = true;
    gameState.matchedPairs++;
    
    // Update score for current player
    if (!gameState.players[gameState.currentPlayer].score) {
      gameState.players[gameState.currentPlayer].score = 0;
    }
    gameState.players[gameState.currentPlayer].score++;
    
    sendRequest('*broadcast-message*', ['card-match', firstIndex, secondIndex]);
    
    // Check if game is over
    if (gameState.matchedPairs === cardImages.length) {
      endGame();
      return;
    }
  }
  
  // Switch to next player
  const currentPlayerIndex = gameState.playerOrder.indexOf(gameState.currentPlayer);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.playerOrder.length;
  gameState.currentPlayer = gameState.playerOrder[nextPlayerIndex];
  
  // Reset flipped cards
  gameState.flippedCards = [];
  
  // Broadcast updated game state
  sendRequest('*broadcast-message*', ['game-state-update', gameState]);
  renderGameBoard();
  updateStatus();
}

function endGame() {
  // Determine winner
  let winner = null;
  let highScore = 0;
  
  for (const playerId in gameState.players) {
    if (gameState.players[playerId].score > highScore) {
      highScore = gameState.players[playerId].score;
      winner = playerId;
    }
  }
  
  statusDisplay.textContent = `Game over! ${gameState.players[winner].name} wins with ${highScore} pairs!`;
  sendRequest('*broadcast-message*', ['game-over', winner]);
}

function updateStatus() {
  if (!gameState.currentPlayer) return;
  
  const currentPlayerName = gameState.players[gameState.currentPlayer]?.name || `Player ${gameState.currentPlayer}`;
  statusDisplay.textContent = `Current turn: ${currentPlayerName}`;
  
  // Display scores
  let scores = '';
  for (const playerId in gameState.players) {
    const score = gameState.players[playerId].score || 0;
    scores += `${gameState.players[playerId].name}: ${score} pairs | `;
  }
  
  infoDisplay.textContent = scores.slice(0, -3);
}

/****************************************************************
 * websocket communication
 */
const socket = new WebSocket(webRoomsWebSocketServerAddr);

// Helper function to send requests over websocket to web-room server
function sendRequest(...message) {
  const str = JSON.stringify(message);
  socket.send(str);
}

// Listen to opening websocket connections
socket.addEventListener('open', (event) => {
  sendRequest('*enter-room*', 'multiplayer-memory');
  sendRequest('*subscribe-client-count*');
  sendRequest('*subscribe-client-enter-exit*');

  // Ping the server regularly with an empty message to prevent the socket from closing
  setInterval(() => socket.send(''), 30000);
});

socket.addEventListener("close", (event) => {
  clientId = null;
  document.body.classList.add('disconnected');
});

// Listen to messages from server
socket.addEventListener('message', (event) => {
  const data = event.data;

  if (data.length > 0) {
    const incoming = JSON.parse(data);
    const selector = incoming[0];

    // Dispatch incoming messages
    switch (selector) {
      // Responds to '*enter-room*'
      case '*client-id*':
        clientId = incoming[1];
        infoDisplay.innerHTML = `Player #${clientId}`;
        
        // Add player to game state
        gameState.players[clientId] = {
          name: `Player ${clientId}`,
          score: 0
        };
        
        start();
        break;

      // Responds to '*subscribe-client-count*'
      case '*client-count*':
        clientCount = incoming[1];
        infoDisplay.innerHTML = `Players: ${clientCount}`;
        
        // Start game if enough players
        if (clientCount >= 2 && !gameState.cards.length) {
          initializeGame();
        }
        break;

      case '*client-enter*':
        const enterId = incoming[1];
        console.log(`client #${enterId} has entered the room`);
        
        // Add new player to game state
        if (!gameState.players[enterId]) {
          gameState.players[enterId] = {
            name: `Player ${enterId}`,
            score: 0
          };
          
          // If game hasn't started yet, add to player order
          if (!gameState.playerOrder.includes(enterId)) {
            gameState.playerOrder.push(enterId);
          }
        }
        
        // Send current game state to new player
        if (gameState.cards.length) {
          sendRequest('*send-message*', [enterId, ['game-state-update', gameState]]);
        }
        break;

      case '*client-exit*':
        const exitId = incoming[1];
        console.log(`client #${exitId} has left the room`);
        
        // Remove player from game state
        delete gameState.players[exitId];
        
        // Remove from player order
        gameState.playerOrder = gameState.playerOrder.filter(id => id !== exitId);
        
        // If current player left, switch to next player
        if (gameState.currentPlayer === exitId) {
          const currentIndex = gameState.playerOrder.indexOf(exitId);
          const nextIndex = currentIndex < gameState.playerOrder.length - 1 ? currentIndex : 0;
          gameState.currentPlayer = gameState.playerOrder[nextIndex];
          
          // Broadcast updated game state
          sendRequest('*broadcast-message*', ['game-state-update', gameState]);
        }
        
        // If only one player left, end game
        if (Object.keys(gameState.players).length < 2) {
          statusDisplay.textContent = 'Waiting for more players...';
          gameState.cards = [];
          gameState.matchedPairs = 0;
          gameState.flippedCards = [];
          gameBoard.innerHTML = '';
        }
        break;

      // Game-related messages
      case 'game-state-update':
        gameState = incoming[1];
        renderGameBoard();
        updateStatus();
        break;

      case 'card-flip':
        const [flippingPlayerId, cardIndex] = incoming.slice(1);
        if (!gameState.flippedCards.includes(cardIndex)) {
          gameState.flippedCards.push(cardIndex);
        }
        renderGameBoard();
        break;

      case 'card-match':
        const [firstIdx, secondIdx] = incoming.slice(1);
        gameState.cards[firstIdx].matched = true;
        gameState.cards[secondIdx].matched = true;
        gameState.flippedCards = [];
        renderGameBoard();
        break;

      case 'game-over':
        const winnerId = incoming[1];
        const winnerName = gameState.players[winnerId].name;
        statusDisplay.textContent = `Game over! ${winnerName} wins!`;
        break;

      case '*error*': {
        const message = incoming[1];
        console.warn('server error:', ...message);
        break;
      }

      default:
        console.log(`unknown incoming message: [${incoming}]`);
        break;
    }
  }
});