# Tron Duel

A two-player arcade game in the style of Tron, built with plain HTML, CSS and
JavaScript on a single canvas. Two bikes leave light trails; whichever one hits
a wall or the other's trail first loses the round.

No framework, no build step, no dependencies. Open `tron.html` in a browser and
play.

## Playing

| | Up | Down | Left | Right |
|---|---|---|---|---|
| **Player 1** (cyan) | `W` | `S` | `A` | `D` |
| **Player 2** (magenta) | arrow keys | | | |

Press `Space` to start a round and again to restart after one ends. Scores
accumulate across rounds.

## How it works

`tron.js` keeps a 2D grid where `0` is empty, `1` is player 1's trail and `2` is
player 2's. On each tick the game paints the current positions, steps both
players forward, then checks each for a wall or trail collision. A head-on
collision where both land on the same cell is detected separately and scored as
a draw.

Two details worth knowing, because both were bugs:

**Turns are buffered, not applied immediately.** Each player has a `nextDx`/
`nextDy` that is copied into `dx`/`dy` once per tick. Applying the change
immediately would let a player press two keys between frames and reverse into
their own trail. The direction guard (`if (player1.dy === 0)`) blocks reversing
onto your own neck.

**`startLoop` clears the canvas, not just the grid.** These are separate pieces
of state. Resetting only the grid left the previous round's trails painted on
screen, because nothing else clears the canvas once play has begun.

## Tests

```bash
node tron.test.js
```

13 checks, no dependencies. The game is loaded against a minimal DOM stub and
the game loop is stepped synchronously, so the suite runs in milliseconds and
never waits on wall-clock time. It covers round startup, collision detection,
score increments, the game loop stopping on game over, and the canvas being
cleared on restart.

Each scenario loads a fresh copy of `tron.js`, because the trail grid and the
`gameActive` flag are module-level state that would otherwise leak between
tests — which is exactly the bug that made an earlier version of this suite
report false failures.

## Project layout

```
tron.html     page shell, canvas, scoreboard, controls help
tron.css      dark theme, neon glow, centred layout
tron.js       game loop, collision detection, scoring, input
tron.test.js  headless test suite
```

## Note

This is a standalone copy of the game that also lives inside
[`games_teamwork`](https://github.com/umutonisophie/games_teamwork) as a
Next.js route, where the logic is split into a pure `logic.js` module so it can
be unit tested. This version is the dependency-free original.
