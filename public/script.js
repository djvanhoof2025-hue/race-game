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

// Защита от зума Safari
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

const tapBtn = document.getElementById('btn-tap');

// Мгновенный отклик + вибрация
tapBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  socket.emit('tap');
  tapBtn.classList.add('pressed');
  if (navigator.vibrate) navigator.vibrate(12);
}, { passive: false });

tapBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  tapBtn.classList.remove('pressed');
}, { passive: false });

tapBtn.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') socket.emit('tap');
});

socket.on('connect', () => myId = socket.id);
socket.on('state', updateUI);

function updateUI(s) {
  document.getElementById('round-info').textContent = `Раунд ${s.round}/3`;
  document.getElementById('timer').textContent = s.timeLeft;

  const players = Object.entries(s.players).filter(([, p]) => !p.spectator);
  const p1 = players[0], p2 = players[1];

  const updateTrack = (p, id, nameId, winsId) => {
    if (p) {
      document.getElementById(nameId).textContent = p[1].name;
      document.getElementById(winsId).textContent = `🏆 ${p[1].wins || 0}`;
      const posPercent = Math.min((p[1].pos / 150) * 82 + 12, 92);
      document.getElementById(id).style.left = `${posPercent}%`;
    }
  };

  updateTrack(p1, 'ball-1', 'name-1', 'wins-1');
  updateTrack(p2, 'ball-2', 'name-2', 'wins-2');

  const amSpectator = myId && s.players[myId]?.spectator;
  const tapBtn = document.getElementById('btn-tap');
  const status = document.getElementById('match-status');
  const result = document.getElementById('result');

  tapBtn.classList.add('hidden');
  result.classList.add('hidden');

  if (s.status === 'lobby') {
    status.textContent = players.length < 2 ? `Ждём 2-го игрока (${players.length}/2)` : 'Запуск...';
  } else if (s.status === 'playing') {
    status.textContent = amSpectator ? '👀 Игра идёт (вы зритель)' : '🔥 Тапайте быстрее!';
    if (!amSpectator) tapBtn.classList.remove('hidden');
  } else if (s.status === 'round_end') {
    status.textContent = '⏱ Раунд завершён';
    result.classList.remove('hidden');
    result.textContent = `🏁 Раунд окончен!\n🔹 Победил: ${p1[1].pos > p2[1].pos ? p1[1].name : p2[1].name}`;
  } else if (s.status === 'game_end') {
    status.textContent = '🏆 Матч окончен!';
    result.classList.remove('hidden');
    const winner = players.reduce((a, b) => (a[1].wins || 0) > (b[1].wins || 0) ? a : b);
    result.innerHTML = `👑 Чемпион: <strong>${winner[1].name}</strong><br><span style="font-size:0.9em; opacity:0.8">Новая игра через 15 сек...</span>`;
  }
}
