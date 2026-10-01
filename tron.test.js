// Headless test for the game logic in tron.js.
//
// The game is plain canvas JavaScript, so it is tested by loading tron.js
// against a minimal DOM stub rather than by driving a real browser. That keeps
// the suite dependency-free and fast while still exercising the actual game
// code, not a copy of it.
//
// Run with:  node tron.test.js
//
// Exits non-zero on failure, so it works in CI as-is.

const path = require("path");

const failures = [];
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures.push(name);
}

// A fresh game per scenario. tron.js keeps module-level state (the trail grid
// and its own `gameActive` flag), so scenarios that need to start from a
// pre-round state must get a freshly loaded module rather than reusing one.
function loadGame() {
  let painted = 0;

  function makeElement(id, initialText) {
    return {
      id,
      _t: initialText,
      set innerText(v) { this._t = v; },
      get innerText() { return this._t; },
      getContext() { return { fillStyle: "", fillRect() { painted++; } }; },
      width: 800,
      height: 600,
    };
  }

  const els = {
    tronCanvas: makeElement("tronCanvas", ""),
    message: makeElement("message", "Press Space to start"),
    "p1-score": makeElement("p1-score", "Player 1: 0"),
    "p2-score": makeElement("p2-score", "Player 2: 0"),
  };

  let keyHandler = null;
  global.document = { getElementById: (id) => els[id] || null };
  global.window = {
    addEventListener: (type, fn) => { if (type === "keydown") keyHandler = fn; },
  };

  // Replace the timers so a test can step the game loop deterministically
  // instead of waiting on wall-clock time.
  let tick = null;
  global.setInterval = (fn) => { tick = fn; return 1; };
  global.clearInterval = () => { tick = null; };

  // Drop the previous copy from the module cache so state does not leak between
  // scenarios.
  const modulePath = path.join(__dirname, "tron.js");
  delete require.cache[require.resolve(modulePath)];
  require(modulePath);

  return {
    els,
    keyHandler: () => keyHandler,
    press: (key) => keyHandler({ key, preventDefault() {} }),
    pressRaw: (event) => keyHandler(event),
    isRunning: () => tick !== null,
    runTicks: (n) => { for (let i = 0; i < n && tick; i++) tick(); },
    paintCount: () => painted,
  };
}

// --- Wiring -----------------------------------------------------------------
{
  const g = loadGame();
  check("keydown handler is registered", typeof g.keyHandler() === "function");
}

// --- Input handling ---------------------------------------------------------
// These run on a game that has not started. Note that steering a player also
// starts the loop, which is deliberate: the first key press begins play.
{
  const g = loadGame();
  let prevented = false;
  g.pressRaw({ key: "ArrowUp", preventDefault() { prevented = true; } });
  check("arrow keys are swallowed so the page does not scroll", prevented);
  check("an arrow-key press is enough to start play",
    g.els.message.innerText === "Fight!");

  const g2 = loadGame();
  check("an event with no key does not throw",
    (() => { try { g2.pressRaw({ preventDefault() {} }); return true; } catch { return false; } })());
}

// --- Starting a round -------------------------------------------------------
{
  const g = loadGame();
  g.press(" ");
  check("space starts a round", g.els.message.innerText === "Fight!");
  check("the game loop is running", g.isRunning());
}

// --- Crash detection and scoring -------------------------------------------
{
  const g = loadGame();
  g.press(" ");
  // Steer player 1 up so it alone reaches the top wall, leaving player 2 the
  // winner. This has to happen before any tick, or player 2 keeps running
  // forward and the crash stops being a clean single loss.
  g.press("w");
  g.runTicks(500);

  check("canvas is painted during play", g.paintCount() > 0);
  check("a lone crash resolves to a winner", /PLAYER \d WINS/.test(g.els.message.innerText));
  check("the winner's score is incremented",
    /Player \d: 1/.test(g.els["p1-score"].innerText + g.els["p2-score"].innerText));
  check("the game loop stops on game over", !g.isRunning());
}

// --- Restart clears the previous round --------------------------------------
{
  const g = loadGame();
  g.press(" ");
  g.press("w");
  g.runTicks(500);
  check("the round ended before restarting", !g.isRunning());

  const before = g.paintCount();
  g.press(" ");
  // clearCanvas() runs inside startLoop, so a restart must paint again.
  check("restarting a round clears the previous trails", g.paintCount() > before);
  check("the game loop is running again", g.isRunning());
}

console.log("");
if (failures.length) {
  console.log(`${failures.length} FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("All checks passed.");
