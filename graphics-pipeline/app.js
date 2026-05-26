/*
 Pipeline Pursuit - simple HTML5 Canvas game showing:
 1. Application stage
 2. Geometry stage
 3. Rasterization stage
*/
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const stageLabel = document.getElementById("stage-label");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Shapes - model space
const SHIP = [
  { x: 0, y: -18 },
  { x: 14, y: 14 },
  { x: 0, y: 8 },
  { x: -14, y: 14 },
];

const GEM = [
  { x: 0, y: -12 },
  { x: 10, y: 0 },
  { x: 0, y: 12 },
  { x: -10, y: 0 },
];

const ASTEROID = [];
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const radius = 14 + (i % 2) * 4;
  ASTEROID.push({
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  });
}

// Game state
const keys = {};
const player = {
  x: WIDTH / 2,
  y: HEIGHT - 60,
  vx: 0,
  vy: 0,
  speed: 4.5,
  angle: 0,
  radius: 18,
};

let gems = [];
let asteroids = [];
let score = 0;
let lives = 3;
let gameOver = false;
let currentStage = "Idle";

// Application stage
function updateGame() {
  currentStage = "Application";
  if (gameOver) {
    if (keys.r || keys.R) resetGame();
    return;
  }
  handleInput();
  movePlayer();
  updateObjects();
  checkCollisions();
  spawnObjects();
}

function handleInput() {
  player.vx = 0;  //player.vx is the horizontal velocity of the player
  player.vy = 0;  //player.vy is the vertical velocity of the player
  if (keys.ArrowLeft) player.vx = -player.speed;
  if (keys.ArrowRight) player.vx = player.speed;
  if (keys.ArrowUp) player.vy = -player.speed;
  if (keys.ArrowDown) player.vy = player.speed;
}

function movePlayer() {
  player.x += player.vx;
  player.y += player.vy;  //player.vy is the vertical velocity of the player
  player.x = clamp(player.x, player.radius, WIDTH - player.radius);
  player.y = clamp(player.y, player.radius, HEIGHT - player.radius);
  if (player.vx || player.vy) {
    player.angle = Math.atan2(player.vy, player.vx) + Math.PI / 2;
  }
}

function updateObjects() {
  for (const gem of gems) {
    gem.pulse = gem.pulse + 0.06;//pulse is the pulse of the gem
  }
  for (const asteroid of asteroids) {
    asteroid.x += asteroid.vx;
    asteroid.y += asteroid.vy;
    asteroid.angle += asteroid.spin;
    if (asteroid.x < -30 || asteroid.x > WIDTH + 30) {
      asteroid.vx= -asteroid.vx;
    }
    if (asteroid.y < -30 || asteroid.y > HEIGHT + 30) {
      asteroid.vy= -asteroid.vy;
    }
  }
}

function checkCollisions() {
  for (let i = gems.length - 1; i >= 0; i--) {
    const gem = gems[i];
    if (
      distance(player.x, player.y, gem.x, gem.y) <
      player.radius + gem.radius
    ) {
      gems.splice(i, 1);
      score += 10;
    }
  }
  for (const asteroid of asteroids) {
    if (
      distance(player.x, player.y, asteroid.x, asteroid.y) <
      player.radius + asteroid.radius
    ) {
      lives -= 1;
      asteroid.x = Math.random() * WIDTH;
      asteroid.y = Math.random() * HEIGHT;
      if (lives <= 0) {
        gameOver = true;
      }
    }
  }
}

function spawnObjects() {
  if (gems.length < 4 && Math.random() < 0.02) {
    spawnGem();
  }
  if (asteroids.length < 3 && Math.random() < 0.008) {
    spawnAsteroid();
  }
}

function spawnGem() {
  gems.push({
    x: 40 + Math.random() * (WIDTH - 80),
    y: 40 + Math.random() * (HEIGHT - 120),
    angle: Math.random() * Math.PI * 2,
    radius: 14,
    pulse: Math.random() * Math.PI * 2,
  });
}

function spawnAsteroid() {
  const speed = 1.2 + Math.random() * 1.5;
  const angle = Math.random() * Math.PI * 2;
  asteroids.push({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.04,
    radius: 20,
    scale: 0.9 + Math.random() * 0.4,
  });
}

function resetGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  player.x = WIDTH / 2;
  player.y = HEIGHT - 60;
  gems = [];
  asteroids = [];
  for (let i = 0; i < 4; i++) spawnGem();
  for (let i = 0; i < 3; i++) spawnAsteroid();
}

// Geometry stage
function buildFrame() {
  currentStage = "Geometry";
  return {
    ship: transformShape(SHIP, player.x, player.y, player.angle, 1),
    gems: gems.map((gem) =>
      transformShape(
        GEM,
        gem.x,
        gem.y,
        gem.angle + gem.pulse * 0.1,
        1 + Math.sin(gem.pulse) * 0.15
      )
    ),
    asteroids: asteroids.map((asteroid) =>
      transformShape(
        ASTEROID,
        asteroid.x,
        asteroid.y,
        asteroid.angle,
        asteroid.scale
      )
    ),
  };
}

function transformShape(vertices, x, y, angle, scale) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = [];
  for (const v of vertices) {
    const sx = v.x * scale;
    const sy = v.y * scale;
    const px = sx * cos - sy * sin + x;
    const py = sx * sin + sy * cos + y;
    points.push({ x: px, y: py });
  }
  return points;
}

// Rasterization stage
function render(frame) {
  currentStage = "Rasterization";
  clearScreen();
  drawStars();
  frame.gems.forEach((shape, i) => {
    const gem = gems[i];
    drawPolygon(shape, "#3fb950", "#238636", 2);
    drawGlow(
      gem.x,
      gem.y,
      8 + Math.sin(gem.pulse) * 3,
      "rgba(63,185,80,0.35)"
    );
  });
  for (const asteroid of frame.asteroids) {
    drawPolygon(asteroid, "#6e7681", "#f85149", 2);
  }
  drawPolygon(frame.ship, "#79c0ff", "#1f6feb", 2);
  drawGlow(
    player.x,
    player.y - 22,
    6,
    "rgba(121,192,255,0.5)"
  );
  if (gameOver) {
    drawGameOver();
  }
}

function clearScreen() {
  ctx.fillStyle = "#010409";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawPolygon(points, fill, stroke, lineWidth = 1) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawGlow(x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawStars() {
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i++) {
    const x = (i * 137.5) % WIDTH;
    const y = (i * 89.3) % HEIGHT;

    ctx.fillRect(x, y, 1, 1);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f85149";
  ctx.font = "bold 42px Segoe UI";
  ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "18px Segoe UI";
  ctx.fillText(
    `Final score: ${score} - Press R to restart`,
    WIDTH / 2,
    HEIGHT / 2 + 30
  );
}

// Main loop
let lastTime = performance.now();
function gameLoop(now) {
  lastTime = now;
  updateGame();
  const frame = buildFrame();
  render(frame);
  updateHUD();
  requestAnimationFrame(gameLoop);
}
function updateHUD() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
  stageLabel.textContent = `Stage: ${currentStage}`;
}

// Utilities
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Input
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Start game
resetGame();
requestAnimationFrame(gameLoop);