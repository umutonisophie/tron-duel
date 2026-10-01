const canvas = document.getElementById("tronCanvas");
const ctx = canvas.getContext("2d");
const msgElement = document.getElementById("message");

// Grid and scaling configuration
const UNIT = 10; // Size of each square trail unit
const ROWS = canvas.height / UNIT;
const COLS = canvas.width / UNIT;

let gameInterval;
let gameActive = false;
let scores = { p1: 0, p2: 0 };

// Setup playing grid tracker: 0 = empty, 1 = P1 trail, 2 = P2 trail
let grid = [];

class Player {
    constructor(x, y, dx, dy, color, id) {
        this.startX = x;
        this.startY = y;
        this.startDx = dx;
        this.startDy = dy;
        this.color = color;
        this.id = id;
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.dx = this.startDx;
        this.dy = this.startDy;
        this.nextDx = this.startDx;
        this.nextDy = this.startDy;
        this.dead = false;
    }

    move() {
        // Enforce buffered turn selections once per frame loop execution
        this.dx = this.nextDx;
        this.dy = this.nextDy;

        this.x += this.dx;
        this.y += this.dy;
    }

    drawHead() {
        ctx.fillStyle = "#ffffff"; // Make front of bike pop brightly
        ctx.fillRect(this.x * UNIT, this.y * UNIT, UNIT, UNIT);
    }
}

// Initialize Players (P1: Cyan, spawning left. P2: Magenta, spawning right)
const player1 = new Player(10, ROWS / 2, 1, 0, "#00f0ff", 1);
const player2 = new Player(COLS - 11, ROWS / 2, -1, 0, "#ff0055", 2);

function initGrid() {
    grid = Array(COLS).fill(null).map(() => Array(ROWS).fill(0));
}

function clearCanvas() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startLoop() {
    if (gameActive) return;
    // The grid and the canvas are separate state. Resetting only the grid would
    // leave the previous round's trails painted on screen, because nothing else
    // clears them once the game has started.
    clearCanvas();
    initGrid();
    player1.reset();
    player2.reset();
    msgElement.innerText = "Fight!";
    gameActive = true;
    gameInterval = setInterval(update, 70); // Control speed (lower value = faster game)
}

function update() {
    // 1. Record current positions as trails before moving forward
    grid[player1.x][player1.y] = player1.id;
    grid[player2.x][player2.y] = player2.id;

    // Draw trail step onto canvas
    ctx.fillStyle = player1.color;
    ctx.fillRect(player1.x * UNIT, player1.y * UNIT, UNIT, UNIT);
    ctx.fillStyle = player2.color;
    ctx.fillRect(player2.x * UNIT, player2.y * UNIT, UNIT, UNIT);

    // 2. Compute next movement step
    player1.move();
    player2.move();

    // 3. Collision validations
    let p1Crash = checkCollision(player1);
    let p2Crash = checkCollision(player2);

    // Self-head-on crash optimization
    if (player1.x === player2.x && player1.y === player2.y) {
        p1Crash = true;
        p2Crash = true;
    }

    if (p1Crash || p2Crash) {
        handleGameOver(p1Crash, p2Crash);
        return;
    }

    // 4. Render Head positions
    player1.drawHead();
    player2.drawHead();
}

function checkCollision(player) {
    // Boundary collision walls checks
    if (player.x < 0 || player.x >= COLS || player.y < 0 || player.y >= ROWS) {
        return true;
    }
    // Trail footprint lookup
    if (grid[player.x][player.y] !== 0) {
        return true;
    }
    return false;
}

function handleGameOver(p1Crashed, p2Crashed) {
    clearInterval(gameInterval);
    gameActive = false;

    if (p1Crashed && p2Crashed) {
        msgElement.innerText = "MUTUAL CRASH! It's a draw. Press Space to run again.";
    } else if (p1Crashed) {
        scores.p2++;
        document.getElementById("p2-score").innerText = `Player 2: ${scores.p2}`;
        msgElement.innerText = "PLAYER 2 WINS! Press Space to run again.";
    } else if (p2Crashed) {
        scores.p1++;
        document.getElementById("p1-score").innerText = `Player 1: ${scores.p1}`;
        msgElement.innerText = "PLAYER 1 WINS! Press Space to run again.";
    }
}

// Manage Inputs and protect against instantly flipping directions back into self
window.addEventListener("keydown", (e) => {
    // Some environments deliver synthetic events with no `key` at all, so guard
    // before calling string methods on it.
    const key = e.key || "";

    // Space and the arrow keys scroll the page by default, which yanks the
    // canvas out of view mid-round. The game owns these keys.
    if (key === " " || key === "Spacebar" || key.startsWith("Arrow")) {
        e.preventDefault();
    }

    if (!gameActive && (key === " " || key === "Spacebar")) {
        startLoop();
        return;
    }

    switch (key) {
        // Player 1 Control Vectors (WASD)
        case "w": case "W":
            if (player1.dy === 0) { player1.nextDx = 0; player1.nextDy = -1; startLoop(); }
            break;
        case "s": case "S":
            if (player1.dy === 0) { player1.nextDx = 0; player1.nextDy = 1; startLoop(); }
            break;
        case "a": case "A":
            if (player1.dx === 0) { player1.nextDx = -1; player1.nextDy = 0; startLoop(); }
            break;
        case "d": case "D":
            if (player1.dx === 0) { player1.nextDx = 1; player1.nextDy = 0; startLoop(); }
            break;

        // Player 2 Control Vectors (Arrow Keys)
        case "ArrowUp":
            if (player2.dy === 0) { player2.nextDx = 0; player2.nextDy = -1; startLoop(); }
            break;
        case "ArrowDown":
            if (player2.dy === 0) { player2.nextDx = 0; player2.nextDy = 1; startLoop(); }
            break;
        case "ArrowLeft":
            if (player2.dx === 0) { player2.nextDx = -1; player2.nextDy = 0; startLoop(); }
            break;
        case "ArrowRight":
            if (player2.dx === 0) { player2.nextDx = 1; player2.nextDy = 0; startLoop(); }
            break;
    }
});

// Structural baseline clear frame
clearCanvas();
