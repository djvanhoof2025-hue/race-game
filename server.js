const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const state = {
  status: 'lobby',      // lobby | playing | round_end | game_end
  players: {},
  round: 0,
  timeLeft: 60,
  timer: null,
  finishPos: 150        // ~2.5 тапа/сек в течение 60 сек
};

function broadcast() {
  io.emit('state', {
    status: state.status,
    players: state.players,
    round: state.round || 1,
    timeLeft: state.timeLeft
  });
}

function checkAutoStart() {
  const real = Object.values(state.players).filter(p => !p.spectator);
  if (real.length === 2 && state.status === 'lobby') startGame();
}

function startGame() {
  state.status = 'playing';
  state.round = 1;
  state.timeLeft = 60;
  Object.values(state.players).forEach(p => {
    if (!p.spectator) { p.taps = 0; p.pos = 0; }
  });
  broadcast();
  state.timer = setInterval(tick, 1000);
}

function tick() {
  state.timeLeft--;
  const someoneFinished = Object.values(state.players).some(p => !p.spectator && p.pos >= state.finishPos);
  if (state.timeLeft <= 0 || someoneFinished) endRound();
  else broadcast();
}

function endRound() {
  clearInterval(state.timer);
  state.status = 'round_end';
  const players = Object.values(state.players).filter(p => !p.spectator);
  const winner = players.reduce((a, b) => a.pos > b.pos ? a : b);
  if (winner) winner.wins = (winner.wins || 0) + 1;
  broadcast();

  if (state.round < 3) {
    state.round++;
    state.timeLeft = 60;
    players.forEach(p => { p.taps = 0; p.pos = 0; });
    state.status = 'playing';
    broadcast();
    state.timer = setInterval(tick, 1000);
  } else {
    state.status = 'game_end';
    broadcast();
    // Автоочистка через 15 сек для новой игры
    setTimeout(() => {
      state.status = 'lobby';
      state.players = {};
      state.round = 0;
      broadcast();
    }, 15000);
  }
}

io.on('connection', (socket) => {
  socket.on('play', (name) => {
    state.players[socket.id] = { name: name || 'Игрок', taps: 0, pos: 0, wins: 0, spectator: false };
    broadcast();
    checkAutoStart();
  });

  socket.on('watch', () => {
    state.players[socket.id] = { name: 'Зритель', taps: 0, pos: 0, wins: 0, spectator: true };
    broadcast();
  });

  socket.on('tap', () => {
    const p = state.players[socket.id];
    if (state.status === 'playing' && p && !p.spectator) {
      p.taps++;
      p.pos = Math.min(p.taps, state.finishPos);
      broadcast();
    }
  });

  socket.on('disconnect', () => {
    delete state.players[socket.id];
    broadcast();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер запущен: http://0.0.0.0:${PORT}`));
