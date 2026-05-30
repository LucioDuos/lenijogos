const canvas = document.querySelector('#snakeGame');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const statusEl = document.querySelector('#snakeStatus');
const restartBtn = document.querySelector('#restartSnake');
const cell = 24;
const columns = canvas.width / cell;
const rows = canvas.height / cell;
let snake;
let food;
let direction;
let nextDirection;
let score;
let best = Number(localStorage.getItem('leni-snake-best') || 0);
let timer;
let running;

function randomFood() {
  let next;
  do next = { x: Math.floor(Math.random() * columns), y: Math.floor(Math.random() * rows) };
  while (snake.some((part) => part.x === next.x && part.y === next.y));
  return next;
}
function resetGame() {
  clearTimeout(timer);
  snake = [{x:12,y:12},{x:11,y:12},{x:10,y:12}]; food = randomFood();
  direction = {x:1,y:0}; nextDirection = direction; score = 0; running = true;
  scoreEl.textContent = score; bestEl.textContent = best; statusEl.textContent = 'Valendo!';
  draw(); schedule();
}
function setDirection(name) {
  const choices = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  const selected = choices[name];
  if (selected && (selected.x !== -direction.x || selected.y !== -direction.y)) nextDirection = selected;
}
function tick() {
  if (!running) return;
  direction = nextDirection;
  const head = {x:snake[0].x + direction.x,y:snake[0].y + direction.y};
  const crashed = head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows || snake.some((part) => part.x === head.x && part.y === head.y);
  if (crashed) { running = false; statusEl.textContent = 'Fim de jogo! Tente bater seu recorde.'; draw(); return; }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10; scoreEl.textContent = score; food = randomFood();
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('leni-snake-best', best); }
  } else snake.pop();
  draw(); schedule();
}
function schedule() { timer = setTimeout(tick, Math.max(58, 150 - score * 1.2)); }
function draw() {
  ctx.fillStyle = '#102d23'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for(let x=0;x<=canvas.width;x+=cell){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}
  for(let y=0;y<=canvas.height;y+=cell){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
  ctx.fillStyle='#ff6571'; ctx.beginPath(); ctx.arc(food.x*cell+cell/2,food.y*cell+cell/2,cell*.38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7eff82'; snake.forEach((part,index)=>{ctx.fillStyle=index?'#65de75':'#b4ff79';ctx.beginPath();ctx.roundRect(part.x*cell+2,part.y*cell+2,cell-4,cell-4,7);ctx.fill()});
  const head=snake[0];ctx.fillStyle='#173e2d';ctx.beginPath();ctx.arc(head.x*cell+9,head.y*cell+9,2,0,Math.PI*2);ctx.arc(head.x*cell+16,head.y*cell+9,2,0,Math.PI*2);ctx.fill();
  if(!running){ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 38px sans-serif';ctx.fillText('Fim de jogo',canvas.width/2,canvas.height/2)}
}
window.addEventListener('keydown',(event)=>{const map={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};if(map[event.code]){event.preventDefault();setDirection(map[event.code])}});
document.querySelectorAll('[data-direction]').forEach((button)=>button.addEventListener('pointerdown',()=>setDirection(button.dataset.direction)));
restartBtn.addEventListener('click',resetGame);
bestEl.textContent=best;resetGame();
