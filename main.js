const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

const width = window.innerWidth;
const height = window.innerHeight;
const engine = Engine.create();
const { world } = engine;

const canvas = document.getElementById("gameCanvas");
const render = Render.create({
  element: document.body,
  engine,
  canvas,
  options: {
    width,
    height,
    wireframes: false,
    background: "#222"
  }
});

Render.run(render);
Runner.run(Runner.create(), engine);

// Spielfeld-Container
const wallThickness = 50;
const containerWidth = 400;
const containerHeight = 600;
const containerX = width / 2;
const containerY = height - containerHeight / 2;

let animationTime = 0;
let blinkToggle = false;
let quarterColors = [];

setInterval(() => {
  blinkToggle = !blinkToggle; // für 11
}, 150);

setInterval(() => {
  // Neue Farben für 13
  quarterColors = Array.from({ length: 4 }, () =>
    randomGray()
  );
}, 500);

function randomGray() {
  const val = Math.floor(Math.random() * 222) + 34; // von 0x22 bis 0xdd
  return `rgb(${val},${val},${val})`;
}

const walls = [
  Bodies.rectangle(containerX, containerY + containerHeight / 2, containerWidth, wallThickness, { isStatic: true }),
  Bodies.rectangle(containerX - containerWidth / 2, containerY, wallThickness, containerHeight, { isStatic: true }),
  Bodies.rectangle(containerX + containerWidth / 2, containerY, wallThickness, containerHeight, { isStatic: true }),
];
World.add(world, walls);

// Score & State
let score = 0;
let gameOver = false;
const gameOverLineY = containerY - containerHeight / 2 + 10;
let touchingLineTime = 0;

// Kugeln
const baseRadius = 10;
let currentBall = null;
let droppedBalls = [];
let nextQueue = [];

// Vorschau-Warteschlange auffüllen
function refillQueue() {
  while (nextQueue.length < 4) {
    nextQueue.push(Math.floor(Math.random() * 4) + 1);
  }
}

function spawnBall() {
  refillQueue();
  const num = nextQueue.shift();
  refillQueue();
  const radius = baseRadius * num;
  currentBall = Bodies.circle(containerX, 100, radius, {
    restitution: 0.5,
    render: { fillStyle: "#fff" }
  });
  currentBall.label = `ball-${num}`;
  currentBall.ballValue = num;
  Body.setStatic(currentBall, true);
  World.add(world, currentBall);
}

spawnBall();

// Steuerung
let canDrop = true;
let moveLeft = false;
let moveRight = false;

document.addEventListener("keydown", (e) => {
  if (!currentBall || gameOver) return;

  if (["ArrowLeft", "a", "A"].includes(e.key)) {
    moveLeft = true;
  } else if (["ArrowRight", "d", "D"].includes(e.key)) {
    moveRight = true;
  } else if (["ArrowDown", "ArrowUp", "s", "S", "w", "W"].includes(e.key)) {
    if (canDrop) {
      Body.setStatic(currentBall, false);
      droppedBalls.push(currentBall);
      currentBall = null;
      canDrop = false;
      setTimeout(() => {
        canDrop = true;
        if (!gameOver) spawnBall();
      }, 2000); // 2 Sekunden statt 5
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (["ArrowLeft", "a", "A"].includes(e.key)) {
    moveLeft = false;
  } else if (["ArrowRight", "d", "D"].includes(e.key)) {
    moveRight = false;
  }
});

// Smooth Bewegung
Events.on(engine, "beforeUpdate", () => {
  if (!currentBall || gameOver) return;

  const speed = 5;
  const minX = containerX - containerWidth / 2 + currentBall.circleRadius;
  const maxX = containerX + containerWidth / 2 - currentBall.circleRadius;

  if (moveLeft && currentBall.position.x > minX) {
    Body.translate(currentBall, { x: -speed, y: 0 });
  }
  if (moveRight && currentBall.position.x < maxX) {
    Body.translate(currentBall, { x: speed, y: 0 });
  }
});

// Kombination
Events.on(engine, "collisionStart", (event) => {
  const pairs = event.pairs;
  const merged = new Set();

  pairs.forEach(({ bodyA, bodyB }) => {
    const a = bodyA;
    const b = bodyB;

    if (!a.ballValue || !b.ballValue) return;
    if (a === currentBall || b === currentBall) return;
    if (merged.has(a.id) || merged.has(b.id)) return;

    if (a.ballValue === b.ballValue) {
      const newVal = a.ballValue + 1;
      const newRadius = baseRadius * newVal;

      const newBall = Bodies.circle(
        (a.position.x + b.position.x) / 2,
        (a.position.y + b.position.y) / 2,
        newRadius,
        {
          restitution: 0.5,
          render: { fillStyle: "#fff" }
        }
      );
      newBall.ballValue = newVal;
      newBall.label = `ball-${newVal}`;

      World.remove(world, a);
      World.remove(world, b);
      droppedBalls = droppedBalls.filter(ball => ball !== a && ball !== b);

      World.add(world, newBall);
      droppedBalls.push(newBall);

      merged.add(a.id);
      merged.add(b.id);

      score += newVal * newVal;
    }
  });
});

// Game Over
setInterval(() => {
  if (gameOver) return;

  const anyTouching = droppedBalls.some(ball =>
    ball.position.y - ball.circleRadius <= gameOverLineY
  );

  if (anyTouching) {
    touchingLineTime += 0.1;
    if (touchingLineTime >= 3) {
      gameOver = true;
      alert("Game Over! Dein Score: " + score);
    }
  } else {
    touchingLineTime = 0;
  }
}, 100);

// Designs
function drawBall(context, ball) {
  const { x, y } = ball.position;
  const angle = ball.angle;
  const r = ball.circleRadius;
  const val = ball.ballValue;

  context.save();
  context.translate(x, y);
  context.rotate(angle);

  function strokeOutline() {
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.stroke();
  }

  if (val === 1) {
    context.fillStyle = "#ff0";
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    strokeOutline();
  } else if (val === 2) {
    context.fillStyle = "#0f0";
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    strokeOutline();
  } else if (val === 3) {
    context.fillStyle = "#f00";
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    strokeOutline();
  } else if (val === 4) {
    context.fillStyle = "#00f";
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    strokeOutline();
  } else if (val === 5) {
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI);
    context.fillStyle = "#0bf";
    context.fill();
    context.beginPath();
    context.arc(0, 0, r, Math.PI, Math.PI * 2);
    context.fillStyle = "#09f";
    context.fill();
    strokeOutline();
  } else if (val === 6) {
    const colors = ["#f50", "#f10", "#f50", "#f10"];
    for (let i = 0; i < 4; i++) {
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r, i * Math.PI / 2, (i + 1) * Math.PI / 2);
      context.closePath();
      context.fillStyle = colors[i];
      context.fill();
    }
    strokeOutline();
  } else if (val === 7) {
    for (let i = 0; i < 12; i++) {
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6);
      context.closePath();
      context.fillStyle = i % 2 === 0 ? "#0f2" : "#0f6";
      context.fill();
    }
    strokeOutline();
  } else if (val === 8) {
    context.save();
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.clip();
    const stripeWidth = (2 * r) / 10;
    for (let i = 0; i < 10; i++) {
      context.fillStyle = i % 2 === 0 ? "#333" : "#ddd";
      context.fillRect(-r + i * stripeWidth, -r, stripeWidth, 2 * r);
    }
    context.restore();
    strokeOutline();
  } else if (val === 9) {
    const colors = ["#f00", "#ff0", "#0f0", "#0ff", "#00f", "#f0f"];
    for (let i = 0; i < 6; i++) {
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r, (i * Math.PI * 2) / 6, ((i + 1) * Math.PI * 2) / 6);
      context.closePath();
      context.fillStyle = colors[i];
      context.fill();
    }
    strokeOutline();
  } else if (val === 10) {
    const rings = 5;
    for (let i = rings; i > 0; i--) {
      context.beginPath();
      context.arc(0, 0, (r * i) / rings, 0, Math.PI * 2);
      context.fillStyle = i % 2 === 0 ? "#b7f" : "#a5f";
      context.fill();
    }
    strokeOutline();
  } else if (val === 11) {
    // Blinkendes Design
    context.fillStyle = blinkToggle ? "#f44" : "#44f";
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fill();
    strokeOutline();
  } else if (val === 12) {
    // Rotierende Drittelkreise
    const rotation = animationTime * 2 * Math.PI; // 1 Rotation/Sek
    const colors = ["#f00", "#0f0", "#00f"];
    for (let i = 0; i < 3; i++) {
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r, rotation + (i * 2 * Math.PI) / 3, rotation + ((i + 1) * 2 * Math.PI) / 3);
      context.closePath();
      context.fillStyle = colors[i];
      context.fill();
    }
    strokeOutline();
  } else if (val >= 13) {
    // Viertelkreise mit zufälligen Grautönen
    if (quarterColors.length < 4) {
      quarterColors = Array.from({ length: 4 }, () => randomGray());
    }
    for (let i = 0; i < 4; i++) {
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      context.closePath();
      context.fillStyle = quarterColors[i];
      context.fill();
    }
    strokeOutline();
  }  

  // Zahl
  context.font = `bold ${r}px Arial`;
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(val, 0, 0);

  context.restore();
}

// Render-Loop
Events.on(render, "afterRender", () => {
  const context = render.context;

  // Score
  context.font = "bold 24px Arial";
  context.fillStyle = "white";
  context.textAlign = "left";
  context.fillText("Score: " + score, 20, 40);

  // Linie
  context.strokeStyle = "#f33";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(containerX - containerWidth / 2, gameOverLineY);
  context.lineTo(containerX + containerWidth / 2, gameOverLineY);
  context.stroke();

  // Kugeln
  droppedBalls.forEach(ball => drawBall(context, ball));
  if (currentBall && currentBall.ballValue) drawBall(context, currentBall);

  // Preview
  const previewStartX = width - 420;
  const previewY = 100;
  const spacing = 120;

  nextQueue.forEach((val, i) => {
    const r = baseRadius * val;
    const posX = previewStartX + i * spacing;

    // Kugel
    context.save();
    context.translate(posX, previewY);
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.fillStyle = "#444";
    context.fill();
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.stroke();
    context.font = `bold ${r}px Arial`;
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(val, 0, 0);
    context.restore();

    // Pfeil
    if (i < nextQueue.length - 1) {
      context.font = "bold 32px Arial";
      context.fillStyle = "white";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("←", posX + spacing / 2, previewY);
    }
  });

  // Label
  context.font = "bold 20px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.fillText("Next", previewStartX + (nextQueue.length * spacing) / 2 - spacing / 2, previewY - 40);
  animationTime += 1 / 60; // ca. 60 FPS
});
