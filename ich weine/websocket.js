// WebSocket-Server-Adresse
const webRoomsWebSocketServerAddr = 'wss://nosch.uber.space/web-rooms/';

// DOM-Elemente für Anzeige (optional)
const titleDisplay = document.getElementById('title-display');
const infoDisplay = document.getElementById('info-display');

// Globale Variablen
let clientId = null;
let clientCount = 0;
var playerScores = {};  // global für memory.js verfügbar

// Verbindung zum WebSocket-Server herstellen
const socket = new WebSocket(webRoomsWebSocketServerAddr);

// Nachrichten über den Socket senden
function sendRequest(...message) {
  const str = JSON.stringify(message);
  socket.send(str);
}

// Verbindung geöffnet
socket.addEventListener('open', () => {
  sendRequest('*enter-room*', 'hello-world');
  sendRequest('*subscribe-client-count*');
  sendRequest('*subscribe-client-enter-exit*');

  // Verbindung offen halten
  setInterval(() => socket.send(''), 30000);
});

// Verbindung geschlossen
socket.addEventListener("close", () => {
  clientId = null;
  document.body.classList.add('disconnected');
});

// Eingehende Nachrichten verarbeiten
socket.addEventListener('message', (event) => {
  const data = event.data;
  if (data.length === 0) return;

  const incoming = JSON.parse(data);
  const selector = incoming[0];

  switch (selector) {
    case '*client-id*':
      clientId = incoming[1];
      if (infoDisplay) infoDisplay.innerHTML = `#${clientId}/${clientCount}`;
      break;

    case '*client-count*':
      clientCount = incoming[1];
      if (infoDisplay) infoDisplay.innerHTML = `#${clientId}/${clientCount}`;
      break;

    case '*client-enter*': {
      const enterId = incoming[1];
      console.log(`Client #${enterId} hat den Raum betreten`);
      break;
    }

    case '*client-exit*': {
      const exitId = incoming[1];
      console.log(`Client #${exitId} hat den Raum verlassen`);
      break;
    }

    case '*game-update*': {
      const updatedScores = incoming[1];
      console.log("Spielstand empfangen:", updatedScores);

      // Spielstände lokal aktualisieren
      playerScores = updatedScores;

      // Anzeige aktualisieren, falls Funktion vorhanden
      if (typeof updateStatus === 'function') {
        updateStatus();
      }
      break;
    }

    case '*error*': {
      const message = incoming[1];
      console.warn('Serverfehler:', ...message);
      break;
    }

    default:
      console.log(`Unbekannte Nachricht: [${incoming}]`);
      break;
  }
});