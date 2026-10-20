const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { WebSocket, WebSocketServer } = require('ws');

const root = __dirname;
const port = Number(process.env.PORT || 5500);
const players = new Map();
const lobbies = new Map();
const FORT_SPAWNS = [
  [0, 0, 0], [0, 3.2, Math.PI], [3.2, 0, -Math.PI / 2], [-3.2, 0, Math.PI / 2],
  [0, -3.2, 0], [2.25, 2.25, -3 * Math.PI / 4], [-2.25, 2.25, 3 * Math.PI / 4], [2.25, -2.25, -Math.PI / 4]
];
const INVULNERABILITY_MS = 2000;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp'
};

function publicPlayer(player, now) {
  return {
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw,
    health: player.health,
    maxHealth: player.maxHealth,
    attacking: player.attackingUntil > now,
    invulnerabilityRemaining: Math.max(0, player.invulnerableUntil - now)
  };
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function cleanName(value, fallback, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength) || fallback;
}

function publicLobby(lobby) {
  return {
    id: lobby.id,
    name: lobby.name,
    hostName: players.get(lobby.hostId)?.name || 'Jugador',
    players: lobby.playerIds.size,
    maxPlayers: lobby.maxPlayers
  };
}

function broadcastLobbyList(target = null) {
  const message = { type: 'lobbies', lobbies: [...lobbies.values()].map(publicLobby) };
  if (target) send(target, message);
  else for (const socket of sockets.clients) send(socket, message);
}

function broadcastSnapshot(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;
  const now = Date.now();
  const message = { type: 'snapshot', players: [...lobby.playerIds].map(id => players.get(id)).filter(Boolean).map(player => publicPlayer(player, now)) };
  for (const socket of sockets.clients) {
    if (players.get(socket.playerId)?.lobbyId === lobbyId) send(socket, message);
  }
}

function broadcastCombatHit(lobbyId, attackerId, targetId, move) {
  const message = { type: 'combatHit', attackerId, targetId, move };
  for (const socket of sockets.clients) {
    if (players.get(socket.playerId)?.lobbyId === lobbyId) send(socket, message);
  }
}

function spawnPosition(index) {
  const [x, z, yaw] = FORT_SPAWNS[index % FORT_SPAWNS.length];
  return { x, y: 0, z, yaw };
}

function createLobbyPlayer(socket, lobby, name) {
  const spawn = spawnPosition(lobby.playerIds.size);
  const now = Date.now();
  const player = {
    id: randomUUID(),
    name: cleanName(name, 'Jugador', 24),
    lobbyId: lobby.id,
    ...spawn,
    yaw: spawn.yaw,
    health: 100,
    maxHealth: 100,
    invulnerableUntil: now + INVULNERABILITY_MS,
    lastStateAt: now,
    lastAttackAt: 0,
    lastWorldDamageAt: 0,
    attackingUntil: 0,
    respawnAt: 0
  };
  players.set(player.id, player);
  lobby.playerIds.add(player.id);
  if (!lobby.hostId) lobby.hostId = player.id;
  socket.playerId = player.id;
  send(socket, {
    type: 'joined',
    lobby: publicLobby(lobby),
    player: publicPlayer(player, now),
    players: [...lobby.playerIds].map(id => players.get(id)).filter(Boolean).map(entry => publicPlayer(entry, now))
  });
}

function removePlayer(socket) {
  const player = players.get(socket.playerId);
  if (!player) return;
  const lobby = lobbies.get(player.lobbyId);
  players.delete(player.id);
  socket.playerId = null;
  if (!lobby) return;
  lobby.playerIds.delete(player.id);
  if (!lobby.playerIds.size) {
    lobbies.delete(lobby.id);
  } else {
    if (lobby.hostId === player.id) lobby.hostId = lobby.playerIds.values().next().value;
    broadcastSnapshot(lobby.id);
  }
  broadcastLobbyList();
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
});

const sockets = new WebSocketServer({ server, path: '/ws', maxPayload: 2048 });

sockets.on('connection', socket => {
  socket.playerId = null;
  broadcastLobbyList(socket);

  socket.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === 'listLobbies') {
      broadcastLobbyList(socket);
      return;
    }

    if (message.type === 'createLobby') {
      if (socket.playerId || lobbies.size >= 32) {
        send(socket, { type: 'lobbyError', message: socket.playerId ? 'Ya estás dentro de una partida.' : 'El servidor alcanzó el límite de partidas.' });
        return;
      }
      const lobby = {
        id: randomUUID().slice(0, 8).toUpperCase(),
        name: cleanName(message.lobbyName, 'Partida nueva', 32),
        hostId: null,
        playerIds: new Set(),
        maxPlayers: 8
      };
      lobbies.set(lobby.id, lobby);
      createLobbyPlayer(socket, lobby, message.name);
      broadcastSnapshot(lobby.id);
      broadcastLobbyList();
      return;
    }

    if (message.type === 'joinLobby') {
      if (socket.playerId) {
        send(socket, { type: 'lobbyError', message: 'Ya estás dentro de una partida.' });
        return;
      }
      const lobby = lobbies.get(message.lobbyId);
      if (!lobby) {
        send(socket, { type: 'lobbyError', message: 'La partida ya no está disponible.' });
        broadcastLobbyList(socket);
        return;
      }
      if (lobby.playerIds.size >= lobby.maxPlayers) {
        send(socket, { type: 'lobbyError', message: 'La partida está llena.' });
        return;
      }
      createLobbyPlayer(socket, lobby, message.name);
      broadcastSnapshot(lobby.id);
      broadcastLobbyList();
      return;
    }

    const current = players.get(socket.playerId);
    if (!current || current.health <= 0) return;

    if (message.type === 'swing') {
      current.attackingUntil = Date.now() + 520;
      broadcastSnapshot(current.lobbyId);
      return;
    }

    if (message.type === 'worldDamage') {
      const damageTime = Date.now();
      const damage = Number(message.damage);
      if (damageTime < current.invulnerableUntil || damageTime - current.lastWorldDamageAt < 300 || !Number.isFinite(damage) || damage <= 0) return;
      current.lastWorldDamageAt = damageTime;
      current.health = Math.max(0, current.health - Math.min(22, damage));
      if (current.health === 0) current.respawnAt = damageTime + 2600;
      broadcastSnapshot(current.lobbyId);
      return;
    }

    if (message.type === 'state') {
      const values = [message.x, message.y, message.z, message.yaw].map(Number);
      if (!values.every(Number.isFinite)) return;
      const [x, y, z, yaw] = values;
      if (Math.abs(x) > 100 || Math.abs(z) > 100 || y < -1 || y > 5) return;
      const elapsed = Math.max(.025, Math.min((Date.now() - current.lastStateAt) / 1000, .25));
      const dx = x - current.x;
      const dz = z - current.z;
      const distance = Math.hypot(dx, dz);
      const maximumDistance = 14 * elapsed + .8;
      if (distance > maximumDistance) {
        const ratio = maximumDistance / distance;
        current.x += dx * ratio;
        current.z += dz * ratio;
      } else {
        current.x = x;
        current.z = z;
      }
      current.y = y;
      current.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      current.lastStateAt = Date.now();
      return;
    }

    if (message.type !== 'attack' || typeof message.targetId !== 'string') return;
    const allowedMoves = new Set(['normal', 'mediaLunaLaunch', 'mediaLunaAir', 'mediaLunaSlam']);
    const move = allowedMoves.has(message.move) ? message.move : 'normal';
    const attackTime = Date.now();
    const attackCooldown = move === 'mediaLunaAir' ? 150 : move === 'mediaLunaLaunch' ? 580 : 360;
    if (attackTime - current.lastAttackAt < attackCooldown) return;
    const target = players.get(message.targetId);
    if (!target || target.lobbyId !== current.lobbyId || target === current || target.health <= 0 || attackTime < target.invulnerableUntil) return;
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const distance = Math.hypot(dx, dz);
    const facingX = Math.sin(current.yaw);
    const facingZ = Math.cos(current.yaw);
    const facingDot = distance > 0 ? (dx * facingX + dz * facingZ) / distance : 1;
    const attackRange = move === 'mediaLunaLaunch' ? 4.4 : move === 'mediaLunaAir' ? 3.2 : move === 'mediaLunaSlam' ? 4 : 3.4;
    if (distance > attackRange || facingDot < (move === 'normal' ? -.25 : .2)) return;

    current.lastAttackAt = attackTime;
    current.attackingUntil = attackTime + 520;
    const damage = move === 'mediaLunaLaunch' ? 48 : move === 'mediaLunaAir' ? 17 : move === 'mediaLunaSlam' ? 72 : 24;
    target.health = Math.max(0, target.health - damage);
    if (target.health === 0) target.respawnAt = attackTime + 2600;
    broadcastCombatHit(current.lobbyId, current.id, target.id, move);
    broadcastSnapshot(current.lobbyId);
  });

  socket.on('close', () => removePlayer(socket));
  socket.on('error', () => {});
});

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const player of players.values()) {
    if (player.health > 0 || !player.respawnAt || now < player.respawnAt) continue;
    const lobby = lobbies.get(player.lobbyId);
    if (!lobby) continue;
    const spawn = spawnPosition([...lobby.playerIds].indexOf(player.id));
    Object.assign(player, spawn, { health: player.maxHealth, respawnAt: 0, invulnerableUntil: now + INVULNERABILITY_MS, lastStateAt: now });
    changed = true;
  }
  if (changed) for (const lobby of lobbies.values()) broadcastSnapshot(lobby.id);
}, 250);

setInterval(() => {
  for (const lobby of lobbies.values()) broadcastSnapshot(lobby.id);
}, 50);
server.listen(port, '0.0.0.0', () => {
  console.log(`Walpira dedicado: http://0.0.0.0:${port}`);
});