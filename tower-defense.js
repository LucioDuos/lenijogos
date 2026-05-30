const canvas = document.querySelector('#defenseGame');
const ctx = canvas.getContext('2d');
const coinsEl = document.querySelector('#coins');
const livesEl = document.querySelector('#lives');
const waveEl = document.querySelector('#wave');
const waveBtn = document.querySelector('#waveBtn');
const messageEl = document.querySelector('#message');
const panelTitle = document.querySelector('#panelTitle');
const panelText = document.querySelector('#panelText');
const buildOptions = document.querySelector('#buildOptions');
const upgradeOptions = document.querySelector('#upgradeOptions');
const upgradeBtn = document.querySelector('#upgradeBtn');
const sellBtn = document.querySelector('#sellBtn');

const path = [
  { x: -28, y: 120 }, { x: 155, y: 120 }, { x: 155, y: 290 },
  { x: 365, y: 290 }, { x: 365, y: 460 }, { x: 585, y: 460 },
  { x: 585, y: 235 }, { x: 770, y: 235 }, { x: 770, y: 390 }, { x: 990, y: 390 },
];
const slots = [
  { x: 82, y: 220 }, { x: 255, y: 185 }, { x: 255, y: 385 },
  { x: 465, y: 365 }, { x: 480, y: 535 }, { x: 690, y: 340 },
  { x: 680, y: 135 }, { x: 866, y: 285 }, { x: 860, y: 500 },
];
const towerTypes = {
  archer: { name: 'Arqueiro', icon: '🏹', cost: 70, range: 138, damage: 14, rate: 34, color: '#6dff9c' },
  cannon: { name: 'Canhão', icon: '💣', cost: 110, range: 115, damage: 34, rate: 78, color: '#ffb25b' },
};
const maxWaves = 8;
let coins = 180;
let lives = 20;
let wave = 0;
let activeWave = false;
let spawnQueue = [];
let spawnTimer = 0;
let enemies = [];
let projectiles = [];
let selectedSlot = null;
let ended = false;

function updateHud() {
  coinsEl.textContent = coins;
  livesEl.textContent = lives;
  waveEl.textContent = `${wave} / ${maxWaves}`;
}

function setMessage(text) { messageEl.textContent = text; }

function towerStats(tower) {
  const base = towerTypes[tower.type];
  const bonus = 1 + (tower.level - 1) * 0.55;
  return { ...base, damage: Math.round(base.damage * bonus), range: base.range + (tower.level - 1) * 12, rate: Math.max(16, base.rate - (tower.level - 1) * 5) };
}

function upgradeCost(tower) { return 55 + tower.level * (tower.type === 'cannon' ? 55 : 40); }
function sellValue(tower) { return Math.round((towerTypes[tower.type].cost + (tower.level - 1) * 60) * .55); }

function selectSlot(slot) {
  selectedSlot = slot;
  if (!slot.tower) {
    panelTitle.textContent = 'Construir defesa';
    panelText.textContent = 'Escolha uma arma para instalar neste campo.';
    buildOptions.hidden = false;
    upgradeOptions.hidden = true;
    return;
  }
  const stats = towerStats(slot.tower);
  panelTitle.textContent = stats.name;
  panelText.textContent = `Dano ${stats.damage} • Alcance ${stats.range} • Velocidade ${stats.rate}`;
  buildOptions.hidden = true;
  upgradeOptions.hidden = false;
  document.querySelector('#towerIcon').textContent = stats.icon;
  document.querySelector('#towerName').textContent = stats.name;
  document.querySelector('#towerLevel').textContent = `Nível ${slot.tower.level}`;
  upgradeCostEl().textContent = `${upgradeCost(slot.tower)} moedas`;
  document.querySelector('#sellValue').textContent = `+${sellValue(slot.tower)} moedas`;
  upgradeBtn.disabled = slot.tower.level >= 4;
  if (slot.tower.level >= 4) upgradeCostEl().textContent = 'Máximo';
}
function upgradeCostEl() { return document.querySelector('#upgradeCost'); }

function build(type) {
  if (!selectedSlot || selectedSlot.tower) return;
  const base = towerTypes[type];
  if (coins < base.cost) return setMessage('Moedas insuficientes para construir esta defesa.');
  coins -= base.cost;
  selectedSlot.tower = { type, level: 1, cooldown: 0 };
  setMessage(`${base.name} instalado. Prepare-se para os invasores!`);
  updateHud();
  selectSlot(selectedSlot);
}

document.querySelectorAll('[data-build]').forEach((button) => button.addEventListener('click', () => build(button.dataset.build)));
upgradeBtn.addEventListener('click', () => {
  if (!selectedSlot?.tower || selectedSlot.tower.level >= 4) return;
  const cost = upgradeCost(selectedSlot.tower);
  if (coins < cost) return setMessage('Você precisa de mais moedas para esta melhoria.');
  coins -= cost;
  selectedSlot.tower.level += 1;
  setMessage('Arma melhorada! Alcance e poder de ataque aumentaram.');
  updateHud();
  selectSlot(selectedSlot);
});
sellBtn.addEventListener('click', () => {
  if (!selectedSlot?.tower) return;
  coins += sellValue(selectedSlot.tower);
  selectedSlot.tower = null;
  setMessage('Defesa vendida. Escolha uma nova estratégia para este campo.');
  updateHud();
  selectSlot(selectedSlot);
});

function makeEnemy(index) {
  const hp = 40 + wave * 17 + index * 2;
  const armored = wave >= 4 && index % 4 === 0;
  return { x: path[0].x, y: path[0].y, waypoint: 1, hp: armored ? hp * 1.75 : hp, maxHp: armored ? hp * 1.75 : hp, speed: 0.85 + wave * .09, reward: armored ? 24 : 13, armored };
}

function beginWave() {
  if (activeWave || ended || wave >= maxWaves) return;
  wave += 1;
  activeWave = true;
  spawnQueue = Array.from({ length: 5 + wave * 2 }, (_, index) => makeEnemy(index));
  spawnTimer = 0;
  waveBtn.disabled = true;
  waveBtn.textContent = 'Onda em andamento...';
  setMessage(`Onda ${wave}: ${spawnQueue.length} criaturas se aproximam pela trilha!`);
  updateHud();
}
waveBtn.addEventListener('click', beginWave);

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function moveEnemies() {
  for (const enemy of enemies) {
    const target = path[enemy.waypoint];
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed;
    enemy.y += Math.sin(angle) * enemy.speed;
    if (distance(enemy, target) < 4) enemy.waypoint += 1;
    if (enemy.waypoint >= path.length) enemy.escaped = true;
  }
  const escaped = enemies.filter((enemy) => enemy.escaped);
  if (escaped.length) {
    lives = Math.max(0, lives - escaped.length);
    setMessage(`${escaped.length} criatura(s) alcançaram o cristal!`);
    updateHud();
  }
  enemies = enemies.filter((enemy) => !enemy.escaped);
}

function fireTowers() {
  for (const slot of slots) {
    if (!slot.tower) continue;
    slot.tower.cooldown -= 1;
    const stats = towerStats(slot.tower);
    if (slot.tower.cooldown > 0) continue;
    const targets = enemies.filter((enemy) => distance(slot, enemy) <= stats.range);
    const target = targets.sort((a, b) => b.waypoint - a.waypoint)[0];
    if (!target) continue;
    slot.tower.cooldown = stats.rate;
    projectiles.push({ x: slot.x, y: slot.y, target, damage: stats.damage, color: stats.color, type: slot.tower.type, speed: slot.tower.type === 'cannon' ? 5 : 8 });
  }
}

function moveProjectiles() {
  for (const shot of projectiles) {
    if (!enemies.includes(shot.target)) { shot.done = true; continue; }
    const angle = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x);
    shot.x += Math.cos(angle) * shot.speed;
    shot.y += Math.sin(angle) * shot.speed;
    if (distance(shot, shot.target) < 9) {
      shot.target.hp -= shot.damage;
      shot.done = true;
      if (shot.target.hp <= 0) {
        coins += shot.target.reward;
        enemies = enemies.filter((enemy) => enemy !== shot.target);
        updateHud();
      }
    }
  }
  projectiles = projectiles.filter((shot) => !shot.done);
}

function update() {
  if (ended) return;
  if (activeWave && spawnQueue.length) {
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      enemies.push(spawnQueue.shift());
      spawnTimer = Math.max(26, 68 - wave * 3);
    }
  }
  moveEnemies();
  fireTowers();
  moveProjectiles();
  if (lives <= 0) {
    ended = true;
    setMessage('O cristal caiu. Recarregue a página e tente uma nova estratégia.');
    waveBtn.textContent = 'Reino derrotado';
    waveBtn.disabled = true;
  } else if (activeWave && !spawnQueue.length && !enemies.length) {
    activeWave = false;
    if (wave === maxWaves) {
      ended = true;
      setMessage('Vitória! O reino sobreviveu a todas as invasões.');
      waveBtn.textContent = 'Reino protegido!';
    } else {
      coins += 30 + wave * 5;
      updateHud();
      setMessage(`Onda vencida! Bônus recebido. Melhore suas defesas antes da próxima.`);
      waveBtn.textContent = `Iniciar onda ${wave + 1}`;
      waveBtn.disabled = false;
    }
  }
}
function drawMap() {
  const bg = ctx.createLinearGradient(0, 0, 960, 600);
  bg.addColorStop(0, '#244f43'); bg.addColorStop(1, '#132f35');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 960, 600);
  ctx.globalAlpha = .16;
  for (let x = 18; x < 960; x += 45) for (let y = 18; y < 600; y += 45) {
    ctx.fillStyle = (x + y) % 90 ? '#b5e298' : '#76c58e';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#7f603f'; ctx.lineWidth = 54; ctx.beginPath();
  path.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke();
  ctx.strokeStyle = '#b98f62'; ctx.lineWidth = 42; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,174,.26)'; ctx.lineWidth = 3; ctx.setLineDash([12, 13]); ctx.stroke(); ctx.setLineDash([]);
  // final crystal keep
  ctx.fillStyle = '#5e507a'; ctx.fillRect(910, 334, 46, 86);
  ctx.fillStyle = '#a597c5'; ctx.fillRect(904, 328, 16, 22); ctx.fillRect(932, 328, 16, 22); ctx.fillRect(948, 328, 16, 22);
  ctx.fillStyle = '#77e8ff'; ctx.beginPath(); ctx.moveTo(930,350); ctx.lineTo(946,371); ctx.lineTo(930,398); ctx.lineTo(914,371); ctx.closePath(); ctx.fill();
}

function drawSlots() {
  for (const slot of slots) {
    const active = slot === selectedSlot;
    ctx.fillStyle = slot.tower ? '#2d594c' : 'rgba(190,229,215,.14)';
    ctx.strokeStyle = active ? '#fff6a8' : '#bce5d7'; ctx.lineWidth = active ? 4 : 2;
    ctx.beginPath(); ctx.arc(slot.x, slot.y, 27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!slot.tower) {
      ctx.fillStyle = 'rgba(255,255,255,.66)'; ctx.font = '700 25px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', slot.x, slot.y + 9);
      continue;
    }
    const stats = towerStats(slot.tower);
    ctx.fillStyle = stats.color; ctx.beginPath(); ctx.arc(slot.x, slot.y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText(stats.icon, slot.x, slot.y + 7);
    ctx.fillStyle = '#ffe571'; ctx.font = '700 10px sans-serif'; ctx.fillText(`N${slot.tower.level}`, slot.x, slot.y + 43);
    if (active) { ctx.strokeStyle = 'rgba(255,246,168,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(slot.x, slot.y, stats.range, 0, Math.PI * 2); ctx.stroke(); }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.fillStyle = enemy.armored ? '#8f7fff' : '#ff657c'; ctx.strokeStyle = enemy.armored ? '#d8d1ff' : '#ffc3ce'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.armored ? 15 : 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#152531'; ctx.fillRect(enemy.x - 16, enemy.y - 23, 32, 4);
    ctx.fillStyle = '#72ff94'; ctx.fillRect(enemy.x - 16, enemy.y - 23, 32 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(enemy.x - 4, enemy.y - 2, 2, 0, Math.PI * 2); ctx.arc(enemy.x + 4, enemy.y - 2, 2, 0, Math.PI * 2); ctx.fill();
  }
}
function drawShots() { for (const shot of projectiles) { ctx.fillStyle = shot.color; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.type === 'cannon' ? 6 : 4, 0, Math.PI * 2); ctx.fill(); } }
function draw() { drawMap(); drawSlots(); drawEnemies(); drawShots(); }
function loop() { update(); draw(); requestAnimationFrame(loop); }

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const point = { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  const slot = slots.find((candidate) => distance(candidate, point) <= 35);
  if (slot) selectSlot(slot);
});

updateHud();
requestAnimationFrame(loop);
