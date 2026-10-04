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

function takeHumanShot(stats, aimX = 0, aimZ = 1) {
  const shotCfg = structuredClone(cfg);
  shotCfg.teams[0].players[9].stats = { shooting: 70, power: 70, ...stats };
  const game = createGame(shotCfg, () => {});
  game.start(3, [true, false]);
  for (let i = 0; i < 31; i++) game.update(0.05);
  game.setMove(0, aimX, aimZ);
  game.update(0.05);
  game.press(0, 'shoot', true);
  game.press(0, 'shoot', false, { hold: 0.2 });
  return game;
}

test('higher shooting skill reduces aim error under the same conditions', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const lowSkill = takeHumanShot({ shooting: 40 });
    const highSkill = takeHumanShot({ shooting: 95 });
    const lowAngle = Math.atan2(lowSkill.ball.vz, lowSkill.ball.vx);
    const highAngle = Math.atan2(highSkill.ball.vz, highSkill.ball.vx);
    const aimedAngle = Math.PI / 2;

    assert.ok(Math.abs(highAngle - aimedAngle) < Math.abs(lowAngle - aimedAngle), `${lowAngle} ${highAngle} ${aimedAngle}`);
  } finally {
    Math.random = originalRandom;
  }
});

test('aiming across the player body adds curl that bends the ball flight', () => {
  const game = takeHumanShot({ shooting: 90 });
  const initialAngle = Math.atan2(game.ball.vz, game.ball.vx);
  const initialSpin = game.ball.spin;

  assert.notEqual(initialSpin, 0);
  for (let i = 0; i < 8; i++) game.update(0.05);

  const curvedAngle = Math.atan2(game.ball.vz, game.ball.vx);
  assert.ok(Math.abs(curvedAngle - initialAngle) > 0.005);
  assert.ok(Math.abs(game.ball.spin) < Math.abs(initialSpin));
});

test('an offside pass awards a free kick to the defending team when received', () => {
  const events = [];
  const game = createGame(cfg, (type) => events.push(type));
  game.start(3, [true, false]);
  for (let i = 0; i < 31; i++) game.update(0.05);

  const receiver = game.teams[0][10];
  receiver.x = 35; receiver.z = 0;
  game.teams[1].forEach((defender) => { defender.x = 20; });
  game.setMove(0, 1, 0);
  game.press(0, 'pass', false);

  assert.equal(game.ball.target, receiver);
  assert.equal(game.ball.offside, true);
  receiver.noGrab = 0;
  game.ball.x = receiver.x; game.ball.z = receiver.z;
  game.ball.vx = game.ball.vy = game.ball.vz = 0;
  game.update(0.01);

  assert.equal(game.state, 'freekick');
  assert.equal(game.ball.owner.team, 1);
  assert.ok(events.includes('offside'));
});
