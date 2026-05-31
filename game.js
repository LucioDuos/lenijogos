const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const levelLabel = document.querySelector('#levelLabel');
const statusText = document.querySelector('#statusText');
const restartBtn = document.querySelector('#restartBtn');

const TILE = 30;
const GRAVITY = 0.82;
const FRICTION = 0.82;
const MOVE = 0.75;
const JUMP = 14.4;

const keys = new Set();
let currentLevel = 0;
let messageTimer = 0;
let game;

const colors = {
  wall: '#3b315d',
  wallTop: '#5d5184',
  fire: '#ff6b2c',
  water: '#35b7ff',
  acid: '#7bff5c',
  crystalFire: '#ffb13d',
  crystalWater: '#72e6ff',
  gate: '#d8c6ff',
  plate: '#ffe26b',
  portalFire: '#ff8b46',
  portalWater: '#70d5ff',
  good: '#6dff9c',
};

const levels = [
  {
    name: 'Fase 1: Primeira Câmara',
    fireStart: { x: 70, y: 420 },
    waterStart: { x: 125, y: 420 },
    platforms: [
      [0, 510, 960, 30], [0, 0, 30, 540], [930, 0, 30, 540],
      [120, 420, 180, 24], [390, 420, 210, 24], [690, 420, 150, 24],
      [210, 330, 150, 22], [510, 320, 180, 22], [735, 260, 120, 22],
      [60, 230, 120, 22], [300, 175, 180, 22]
    ],
    hazards: [
      { x: 310, y: 486, w: 150, h: 24, type: 'water' },
      { x: 565, y: 486, w: 150, h: 24, type: 'fire' },
      { x: 715, y: 486, w: 85, h: 24, type: 'acid' }
    ],
    crystals: [
      { x: 255, y: 288, type: 'fire' }, { x: 780, y: 218, type: 'fire' },
      { x: 555, y: 278, type: 'water' }, { x: 345, y: 133, type: 'water' }
    ],
    portals: {
      fire: { x: 817, y: 345, w: 42, h: 75 },
      water: { x: 66, y: 155, w: 42, h: 75 }
    },
    gates: [], plates: [], movers: []
  },
  {
    name: 'Fase 2: Portões Cruzados',
    fireStart: { x: 70, y: 420 },
    waterStart: { x: 850, y: 420 },
    platforms: [
      [0, 510, 960, 30], [0, 0, 30, 540], [930, 0, 30, 540],
      [70, 415, 190, 22], [700, 415, 190, 22], [365, 410, 230, 22],
      [185, 320, 190, 22], [585, 320, 190, 22], [395, 235, 170, 22],
      [70, 170, 150, 22], [740, 170, 150, 22]
    ],
    hazards: [
      { x: 270, y: 486, w: 150, h: 24, type: 'water' },
      { x: 540, y: 486, w: 150, h: 24, type: 'fire' },
      { x: 420, y: 486, w: 120, h: 24, type: 'acid' },
      { x: 452, y: 386, w: 70, h: 24, type: 'acid' }
    ],
    crystals: [
      { x: 112, y: 128, type: 'fire' }, { x: 642, y: 278, type: 'fire' },
      { x: 810, y: 128, type: 'water' }, { x: 262, y: 278, type: 'water' }
    ],
    portals: {
      fire: { x: 797, y: 95, w: 42, h: 75 },
      water: { x: 118, y: 95, w: 42, h: 75 }
    },
    gates: [{ x: 459, y: 320, w: 42, h: 90, id: 'center' }],
    plates: [
      { x: 214, y: 392, w: 46, h: 10, id: 'center' },
      { x: 700, y: 392, w: 46, h: 10, id: 'center' }
    ],
    movers: []
  },
  {
    name: 'Fase 3: Elevadores do Templo',
    fireStart: { x: 65, y: 420 },
    waterStart: { x: 115, y: 420 },
    platforms: [
      [0, 510, 960, 30], [0, 0, 30, 540], [930, 0, 30, 540],
      [55, 420, 165, 22], [740, 420, 165, 22], [295, 385, 125, 22],
      [540, 350, 135, 22], [75, 300, 160, 22], [730, 270, 150, 22],
      [395, 210, 170, 22], [80, 145, 130, 22], [750, 145, 130, 22]
    ],
    hazards: [
      { x: 235, y: 486, w: 180, h: 24, type: 'fire' },
      { x: 545, y: 486, w: 180, h: 24, type: 'water' },
      { x: 415, y: 486, w: 130, h: 24, type: 'acid' },
      { x: 420, y: 186, w: 90, h: 24, type: 'acid' }
    ],
    crystals: [
      { x: 810, y: 103, type: 'fire' }, { x: 585, y: 308, type: 'fire' },
      { x: 137, y: 103, type: 'water' }, { x: 790, y: 228, type: 'water' }
    ],
    portals: {
      fire: { x: 820, y: 345, w: 42, h: 75 },
      water: { x: 120, y: 225, w: 42, h: 75 }
    },
    gates: [{ x: 620, y: 270, w: 42, h: 80, id: 'upper' }],
    plates: [{ x: 338, y: 362, w: 46, h: 10, id: 'upper' }],
    movers: [{ x: 430, y: 420, w: 95, h: 18, minY: 250, maxY: 420, speed: 1.45, dir: -1 }]
  }
];

function makePlayer(type, start) {
  return {
    type,
    x: start.x,
    y: start.y,
    w: 28,
    h: 42,
    vx: 0,
    vy: 0,
    grounded: false,
    spawn: start,
    crystals: 0,
  };
}

function loadLevel(index) {
  const data = levels[index];
  game = structuredClone(data);
  game.fire = makePlayer('fire', data.fireStart);
  game.water = makePlayer('water', data.waterStart);
  game.crystals.forEach((crystal) => { crystal.collected = false; });
  messageTimer = 0;
  levelLabel.textContent = data.name;
  statusText.textContent = 'Colete os cristais e encontre as portas!';
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getSolids() {
  const pressed = new Set();
  for (const plate of game.plates) {
    if (rectsOverlap(game.fire, plate) || rectsOverlap(game.water, plate)) pressed.add(plate.id);
  }
  const gates = game.gates.filter((gate) => !pressed.has(gate.id));
  return [...game.platforms.map(([x, y, w, h]) => ({ x, y, w, h })), ...gates, ...game.movers];
}

function controlPlayer(player, left, right, jump) {
  if (keys.has(left)) player.vx -= MOVE;
  if (keys.has(right)) player.vx += MOVE;
  player.vx = Math.max(-6.3, Math.min(6.3, player.vx));
  if (keys.has(jump) && player.grounded) {
    player.vy = -JUMP;
    player.grounded = false;
  }
}

function movePlayer(player, solids) {
  player.vy += GRAVITY;
  player.vx *= FRICTION;

  player.x += player.vx;
  for (const solid of solids) {
    if (!rectsOverlap(player, solid)) continue;
    if (player.vx > 0) player.x = solid.x - player.w;
    if (player.vx < 0) player.x = solid.x + solid.w;
    player.vx = 0;
  }

  player.y += player.vy;
  player.grounded = false;
  for (const solid of solids) {
    if (!rectsOverlap(player, solid)) continue;
    if (player.vy > 0) {
      player.y = solid.y - player.h;
      player.grounded = true;
    } else if (player.vy < 0) {
      player.y = solid.y + solid.h;
    }
    player.vy = 0;
  }

  if (player.y > canvas.height + 80) resetPlayers('Cuidado com as quedas!');
}

function resetPlayers(message) {
  for (const player of [game.fire, game.water]) {
    player.x = player.spawn.x;
    player.y = player.spawn.y;
    player.vx = 0;
    player.vy = 0;
  }
  statusText.textContent = message;
  messageTimer = 120;
}

function updateMovers() {
  for (const mover of game.movers) {
    mover.y += mover.speed * mover.dir;
    if (mover.y <= mover.minY || mover.y >= mover.maxY) mover.dir *= -1;
  }
}

function updateCrystals() {
  for (const crystal of game.crystals) {
    const player = crystal.type === 'fire' ? game.fire : game.water;
    const box = { x: crystal.x - 12, y: crystal.y - 16, w: 24, h: 32 };
    if (!crystal.collected && rectsOverlap(player, box)) {
      crystal.collected = true;
      player.crystals += 1;
      statusText.textContent = `${player.type === 'fire' ? 'Fogo' : 'Água'} coletou um cristal!`;
      messageTimer = 80;
    }
  }
}

function updateHazards() {
  for (const hazard of game.hazards) {
    for (const player of [game.fire, game.water]) {
      if (!rectsOverlap(player, hazard)) continue;
      const deadly = hazard.type === 'acid' || hazard.type !== player.type;
      if (deadly) {
        resetPlayers(player.type === 'fire' ? 'Fogo se queimou/molhou! Tente de novo.' : 'Água encontrou perigo! Tente de novo.');
        return;
      }
    }
  }
}

function checkWin() {
  const allCollected = game.crystals.every((crystal) => crystal.collected);
  const fireHome = rectsOverlap(game.fire, game.portals.fire);
  const waterHome = rectsOverlap(game.water, game.portals.water);
  if (allCollected && fireHome && waterHome) {
    if (currentLevel === levels.length - 1) {
      statusText.textContent = 'Vitória! O templo foi conquistado pelos dois heróis!';
      messageTimer = 999999;
    } else {
      currentLevel += 1;
      loadLevel(currentLevel);
      statusText.textContent = 'Portal aberto! Próxima fase.';
      messageTimer = 120;
      window.LeniJogos?.saveProgress('fogo-agua', { level: currentLevel + 1 });
    }
  } else if ((fireHome || waterHome) && !allCollected && messageTimer <= 0) {
    statusText.textContent = 'Ainda existem cristais espalhados pela fase.';
    messageTimer = 80;
  }
}

function update() {
  updateMovers();
  const solids = getSolids();
  controlPlayer(game.fire, 'ArrowLeft', 'ArrowRight', 'ArrowUp');
  controlPlayer(game.water, 'KeyA', 'KeyD', 'KeyW');
  movePlayer(game.fire, solids);
  movePlayer(game.water, solids);
  updateCrystals();
  updateHazards();
  checkWin();

  if (messageTimer > 0) messageTimer -= 1;
  if (messageTimer === 0) statusText.textContent = 'Trabalhem juntos para superar os obstáculos.';
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#17122c');
  gradient.addColorStop(1, '#0d0a18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawPlatforms() {
  for (const [x, y, w, h] of game.platforms) {
    ctx.fillStyle = colors.wall;
    roundedRect(x, y, w, h, 6);
    ctx.fillStyle = colors.wallTop;
    roundedRect(x, y, w, Math.min(7, h), 5);
  }
  for (const mover of game.movers) {
    ctx.fillStyle = '#8c7bc6';
    roundedRect(mover.x, mover.y, mover.w, mover.h, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundedRect(mover.x + 8, mover.y + 4, mover.w - 16, 4, 3);
  }
}

function drawHazards() {
  for (const hazard of game.hazards) {
    ctx.fillStyle = colors[hazard.type];
    roundedRect(hazard.x, hazard.y, hazard.w, hazard.h, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let x = hazard.x + 8; x < hazard.x + hazard.w; x += 24) {
      ctx.beginPath();
      ctx.arc(x, hazard.y + 8 + Math.sin(Date.now() / 160 + x) * 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCrystals() {
  for (const crystal of game.crystals) {
    if (crystal.collected) continue;
    const bob = Math.sin(Date.now() / 220 + crystal.x) * 4;
    ctx.save();
    ctx.translate(crystal.x, crystal.y + bob);
    ctx.fillStyle = colors[`crystal${crystal.type[0].toUpperCase()}${crystal.type.slice(1)}`];
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawMechanisms() {
  const pressed = new Set();
  for (const plate of game.plates) {
    const isPressed = rectsOverlap(game.fire, plate) || rectsOverlap(game.water, plate);
    if (isPressed) pressed.add(plate.id);
    ctx.fillStyle = isPressed ? colors.good : colors.plate;
    roundedRect(plate.x, plate.y + (isPressed ? 5 : 0), plate.w, plate.h, 5);
  }
  for (const gate of game.gates) {
    if (pressed.has(gate.id)) continue;
    ctx.fillStyle = colors.gate;
    roundedRect(gate.x, gate.y, gate.w, gate.h, 8);
    ctx.fillStyle = 'rgba(60, 49, 93, 0.35)';
    for (let y = gate.y + 10; y < gate.y + gate.h; y += 18) roundedRect(gate.x + 8, y, gate.w - 16, 7, 3);
  }
}

function drawPortals() {
  for (const type of ['fire', 'water']) {
    const portal = game.portals[type];
    ctx.save();
    ctx.translate(portal.x + portal.w / 2, portal.y + portal.h / 2);
    ctx.strokeStyle = colors[`portal${type[0].toUpperCase()}${type.slice(1)}`];
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.ellipse(0, 0, portal.w / 2, portal.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(player) {
  const color = player.type === 'fire' ? colors.fire : colors.water;
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  roundedRect(-player.w / 2, -player.h / 2, player.w, player.h, 12);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-6, -6, 3.5, 0, Math.PI * 2);
  ctx.arc(6, -6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#211a3f';
  ctx.beginPath();
  ctx.arc(-5, -6, 1.6, 0, Math.PI * 2);
  ctx.arc(7, -6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud() {
  const fireTotal = game.crystals.filter((c) => c.type === 'fire').length;
  const waterTotal = game.crystals.filter((c) => c.type === 'water').length;
  const fireGot = game.crystals.filter((c) => c.type === 'fire' && c.collected).length;
  const waterGot = game.crystals.filter((c) => c.type === 'water' && c.collected).length;
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  roundedRect(38, 22, 278, 42, 14);
  ctx.font = '700 18px Inter, sans-serif';
  ctx.fillStyle = colors.fire;
  ctx.fillText(`Fogo ${fireGot}/${fireTotal}`, 58, 49);
  ctx.fillStyle = colors.water;
  ctx.fillText(`Água ${waterGot}/${waterTotal}`, 178, 49);
}

function draw() {
  drawBackground();
  drawPortals();
  drawHazards();
  drawPlatforms();
  drawMechanisms();
  drawCrystals();
  drawPlayer(game.fire);
  drawPlayer(game.water);
  drawHud();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function setControl(control, active) {
  const [hero, action] = control.split(':');
  const map = {
    fire: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' },
    water: { left: 'KeyA', right: 'KeyD', jump: 'KeyW' },
  };
  const code = map[hero][action];
  if (active) keys.add(code);
  else keys.delete(code);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW'].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.code));
restartBtn.addEventListener('click', () => loadLevel(currentLevel));

document.querySelectorAll('[data-control]').forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setControl(control, true);
  });
  button.addEventListener('pointerup', () => setControl(control, false));
  button.addEventListener('pointercancel', () => setControl(control, false));
  button.addEventListener('pointerleave', () => setControl(control, false));
});

loadLevel(currentLevel);
requestAnimationFrame(loop);
