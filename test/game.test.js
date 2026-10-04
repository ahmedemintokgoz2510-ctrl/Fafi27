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

test('a touchline exit awards a throw-in to the team that did not touch the ball last', () => {
  const game = createGame(cfg, () => {});
  game.start(3, [false, false]);
  game.state = 'play';
  game.ball.owner = null; game.ball.x = 0; game.ball.z = game.HW + 0.2;
  game.ball.vx = game.ball.vy = game.ball.vz = 0; game.ball.last = 0;

  game.update(0.01);

  assert.equal(game.state, 'throwin');
  assert.equal(game.ball.owner.team, 1);
  assert.ok(Math.abs(game.ball.z - game.HW) < 0.5);
});

test('a defender last touching the ball over their goal line awards a corner', () => {
  const game = createGame(cfg, () => {});
  game.start(3, [false, false]);
  game.state = 'play';
  game.ball.owner = null; game.ball.x = game.HL + 0.2; game.ball.z = game.HW + 0.2;
  game.ball.vx = game.ball.vy = game.ball.vz = 0; game.ball.last = 1;

  game.update(0.01);

  assert.equal(game.state, 'corner');
  assert.equal(game.ball.owner.team, 0);
  assert.ok(Math.abs(game.ball.x - game.HL) < 1);
  assert.ok(Math.abs(game.ball.z - game.HW) < 1);
});

function chooseForwardPass(button, hold) {
  const game = createGame(cfg, () => {});
  game.start(3, [true, false]);
  for (let i = 0; i < 31; i++) game.update(0.05);
  const targets = [game.teams[0][10], game.teams[0][8], game.teams[0][7]];
  targets.forEach((player, index) => { player.x = 10 + index * 8; player.z = 0; });
  game.setMove(0, 1, 0);
  game.press(0, button, false, { hold });
  return { target: game.ball.target, targets };
}

test('one-touch passes pick the nearest forward teammate and charged passes pick farther', () => {
  for (const button of ['pass', 'through']) {
    const quick = chooseForwardPass(button, 0);
    const charged = chooseForwardPass(button, 1.2);
    assert.equal(quick.target, quick.targets[0], `${button} quick pass`);
    assert.equal(charged.target, charged.targets[2], `${button} charged pass`);
  }
});

test('a pressured shoulder contact can transfer possession to the defender', () => {
  const originalRandom = Math.random;
  const events = [];
  try {
    Math.random = () => 0;
    const game = createGame(cfg, (type) => events.push(type));
    game.start(3, [false, true]);
    for (let i = 0; i < 31; i++) game.update(0.05);

    const carrier = game.teams[0][9], defender = game.teams[1][9];
    game.ball.owner = carrier; game.ball.x = carrier.x; game.ball.z = carrier.z; game.ball.ownT = 1;
    carrier.protect = -1; carrier.vx = carrier.vz = 0;
    defender.x = carrier.x + 0.8; defender.z = carrier.z; defender.noGrab = 0;
    game.ctrl[1] = defender; game.autoLock[1] = 1;
    game.press(1, 'pressure', true);
    game.update(0.01);

    assert.equal(game.ball.owner, defender);
    assert.ok(events.includes('shoulder'));
  } finally {
    Math.random = originalRandom;
  }
});

test('a goalkeeper catches a reachable descending cross and holds it off the ground', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const game = createGame(cfg, () => {});
    game.start(3, [false, false]);
    game.state = 'play';
    const goalkeeper = game.teams[0][0];
    goalkeeper.x = -47; goalkeeper.z = 0; goalkeeper.noGrab = 0;
    game.ball.owner = null; game.ball.target = null;
    game.ball.x = -46.5; game.ball.y = 2.4; game.ball.z = 0;
    game.ball.vx = 1; game.ball.vy = -1.5; game.ball.vz = 0; game.ball.last = 1;

    game.update(0.01);

    assert.equal(game.ball.owner, goalkeeper);
    assert.ok(game.ball.y > 1);
    assert.equal(game.ball.vy, 0);
  } finally {
    Math.random = originalRandom;
  }
});

function cpuKickDecision(randomValue) {
  const originalRandom = Math.random;
  const events = [];
  try {
    Math.random = () => randomValue;
    const game = createGame(cfg, (type) => events.push(type));
    game.start(3, [false, false]);
    game.state = 'play';
    const carrier = game.teams[0][9], receiver = game.teams[0][10];
    carrier.protect = -1; carrier.bias = 0;
    receiver.x = 12; receiver.z = 0;
    game.teams[1].forEach((opponent, index) => { opponent.x = 30 + index; opponent.z = 25; });
    game.ball.owner = carrier; game.ball.x = carrier.x; game.ball.z = carrier.z; game.ball.ownT = 1.3;
    events.length = 0;
    game.update(0.05);
    return events.filter((type) => type === 'kick');
  } finally {
    Math.random = originalRandom;
  }
}

test('CPU ball-carrier decisions do not randomly pass in the same neutral situation', () => {
  assert.deepEqual(cpuKickDecision(0), cpuKickDecision(0.99));
});

test('an idle controlled player turns toward the ball instead of keeping its back to play', () => {
  const game = createGame(cfg, () => {});
  game.start(3, [true, false]);
  game.state = 'play';
  const player = game.teams[0][9];
  player.x = 0; player.z = 0; player.face = Math.PI;
  game.ctrl[0] = player; game.autoLock[0] = 1;
  game.ball.owner = null; game.ball.x = 10; game.ball.y = 0.48; game.ball.z = 0;
  game.ball.vx = game.ball.vy = game.ball.vz = 0;
  const before = Math.cos(player.face);

  game.update(0.05);

  assert.ok(Math.cos(player.face) > before);
});
