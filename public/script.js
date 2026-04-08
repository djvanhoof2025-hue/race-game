const socket = io();
let myId = null;

document.getElementById('btn-play').onclick = () => {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('name-input').classList.remove('hidden');
};

document.getElementById('btn-watch').onclick = () => {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game-ui').classList.remove('hidden');
  socket.emit('watch');
};

document.getElementById('btn-submit').onclick = () => {
  const name = document.getElementById('player-name').value.trim() || 'Игрок';
  socket.emit('play', name);
  document.getElementById('name-input').classList.add('hidden');
  document.getElementById('game-ui').classList.remove('hidden');
};

// 🔑 Защита от зума при двойном тапе (глобально)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// 🔑 Мгновенная обработка тапов без задержки 300мс
const tapBtn = document.getElementById('btn-tap');

tapBtn.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Блокирует зум/скролл Safari
  socket.emit('tap');
  tapBtn.classList.add('pressed');
}, { passive: false });

tapBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  tapBtn.classList.remove('pressed');
}, { passive: false });

// Фоллбэк для ПК/планшетов с мышью
tapBtn.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    socket.emit('tap');
  }
});

socket.on('connect', () => myId = socket.id);
socket.on('state', updateUI);

function updateUI(s) {
  document.getElementById('round-info').textContent = `Раунд: ${s.round}/3`;
  document.getElementById('timer').textContent = s.timeLeft;

  const players = Object.entries(s.players).filter(([, p]) => !p.spectator);
  const p1 = players[0], p2 = players[1];

  if (p1) {
    document.getElementById('name-1').textContent = p1[1].name;
    document.getElementById('wins-1').textContent = `🏆${p1[1].wins || 0}`;
    document.getElementById('ball-1').style.left = `${Math.min((p1[1].pos / 150) * 85 + 10, 95)}%`;
  }
  if (p2) {
    document.getElementById('name-2').textContent = p2[1].name;
    document.getElementById('wins-2').textContent = `🏆${p2[1].wins || 0}`;
    document.getElementById('ball-2').style.left = `${Math.min((p2[1].pos / 150) * 85 + 10, 95)}%`;
  }

  const amSpectator = myId && s.players[myId]?.spectator;
  const tapBtn = document.getElementById('btn-tap');
  const status = document.getElementById('match-status');
  const result = document.getElementById('result');

  if (s.status === 'lobby') {
    status.textContent = players.length < 2 ? `Ждём 2-го игрока (${players.length}/2)` : 'Запуск...';
    tapBtn.classList.add('hidden');
    result.classList.add('hidden');
  } else if (s.status === 'playing') {
    status.textContent = amSpectator ? 'Игра идёт (вы зритель)' : 'Тапайте как можно быстрее!';
    tapBtn.classList.toggle('hidden', amSpectator);
    result.classList.add('hidden');
  } else if (s.status === 'round_end') {
    status.textContent = 'Раунд завершён';
    tapBtn.classList.add('hidden');
    result.classList.remove('hidden');
    result.textContent = `🔹 Победил: ${p1[1].pos > p2[1].pos ? p1[1].name : p2[1].name}`;
  } else if (s.status === 'game_end') {
    status.textContent = 'Матч окончен!';
    tapBtn.classList.add('hidden');
    result.classList.remove('hidden');
    const winner = players.reduce((a, b) => (a[1].wins || 0) > (b[1].wins || 0) ? a : b);
    result.textContent = `🏆 Чемпион: ${winner[1].name}`;
  }
}
