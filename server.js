const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const clients = new Map();
const EMOTICONS = new Set([':)', 'XD', 'o_o', '(͡° ͜ʖ ͡°)', '(๑ˇεˇ๑)', 'ʕ •ᴥ•ʔ', ":'(", 'D:']);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, clients: clients.size }));

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(room, message, except) {
  for (const [socket, client] of clients) {
    if (client.room === room && socket !== except) send(socket, message);
  }
}

function roomCount(room) {
  let count = 0;
  for (const client of clients.values()) if (client.room === room) count += 1;
  return count;
}

wss.on('connection', (socket) => {
  const client = { id: crypto.randomUUID(), name: 'Guest', room: 'lobby' };
  clients.set(socket, client);

  send(socket, { type: 'connected', id: client.id, room: client.room, count: roomCount(client.room) });

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return send(socket, { type: 'error', message: 'Please send valid JSON.' });
    }

    if (message.type === 'join') {
      const nextRoom = String(message.room || 'lobby').trim().slice(0, 32) || 'lobby';
      const nextName = String(message.name || 'Guest').trim().slice(0, 24) || 'Guest';
      const previousRoom = client.room;
      client.room = nextRoom;
      client.name = nextName;
      send(socket, { type: 'joined', room: nextRoom, count: roomCount(nextRoom), name: client.name });
      if (previousRoom !== nextRoom) {
        broadcast(previousRoom, { type: 'presence', count: roomCount(previousRoom) });
      }
      broadcast(nextRoom, { type: 'presence', count: roomCount(nextRoom) });
      return;
    }

    if (message.type === 'message') {
      const text = String(message.text || '').trim().slice(0, 2000);
      if (!EMOTICONS.has(text)) return;
      broadcast(client.room, {
        type: 'message',
        id: crypto.randomUUID(),
        sender: client.name,
        text,
        sentAt: new Date().toISOString()
      });
      return;
    }

  });

  socket.on('close', () => {
    const room = client.room;
    clients.delete(socket);
    broadcast(room, { type: 'presence', count: roomCount(room) });
  });
});

server.listen(PORT, () => console.log(`Live room running on port ${PORT}`));
