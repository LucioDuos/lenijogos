const canvas = document.querySelector('#wormsGame');
const ctx = canvas.getContext('2d');
const stage = document.querySelector('#wormsStage');
const messageEl = document.querySelector('#wormsMessage');
const weaponSelect = document.querySelector('#weaponSelect');
const hud = {
  team: document.querySelector('#teamLabel'), worm: document.querySelector('#wormLabel'),
  health: document.querySelector('#healthLabel'), angle: document.querySelector('#angleLabel'),
  power: document.querySelector('#powerLabel'), wind: document.querySelector('#windLabel'),
  weapon: document.querySelector('#weaponLabel'),
};
const terrain = document.createElement('canvas');
const terrainCtx = terrain.getContext('2d', { willReadFrequently: true });
terrain.width = canvas.width; terrain.height = canvas.height;

const GRAVITY = .2, CAPY_RADIUS = 15;
const teams = [{ name: 'Coral', color: '#ff766c' }, { name: 'Azul', color: '#62baff' }];
const weapons = {
  bazooka: { name: 'Bazuca', icon: '🚀', level: 1, damage: 68, blast: 72, speed: 1, gravity: 1 },
  mini: { name: 'Mini míssil', icon: '⚡', level: 1, damage: 42, blast: 48, speed: 1.45, gravity: .72 },
  cannon: { name: 'Canhão', icon: '💣', level: 2, damage: 82, blast: 82, speed: .88, gravity: 1.18 },
  grenade: { name: 'Granada', icon: '🟢', level: 2, damage: 72, blast: 76, speed: .9, gravity: 1.3, bounce: 2, fuse: 155 },
  cluster: { name: 'Bomba cluster', icon: '✨', level: 3, damage: 53, blast: 58, speed: .95, gravity: 1.05, cluster: true },
  drill: { name: 'Broca', icon: '🔩', level: 3, damage: 60, blast: 55, speed: 1.25, gravity: .6, pierce: 3 },
  frost: { name: 'Gelo', icon: '❄️', level: 2, damage: 38, blast: 62, speed: 1.05, gravity: .9, frost: true },
  heavy: { name: 'Super bomba', icon: '☄️', level: 4, damage: 105, blast: 102, speed: .7, gravity: 1.28 },
  sniper: { name: 'Tiro preciso', icon: '🎯', level: 4, damage: 88, blast: 35, speed: 1.9, gravity: .34 },
};
let capybaras = [], teamIndex = 0, capyCursors = [0, 0], projectile = null, particles = [];
let keys = new Set(), charging = false, power = 0, wind = 0, turnLocked = false, gameOver = false, audio;
let terrainMask, terrainSurface, selectedWeapon = 'bazooka', rngSeed = Date.now() % 2147483647;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function gameRandom() { rngSeed = rngSeed * 16807 % 2147483647; return (rngSeed - 1) / 2147483646; }

function tone(freq = 440, duration = .08, type = 'sine', volume = .05) {
  try { audio ??= new AudioContext(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration); } catch {}
}
function refreshTerrainCache() {
  const pixels = terrainCtx.getImageData(0, 0, terrain.width, terrain.height).data;
  terrainMask = new Uint8Array(terrain.width * terrain.height); terrainSurface = new Uint16Array(terrain.width); terrainSurface.fill(terrain.height);
  for (let y = 100; y < terrain.height; y++) for (let x = 0; x < terrain.width; x++) { const solid = pixels[(y * terrain.width + x) * 4 + 3] > 10; terrainMask[y * terrain.width + x] = solid; if (solid && terrainSurface[x] === terrain.height) terrainSurface[x] = y; }
}
function refreshTerrainRegion(centerX, centerY, radius) {
  const left = clamp(Math.floor(centerX - radius), 0, terrain.width - 1), top = clamp(Math.floor(centerY - radius), 0, terrain.height - 1), right = clamp(Math.ceil(centerX + radius), 0, terrain.width), bottom = clamp(Math.ceil(centerY + radius), 0, terrain.height), width = right - left, height = bottom - top;
  const pixels = terrainCtx.getImageData(left, top, width, height).data;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) terrainMask[(top + y) * terrain.width + left + x] = pixels[(y * width + x) * 4 + 3] > 10;
  for (let x = left; x < right; x++) { terrainSurface[x] = terrain.height; for (let y = 100; y < terrain.height; y++) if (terrainMask[y * terrain.width + x]) { terrainSurface[x] = y; break; } }
}
function terrainAt(x, y) { if (x < 0 || x >= terrain.width || y < 0 || y >= terrain.height) return y >= terrain.height; return terrainMask[Math.floor(y) * terrain.width + Math.floor(x)] === 1; }
function surfaceY(x) { return terrainSurface[clamp(Math.round(x), 0, terrain.width - 1)]; }
function generateTerrain() {
  terrainCtx.clearRect(0, 0, terrain.width, terrain.height); let y = 410; terrainCtx.beginPath(); terrainCtx.moveTo(0, terrain.height);
  for (let x = 0; x <= terrain.width; x += 12) { y += Math.sin(x / 67) * 3 + (gameRandom() - .5) * 16; y = clamp(y, 300, 535); terrainCtx.lineTo(x, y); }
  terrainCtx.lineTo(terrain.width, terrain.height); terrainCtx.closePath(); terrainCtx.fillStyle = '#55733e'; terrainCtx.fill(); terrainCtx.globalCompositeOperation = 'source-atop'; const gradient = terrainCtx.createLinearGradient(0, 280, 0, 700); gradient.addColorStop(0, '#8ebc55'); gradient.addColorStop(.09, '#62883e'); gradient.addColorStop(1, '#352c2b'); terrainCtx.fillStyle = gradient; terrainCtx.fillRect(0, 0, terrain.width, terrain.height); terrainCtx.globalCompositeOperation = 'source-over'; drawTerrainObstacles(); refreshTerrainCache();
}
function drawTerrainObstacles() {
  const boxes = [[245, 286], [610, 300], [975, 325]]; for (const [x, y] of boxes) { terrainCtx.fillStyle = '#8a5b35'; terrainCtx.fillRect(x, y, 54, 50); terrainCtx.strokeStyle = '#c38a50'; terrainCtx.lineWidth = 4; terrainCtx.strokeRect(x, y, 54, 50); terrainCtx.beginPath(); terrainCtx.moveTo(x, y); terrainCtx.lineTo(x + 54, y + 50); terrainCtx.moveTo(x + 54, y); terrainCtx.lineTo(x, y + 50); terrainCtx.stroke(); }
  const trees = [[420, 255], [815, 225]]; for (const [x, y] of trees) { terrainCtx.fillStyle = '#69462e'; terrainCtx.fillRect(x - 10, y, 20, 105); terrainCtx.fillStyle = '#3f743f'; for (const [dx, dy, r] of [[0, 0, 37], [-25, 20, 30], [27, 20, 31]]) { terrainCtx.beginPath(); terrainCtx.arc(x + dx, y + dy, r, 0, Math.PI * 2); terrainCtx.fill(); } }
  terrainCtx.fillStyle = '#62665b'; for (const [x, y] of [[70, 350], [745, 360]]) { terrainCtx.beginPath(); terrainCtx.ellipse(x, y, 38, 24, 0, 0, Math.PI * 2); terrainCtx.fill(); }
}
function createCapybara(team, name, x) { return { team, name, x, y: surfaceY(x) - CAPY_RADIUS, vx: 0, vy: 0, health: 100, angle: 45, facing: team === 0 ? 1 : -1, alive: true, grounded: true, phase: Math.random() * 6, frozen: 0 }; }
function resetGame(seed = Date.now()) {
  rngSeed = Number(seed) || Date.now(); generateTerrain(); capybaras = [createCapybara(0, 'Luma', 130), createCapybara(0, 'Nino', 330), createCapybara(0, 'Bia', 520), createCapybara(1, 'Zeca', 700), createCapybara(1, 'Mila', 910), createCapybara(1, 'Téo', 1080)];
  teamIndex = 0; capyCursors = [0, 0]; projectile = null; particles = []; keys.clear(); charging = false; power = 0; turnLocked = false; gameOver = false; wind = randomWind(); messageEl.textContent = 'Time Coral: mova Luma, escolha uma arma e prepare o disparo.'; updateHud();
}
function randomWind() { return Math.round((gameRandom() * 2 - 1) * 18) / 10; }
function currentCapybara() { const alive = capybaras.filter(capy => capy.alive && capy.team === teamIndex); return alive[capyCursors[teamIndex] % alive.length]; }
function setHud(field, value) { if (field.textContent !== String(value)) field.textContent = value; }
function updateHud() { const capy = currentCapybara(), weapon = weapons[selectedWeapon]; setHud(hud.team, teams[teamIndex].name); if (hud.team.style.color !== teams[teamIndex].color) hud.team.style.color = teams[teamIndex].color; setHud(hud.worm, capy?.name || '—'); setHud(hud.health, capy?.health ?? 0); setHud(hud.angle, `${capy?.angle ?? 0}°`); setHud(hud.power, `${Math.round(power)}%`); setHud(hud.wind, `${wind > 0 ? '→' : wind < 0 ? '←' : '•'} ${Math.abs(wind).toFixed(1)}`); setHud(hud.weapon, `${weapon.icon} ${weapon.name} N${weapon.level}`); }
function nextTurn() {
  if (gameOver) return; const winner = teams.find((_, index) => capybaras.some(capy => capy.alive && capy.team === index) && !capybaras.some(capy => capy.alive && capy.team !== index));
  if (winner) { gameOver = true; turnLocked = true; messageEl.textContent = `🏆 Time ${winner.name} venceu a batalha!`; window.LeniJogos?.event('win',{winner:winner.name}); return; }
  capyCursors[teamIndex]++; teamIndex = teamIndex ? 0 : 1; const alive = capybaras.filter(capy => capy.alive && capy.team === teamIndex); capyCursors[teamIndex] %= alive.length; wind = randomWind(); power = 0; charging = false; turnLocked = false; messageEl.textContent = `Time ${teams[teamIndex].name}: vez de ${currentCapybara().name}.`; updateHud();
}
function skipTurn() { if (turnLocked || projectile || gameOver) return; turnLocked = true; messageEl.textContent = 'Turno pulado.'; setTimeout(nextTurn, 550); }
function jump() { const capy = currentCapybara(); if (!capy || turnLocked || projectile || gameOver || !capy.grounded) return; capy.vy = -4.3; capy.grounded = false; tone(360, .06, 'triangle', .025); }
function shoot() {
  if (!charging || turnLocked || gameOver) return; charging = false; turnLocked = true; const capy = currentCapybara(), weapon = weapons[selectedWeapon], force = (5 + power * .115) * weapon.speed, angle = capy.angle * Math.PI / 180;
  projectile = { x: capy.x + capy.facing * 24, y: capy.y - 9, vx: Math.cos(angle) * force * capy.facing, vy: -Math.sin(angle) * force, trail: [], weapon: selectedWeapon, bounce: weapon.bounce || 0, pierce: weapon.pierce || 0, fuse: weapon.fuse || 0 };
  tone(weapon.level >= 3 ? 145 : 230, .13, 'square', .07); messageEl.textContent = `${capy.name} disparou ${weapon.name}!`; power = 0; updateHud();
}
function carveTerrain(x, y, radius) { terrainCtx.save(); terrainCtx.globalCompositeOperation = 'destination-out'; terrainCtx.beginPath(); terrainCtx.arc(x, y, radius, 0, Math.PI * 2); terrainCtx.fill(); terrainCtx.restore(); refreshTerrainRegion(x, y, radius + 2); }
function explode(x, y, weaponKey = projectile?.weapon || selectedWeapon, child = false) {
  const weapon = weapons[weaponKey]; tone(weapon.level >= 3 ? 70 : 85, .28, 'sawtooth', .1); carveTerrain(x, y, weapon.blast);
  for (const capy of capybaras) { if (!capy.alive) continue; const dist = distance(capy, { x, y }); if (dist < weapon.blast + CAPY_RADIUS) { const damage = Math.round((1 - dist / (weapon.blast + CAPY_RADIUS)) * weapon.damage); capy.health = Math.max(0, capy.health - damage); capy.vx += (capy.x - x) / Math.max(dist, 1) * 4; capy.vy = -4; capy.frozen = weapon.frost ? 180 : capy.frozen; if (!capy.health) capy.alive = false; } }
  for (let i = 0; i < 32 + weapon.level * 9; i++) { const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 5; particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: 28 + Math.random() * 28, size: 2 + Math.random() * 5, color: weapon.frost ? '#b7f4ff' : i % 3 ? '#ffb357' : '#6a4934' }); }
  if (weapon.cluster && !child) for (const offset of [-35, 0, 35]) setTimeout(() => explode(clamp(x + offset, 0, canvas.width), clamp(y - 4 + Math.abs(offset) * .12, 0, canvas.height), 'mini', true), 140 + Math.abs(offset));
  if (!child) { projectile = null; setTimeout(nextTurn, weapon.cluster ? 1750 : 1300); }
}
function updateCapybaras() {
  for (const capy of capybaras) { if (!capy.alive) continue; capy.phase += .05; if (capy.frozen > 0) capy.frozen--; const grounded = terrainAt(capy.x, capy.y + CAPY_RADIUS + 2); capy.grounded = grounded;
    if (!grounded) { capy.vy += GRAVITY; capy.y += capy.vy; capy.x += capy.vx; capy.vx *= .93; } else { capy.vy = 0; capy.vx *= .72; capy.y = surfaceY(capy.x) - CAPY_RADIUS; }
    if (capy.y > canvas.height + 30) { capy.health = 0; capy.alive = false; }
  }
}
function updateControls() {
  if (turnLocked || projectile || gameOver) return; const capy = currentCapybara(); if (!capy) return; let dx = 0; if (keys.has('KeyA')) dx = -1.55; if (keys.has('KeyD')) dx = 1.55; if (capy.frozen) dx *= .45;
  if (dx) { const nextX = clamp(capy.x + dx, 16, canvas.width - 16), nextSurface = surfaceY(nextX), currentSurface = surfaceY(capy.x), step = currentSurface - nextSurface; if (step <= 17) { capy.x = nextX; capy.facing = Math.sign(dx); if (capy.grounded && step > 5) { capy.vy = -3.6; capy.grounded = false; } else capy.y = Math.min(capy.y, nextSurface - CAPY_RADIUS); } }
  if (keys.has('ArrowUp')) capy.angle = clamp(capy.angle + .55, 5, 85); if (keys.has('ArrowDown')) capy.angle = clamp(capy.angle - .55, 5, 85); if (charging) power = clamp(power + 1.05, 0, 100); updateHud();
}
function updateProjectile() {
  if (!projectile) return; const weapon = weapons[projectile.weapon]; projectile.trail.push({ x: projectile.x, y: projectile.y, life: 20, color: weapon.frost ? '#b7f4ff' : '#fff1a8' }); projectile.trail.forEach(dot => dot.life--); projectile.trail = projectile.trail.filter(dot => dot.life > 0); projectile.vx += wind * .005; projectile.vy += GRAVITY * weapon.gravity; projectile.x += projectile.vx; projectile.y += projectile.vy; if (projectile.fuse) projectile.fuse--;
  const hitCapy = capybaras.find(capy => capy.alive && distance(capy, projectile) < CAPY_RADIUS + 5), hitTerrain = terrainAt(projectile.x, projectile.y);
  if (hitTerrain && projectile.pierce > 0) { carveTerrain(projectile.x, projectile.y, 20); projectile.pierce--; projectile.x += projectile.vx * 2; projectile.y += projectile.vy * 2; return; }
  if (hitTerrain && projectile.bounce > 0) { projectile.bounce--; projectile.vy = -Math.abs(projectile.vy) * .62; projectile.vx *= .76; projectile.y -= 5; return; }
  if (hitCapy || hitTerrain || projectile.x < 0 || projectile.x > canvas.width || projectile.y > canvas.height || (projectile.fuse === 0 && weapon.fuse)) explode(clamp(projectile.x, 0, canvas.width), clamp(projectile.y, 0, canvas.height));
}
function updateParticles() { for (const item of particles) { item.x += item.vx; item.y += item.vy; item.vy += .12; item.life--; } particles = particles.filter(item => item.life > 0); }
function update() { updateControls(); updateCapybaras(); updateProjectile(); updateParticles(); }
function drawBackground() { const sky = ctx.createLinearGradient(0, 0, 0, 700); sky.addColorStop(0, '#55b7eb'); sky.addColorStop(.62, '#b7e6e9'); sky.addColorStop(1, '#f8d48b'); ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(255,246,188,.75)'; ctx.beginPath(); ctx.arc(1030, 100, 52, 0, Math.PI * 2); ctx.fill(); drawMountains('#6ca7a4', 340, 95, .55); drawMountains('#4d817a', 390, 130, .8); }
function drawMountains(color, base, height, offset) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, base); for (let x = 0; x <= canvas.width; x += 80) ctx.lineTo(x, base - height * (.35 + .65 * Math.abs(Math.sin(x * .008 + offset)))); ctx.lineTo(canvas.width, base); ctx.closePath(); ctx.fill(); }
function drawTerrain() { ctx.drawImage(terrain, 0, 0); ctx.strokeStyle = 'rgba(212,244,125,.65)'; ctx.lineWidth = 4; ctx.beginPath(); for (let x = 0; x < canvas.width; x += 8) { const y = surfaceY(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
function drawCapybaras() {
  for (const capy of capybaras) { if (!capy.alive) continue; const active = capy === currentCapybara() && !turnLocked, bob = Math.sin(capy.phase) * 1.4, color = teams[capy.team].color; ctx.save(); ctx.translate(capy.x, capy.y + bob); ctx.scale(capy.facing, 1);
    ctx.fillStyle = capy.frozen ? '#b7f4ff' : color; ctx.strokeStyle = active ? '#fff59b' : 'rgba(255,255,255,.74)'; ctx.lineWidth = active ? 4 : 2; for (const [x, y, r] of [[-11,4,11],[-3,-2,12],[6,-7,12],[14,-11,11]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16, -14, 3, 0, Math.PI * 2); ctx.arc(8, -14, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#26303a'; ctx.beginPath(); ctx.arc(17, -14, 1.4, 0, Math.PI * 2); ctx.arc(9, -14, 1.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(5,18,28,.78)'; ctx.fillRect(capy.x - 20, capy.y - 39, 40, 5); ctx.fillStyle = capy.health > 45 ? '#70ed87' : '#ff6962'; ctx.fillRect(capy.x - 20, capy.y - 39, 40 * capy.health / 100, 5); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 11px sans-serif'; ctx.fillText(capy.name, capy.x, capy.y - 46);
    if (active) { const angle = capy.angle * Math.PI / 180; ctx.strokeStyle = '#fff59b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(capy.x, capy.y - 7); ctx.lineTo(capy.x + Math.cos(angle) * capy.facing * 52, capy.y - 7 - Math.sin(angle) * 52); ctx.stroke(); }
  }
}
function drawProjectile() { if (!projectile) return; for (const dot of projectile.trail) { ctx.globalAlpha = dot.life / 20; ctx.fillStyle = dot.color; ctx.beginPath(); ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.fillStyle = weapons[projectile.weapon].frost ? '#d7fbff' : '#303743'; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2); ctx.fill(); }
function drawParticles() { for (const item of particles) { ctx.globalAlpha = Math.min(1, item.life / 20); ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
function draw() { drawBackground(); drawTerrain(); drawCapybaras(); drawProjectile(); drawParticles(); }
function loop() { update(); draw(); requestAnimationFrame(loop); }
function cycleWeapon() { const names = Object.keys(weapons), index = names.indexOf(selectedWeapon); selectedWeapon = names[(index + 1) % names.length]; weaponSelect.value = selectedWeapon; updateHud(); }
function touchControl(action, active, remote = false) { if (!remote && window.WormsOnline && !WormsOnline.canControl(teamIndex)) return; if (!remote) window.WormsOnline?.send(action, active); const codes = { left: 'KeyA', right: 'KeyD', 'aim-up': 'ArrowUp', 'aim-down': 'ArrowDown' }; if (codes[action]) return active ? keys.add(codes[action]) : keys.delete(codes[action]); if (action === 'jump' && active) jump(); if (action === 'weapon' && active) cycleWeapon(); if (action === 'fire') { if (active && !turnLocked && !projectile && !gameOver) charging = true; else if (!active) shoot(); } if (action === 'skip' && active) skipTurn(); }

for (const [key, weapon] of Object.entries(weapons)) { const option = document.createElement('option'); option.value = key; option.textContent = `${weapon.icon} ${weapon.name} • N${weapon.level} • Dano ${weapon.damage}`; weaponSelect.append(option); }
weaponSelect.addEventListener('change', () => { selectedWeapon = weaponSelect.value; updateHud(); });
window.addEventListener('keydown', event => { if (['KeyA', 'KeyD', 'KeyW', 'ArrowUp', 'ArrowDown', 'Space', 'KeyQ'].includes(event.code)) event.preventDefault(); if (window.WormsOnline && !WormsOnline.canControl(teamIndex)) return; const actions={KeyA:'left',KeyD:'right',KeyW:'jump',ArrowUp:'aim-up',ArrowDown:'aim-down',Space:'fire',KeyQ:'weapon'}; if(actions[event.code]&&!event.repeat)WormsOnline?.send(actions[event.code],true); keys.add(event.code); if (event.code === 'KeyW' && !event.repeat) jump(); if (event.code === 'KeyQ' && !event.repeat) cycleWeapon(); if (event.code === 'Space' && !event.repeat && !turnLocked && !projectile && !gameOver) charging = true; });
window.addEventListener('keyup', event => { const actions={KeyA:'left',KeyD:'right',ArrowUp:'aim-up',ArrowDown:'aim-down',Space:'fire'}; if(actions[event.code])WormsOnline?.send(actions[event.code],false); keys.delete(event.code); if (event.code === 'Space') shoot(); });
document.querySelectorAll('[data-worm-control]').forEach(button => { const action = button.dataset.wormControl; button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touchControl(action, true); }); button.addEventListener('pointerup', () => touchControl(action, false)); button.addEventListener('pointercancel', () => touchControl(action, false)); button.addEventListener('pointerleave', () => touchControl(action, false)); });
document.querySelector('#restartWorms').addEventListener('click', resetGame); document.querySelector('#fullscreenWorms').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen()); document.addEventListener('fullscreenchange', () => { document.querySelector('#fullscreenWorms').textContent = document.fullscreenElement ? '⛶ Sair' : '⛶ Tela cheia'; });
addEventListener('worms-online-ready', event => resetGame(event.detail.seed));
addEventListener('worms-online-action', event => touchControl(event.detail.action, event.detail.active, true));
resetGame(); requestAnimationFrame(loop);
