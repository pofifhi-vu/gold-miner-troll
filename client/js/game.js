// =============================================
// Game Canvas - Gold Miner Troll Game
// =============================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let gameObjects = [];
let animFrame = null;
let hookAngle = 0;
let hookSwinging = true;
let hookExtending = false;
let hookY = 0;
let hookMaxY = 0;
let miningActive = false;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  spawnObjects();
}

function spawnObjects() {
  gameObjects = [];
  const cols = Math.ceil(canvas.width / 120);
  const rows = 4;
  const startY = 120;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = Math.random();
      let emoji, value;
      if (type < 0.15) { emoji = '💎'; value = 3; }
      else if (type < 0.35) { emoji = '🪙'; value = 2; }
      else if (type < 0.6) { emoji = '🪨'; value = 0; }
      else if (type < 0.75) { emoji = '💰'; value = 1; }
      else { emoji = '🪨'; value = 0; }

      gameObjects.push({
        x: c * 130 + Math.random() * 60 + 40,
        y: startY + r * 80 + Math.random() * 30,
        emoji, value,
        size: 26 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        caught: false,
      });
    }
  }
}

function drawBackground() {
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.25);
  skyGrad.addColorStop(0, '#0a1800');
  skyGrad.addColorStop(1, '#1a3a00');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.25);

  // Ground layers
  const groundStart = h * 0.22;
  const groundGrad = ctx.createLinearGradient(0, groundStart, 0, h);
  groundGrad.addColorStop(0, '#3E1F00');
  groundGrad.addColorStop(0.3, '#5C2E00');
  groundGrad.addColorStop(0.6, '#4a2200');
  groundGrad.addColorStop(1, '#2a1200');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundStart, w, h - groundStart);

  // Gold veins
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    const startX = (w / 8) * i + 30;
    ctx.moveTo(startX, groundStart + 20);
    ctx.bezierCurveTo(
      startX + 30, groundStart + h * 0.2,
      startX - 20, groundStart + h * 0.5,
      startX + 10, h
    );
    ctx.stroke();
  }
  ctx.restore();

  // Surface line
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth = 2;
  ctx.moveTo(0, groundStart);
  ctx.lineTo(w, groundStart);
  ctx.stroke();

  // Stars in sky
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 20; i++) {
    const x = (i * 137 + 50) % w;
    const y = (i * 73) % (h * 0.2);
    ctx.beginPath();
    ctx.arc(x, y + 5, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObjects(timestamp) {
  if (!ctx) return;
  gameObjects.forEach(obj => {
    if (obj.caught) return;
    const floatY = obj.y + Math.sin(timestamp / 1000 * obj.speed + obj.phase) * 3;

    ctx.font = `${obj.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow for gems
    if (obj.value >= 2) {
      ctx.save();
      ctx.shadowColor = obj.emoji === '💎' ? '#00BFFF' : '#FFD700';
      ctx.shadowBlur = 12;
      ctx.fillText(obj.emoji, obj.x, floatY);
      ctx.restore();
    } else {
      ctx.fillText(obj.emoji, obj.x, floatY);
    }
  });
}

function drawHook(timestamp) {
  if (!ctx) return;
  const w = canvas.width;
  const pivotX = w / 2;
  const pivotY = 55;
  const armLen = 50;

  if (hookSwinging) {
    hookAngle = Math.sin(timestamp / 800) * 0.45;
  }

  const hookTipX = pivotX + Math.sin(hookAngle) * armLen;
  const hookTipY = pivotY + Math.cos(hookAngle) * armLen;

  // Rope from pivot to hook tip
  ctx.beginPath();
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 3;
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(hookTipX, hookTipY);
  ctx.stroke();

  // If extending, draw extended rope
  if (hookExtending || hookY > 0) {
    ctx.beginPath();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(hookTipX, hookTipY);
    ctx.lineTo(hookTipX, hookTipY + hookY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hook emoji
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪝', hookTipX, hookTipY + hookY);
  } else {
    // Resting hook
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪝', hookTipX, hookTipY + 10);
  }
}

function drawMiner() {
  if (!ctx) return;
  const w = canvas.width;
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.fillText('⛏️', w / 2, 52);
}

function gameLoop(timestamp) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawObjects(timestamp);
  drawHook(timestamp);
  drawMiner();
  animFrame = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
  if (animFrame) cancelAnimationFrame(animFrame);
  resizeCanvas();
  animFrame = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
}

// Mining animation sequence
function playMiningAnimation(callback) {
  hookSwinging = false;
  hookExtending = true;
  const maxExtend = canvas.height * 0.55;
  let extending = true;

  const anim = setInterval(() => {
    if (extending) {
      hookY += 14;
      if (hookY >= maxExtend) {
        extending = false;
        setTimeout(() => {}, 400);
      }
    } else {
      hookY -= 10;
      if (hookY <= 0) {
        hookY = 0;
        hookExtending = false;
        hookSwinging = true;
        clearInterval(anim);
        callback();
      }
    }
  }, 16);
}

window.addEventListener('resize', resizeCanvas);
