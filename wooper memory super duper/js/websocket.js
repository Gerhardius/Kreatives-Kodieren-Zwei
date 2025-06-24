// WebSocket server address
const webRoomsWebSocketServerAddr = 'wss://nosch.uber.space/web-rooms/';

// DOM elements for display
const infoDisplay = document.getElementById('info-display');

// Global variables
let clientId = null;
let clientCount = 0;
let playerScores = {};

// Helper function to send requests over websocket
function sendRequest(...message) {
  if (socket.readyState === WebSocket.OPEN) {
    const str = JSON.stringify(message);
    socket.send(str);
  }
}

// Highlight text
function highlightText(elem) {
  elem.classList.add('highlight-text');
  setTimeout(() => {
    elem.classList.remove('highlight-text');
  }, 120);
}

/****************************************************************
 * WebSocket communication
 */
const socket = new WebSocket(webRoomsWebSocketServerAddr);

// WebSocket event listeners
socket.addEventListener('open', (event) => {
  sendRequest('*enter-room*', 'memory-game');
  sendRequest('*subscribe-client-count*');
  sendRequest('*subscribe-client-enter-exit*');

  // Ping the server regularly to prevent connection timeout
  setInterval(() => socket.send(''), 30000);
});

socket.addEventListener("close", (event) => {
  clientId = null;
  document.body.classList.add('disconnected');
});

// Handle incoming messages
socket.addEventListener('message', (event) => {
  const data = event.data;

  if (data.length > 0) {
    const incoming = JSON.parse(data);
    const selector = incoming[0];

    switch (selector) {
      case '*client-id*':
        clientId = incoming[1];
        infoDisplay.innerHTML = `Spieler #${clientId}`;
        break;

      case '*client-count*':
        clientCount = incoming[1];
        document.getElementById('player-count').textContent = clientCount;
        
        // Start game automatically when players join
        if (clientCount >= 1 && !gameStarted) {
          startGame();
        }
        break;

      case '*client-enter*':
        const enterId = incoming[1];
        console.log(`Spieler #${enterId} hat den Raum betreten`);
        break;

      case '*client-exit*':
        const exitId = incoming[1];
        console.log(`Spieler #${exitId} hat den Raum verlassen`);
        
        // Remove player from scores if they leave
        if (playerScores[exitId] !== undefined) {
          delete playerScores[exitId];
          updateStatus();
        }
        break;

      case 'game-started':
        case 'score-update':
          playerScores = incoming[1];
          updateStatus();
          break;

      case 'player-turn':
          currentPlayer = incoming[0];
          updateStatus();
          break;

      case 'game-ended':
          playerScores = incoming[1];
          statusText.textContent = "🎉 Spiel beendet!";
          updateStatus();
          break;

      case 'card-flipped':
          const playerId = incoming[1];
          const cardValue = incoming[2];
          const cardIndex = incoming[3];
          
          if (playerId !== clientId) {
            const card = board.children[cardIndex];
            if (card && !card.classList.contains('flipped')) {
              card.classList.add('flipped');
              flippedCards.push(card);
              
              if (flippedCards.length === 2) {
                setTimeout(checkForMatch, 800);
              }
            }
          }
          break;

      case '*error*':
          const message = incoming[1];
          console.warn('Serverfehler:', ...message);
          break;

      default:
          console.log(`Unbekannte Nachricht: [${incoming}]`);
          break;
    }
  }
});