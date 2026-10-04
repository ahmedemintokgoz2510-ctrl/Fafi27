const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame } = require('../public/js/game.js');

const cfg = {
  formation: [
    { role: 'GK', x: -0.92, z: 0 },
    { role: 'DF', x: -0.62, z: -0.62 }, { role: 'DF', x: -0.66, z: -0.22 },
    { role: 'DF', x: -0.66, z: 0.22 }, { role: 'DF', x: -0.62, z: 0.62 },
    { role: 'MF', x: -0.38, z: -0.62 }, { role: 'MF', x: -0.4, z: -0.2 },
    { role: 'MF', x: -0.4, z: 0.2 }, { role: 'MF', x: -0.38, z: 0.62 },
    { role: 'FW', x: -0.2, z: -0.14 }, { role: 'FW', x: -0.2, z: 0.14 }
  ],
  teams: [
    {
      name: 'A', color: '#111111', players: [
        { name: 'A1', number: 1 }, { name: 'A2', number: 2 }, { name: 'A3', number: 3 },
        { name: 'A4', number: 4 }, { name: 'A5', number: 5 }, { name: 'A6', number: 6 },
        { name: 'A7', number: 7 }, { name: 'A8', number: 8 }, { name: 'A9', number: 9 },
        { name: 'A10', number: 10 }, { name: 'A11', number: 11 }
      ]
    },
    {
      name: 'B', color: '#222222', players: [
        { name: 'B1', number: 1 }, { name: 'B2', number: 2 }, { name: 'B3', number: 3 },
        { name: 'B4', number: 4 }, { name: 'B5', number: 5 }, { name: 'B6', number: 6 },
        { name: 'B7', number: 7 }, { name: 'B8', number: 8 }, { name: 'B9', number: 9 },
        { name: 'B10', number: 10 }, { name: 'B11', number: 11 }
      ]
    }
  ]
};

test('penalty award moves game into penalty state and places ball at the spot', () => {
  const game = createGame(cfg, () => {});
  game.start(3, [false, false]);

  game.awardPenalty(0);

  assert.equal(game.state, 'penalty');
  assert.equal(game.ball.owner && game.ball.owner.team, 0);
  assert.ok(Math.abs(game.ball.x - 39) < 1.5);
  assert.ok(Math.abs(game.ball.z) < 1.5);
});

test('free kick award keeps attack team in control and freezes the ball', () => {
  const game = createGame(cfg, () => {});
  game.start(3, [false, false]);

  game.awardFreeKick(1, 10, 4);

  assert.equal(game.state, 'freekick');
  assert.equal(game.ball.owner && game.ball.owner.team, 1);
  assert.ok(Math.abs(game.ball.x - 10) < 1.5);
  assert.ok(Math.abs(game.ball.z - 4) < 1.5);
});
