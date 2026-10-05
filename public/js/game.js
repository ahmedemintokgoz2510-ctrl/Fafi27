// Fafi 27 - oyun mantığı (çizimden ve ağdan bağımsız)
// Koordinatlar: x = saha uzunluğu (-50..50), z = genişlik (-32..32). Takım 0 sağa (+x), takım 1 sola saldırır.
(function (root) {
  'use strict';
  const L = 100, W = 64, HL = L / 2, HW = W / 2, GW = 3.7;
  const BR = 0.2; // top yarıçapı (m). Gerçek top 0.11; oyuncu boyu ~2 m, ekranda görünsün diye ~2 kat.
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  function createGame(cfg, onEvent) {
    const emit = (t, d) => onEvent && onEvent(t, d || {});
    const B = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, offside: false, owner: null, target: null, last: 0, ownT: 0 };
    const G = {
      L, W, HL, HW, GW, BR, ball: B, players: [], teams: [[], []], score: [0, 0], time: 0,
      state: 'idle', stateT: 0, human: [false, false], ctrl: [null, null], chaser: [null, null],
      input: [{ x: 0, z: 0, charge: -1, sprint: false, pressure: false }, { x: 0, z: 0, charge: -1, sprint: false, pressure: false }], autoLock: [0, 0], conceded: 0, pressers: [[], []], stateAge: 0, aimKeeper: null
    };

    // Kalecinin kendi ceza sahası (16.5 x 40.3). Eliyle yalnızca burada oynayabilir.
    function inOwnBox(gk, x, z) { return Math.abs(x + gk.dir * HL) < 16.5 && Math.abs(z) < 20.15; }

    function mkPlayers() {
      G.players = []; G.teams = [[], []];
      for (let t = 0; t < 2; t++) {
        const dir = t === 0 ? 1 : -1;
        const formation = cfg.teams[t].formation || cfg.formation;
        formation.forEach((f, i) => {
            const identity = (cfg.teams[t].players || [])[i] || {};
            const stats = identity.stats || {};
            const p = {
              team: t, idx: i, role: f.role || identity.role || 'MF', name: identity.name || 'Oyuncu ' + (i + 1), number: identity.number || i + 1,
              dir, hx: f.x * HL * dir, hz: f.z * HW * dir, x: 0, z: 0, vx: 0, vz: 0,
              face: t === 0 ? 0 : Math.PI, noGrab: 0, protect: 0, bias: (100 - (Number(stats.passing) || 70)) * 0.006 + (i % 3) * 0.08, shootCd: 0, kickT: 0, kickSide: i % 2, diveT: 0, diveSide: 1, diveDur: 0.9, diveTilt: 1, diveLift: 0.3,
              slideT: 0, slideDuration: 0, slideCooldown: 0, slidePower: 0, slideX: 0, slideZ: 0, slideResolved: false,
              stamina: 1, burstT: 0, touchPhase: 0, runT: 0, rx: 0, rz: 0,
              pace: clamp(Number(stats.pace) || 75, 40, 99), shooting: clamp(Number(stats.shooting) || 70, 20, 99),
              passing: clamp(Number(stats.passing) || 70, 20, 99), defending: clamp(Number(stats.defending) || 70, 20, 99),
              power: clamp(Number(stats.power) || 70, 20, 99), preferredFoot: stats.preferredFoot || 'R'
            };
          G.players.push(p); G.teams[t].push(p);
        });
      }
    }

    function placeKickoff(kt) {
      G.players.forEach((p) => {
        p.x = p.hx; p.z = p.hz; p.vx = p.vz = 0; p.face = p.dir === 1 ? 0 : Math.PI;
        p.noGrab = p.team === kt ? 0 : 1.8; p.protect = 0; p.kickT = 0; p.diveT = 0;
        p.slideT = 0; p.slideCooldown = 0; p.slideResolved = false;
        p.runT = 0; p.burstT = 0;
      });
      const k = G.teams[kt][9];
      k.x = -k.dir * 0.95; k.z = 0; k.protect = 0.6;
      B.owner = k; B.target = null; B.x = 0; B.y = BR; B.z = 0; B.vx = B.vy = B.vz = 0; B.spin = 0; B.offside = false; B.ownT = 0; B.last = kt;
      G.input.forEach((i) => { i.charge = -1; i.sprint = false; i.pressure = false; });
      G.ctrl = [null, null];
      G.state = 'kickoff'; G.stateT = 1.5; G.aimKeeper = null;
      emit('kickoff');
    }

    function setSetPieceState(kind, team, x, z, face, player, eventType = kind) {
      const taker = player || nearestOf(G.teams[team], x, z, false) || G.teams[team][0];
      G.players.forEach((p) => {
        p.vx = 0; p.vz = 0; p.noGrab = p.team === team ? 0.25 : Math.max(p.noGrab, 1.0);
      });
      taker.face = face; taker.x = x - Math.cos(face) * 1.2; taker.z = z - Math.sin(face) * 1.2; taker.vx = 0; taker.vz = 0;
      taker.protect = 0.9; taker.noGrab = 0.8; B.owner = taker; B.target = null; B.x = x; B.y = kind === 'throwin' ? 1.8 : BR; B.z = z; B.vx = 0; B.vy = 0; B.vz = 0; B.spin = 0; B.offside = false; B.ownT = 0; B.last = team;
      G.ctrl[team] = taker; G.aimKeeper = null;
      G.state = kind; G.stateAge = 0; G.stateT = kind === 'corner' || kind === 'throwin' || kind === 'goalkick' ? 8 : 1.6; emit(eventType, { team, player: taker.number, x, z });
    }

    G.awardPenalty = function (team, player) {
      const attacking = team ?? 0;
      const x = attacking === 0 ? HL - 11 : -HL + 11;
      const face = attacking === 0 ? 0 : Math.PI;
      const candidates = G.teams[attacking].slice().sort((a, b) => (b.shooting + b.power) - (a.shooting + a.power));
      const taker = player ? G.teams[attacking].find((p) => p.number === player) || candidates[0] : candidates[0];
      setSetPieceState('penalty', attacking, x, 0, face, taker);
    };

    G.awardFreeKick = function (team, x, z, player, eventType = 'freekick') {
      const attacking = team ?? 0;
      const spotX = clamp(x ?? G.ball.x, -HL + 4, HL - 4);
      const spotZ = clamp(z ?? G.ball.z, -HW + 4, HW - 4);
      const face = attacking === 0 ? Math.atan2(0 - spotZ, HL - spotX) : Math.atan2(0 - spotZ, -HL - spotX);
      const taker = player ? G.teams[attacking].find((p) => p.number === player) || G.teams[attacking][0] : nearestOf(G.teams[attacking], spotX, spotZ, false) || G.teams[attacking][0];
      setSetPieceState('freekick', attacking, spotX, spotZ, face, taker, eventType);
    };

    G.awardThrowIn = function (team, x, z) {
      const side = z < 0 ? -1 : 1;
      const spotX = clamp(x, -HL + 2, HL - 2), spotZ = side * HW;
      const taker = nearestOf(G.teams[team], spotX, spotZ, false);
      setSetPieceState('throwin', team, spotX, spotZ, -side * Math.PI / 2, taker);
    };

    // Aut (kale vuruşu): top kale alanında yerde, kaleci vuruşu kullanır.
    G.awardGoalKick = function (team, side) {
      const spotX = side * (HL - 5.5), face = side === 1 ? Math.PI : 0;
      setSetPieceState('goalkick', team, spotX, 0, face, G.teams[team][0]);
    };

    G.awardCorner = function (team, xSide, zSide) {
      const spotX = (xSide < 0 ? -1 : 1) * (HL - 0.6);
      const spotZ = (zSide < 0 ? -1 : 1) * (HW - 0.6);
      const taker = nearestOf(G.teams[team], spotX, spotZ, true);
      setSetPieceState('corner', team, spotX, spotZ, Math.atan2(-spotZ, -spotX), taker);
    };

    G.start = function (minutes, human) {
      G.score = [0, 0]; G.time = minutes * 60; G.human = human || [true, true]; G.aimKeeper = null;
      mkPlayers(); placeKickoff(0);
    };
    G.setMove = (t, x, z) => { G.input[t].x = x; G.input[t].z = z; };

    // ---------- vuruşlar ----------
    function kick(p, dx, dz, speed, jitter, lift = 0, spin = 0) {
      let a = Math.atan2(dz, dx) + (jitter ? rand(-jitter, jitter) : 0);
      B.vx = Math.cos(a) * speed; B.vy = lift; B.vz = Math.sin(a) * speed;
      B.spin = clamp(spin, -2.2, 2.2); B.offside = false;
      B.owner = null; B.target = null; B.last = p.team; p.noGrab = 0.5; p.kickT = 0.42;
      emit('kick', { team: p.team, speed });
    }

    function isOffsideAtPass(p, receiver) {
      const progress = receiver.x * p.dir;
      if (progress <= 0) return false;
      const defenders = G.teams[1 - p.team].map((player) => player.x * p.dir).sort((a, b) => b - a);
      const line = Math.max(B.x * p.dir, defenders[1] ?? -HL);
      return progress > line + 0.35;
    }

    function doPass(p, ax, az, ai, power = 0, loft = false) {
      let m = Math.hypot(ax, az);
      if (m < 0.3) { ax = Math.cos(p.face); az = Math.sin(p.face); m = 1; }
      ax /= m; az /= m;
      let best = null, bs = -9;
      for (const q of G.teams[p.team]) {
        if (q === p) continue;
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d < 4 || d > 58) continue;
        const c = (dx * ax + dz * az) / d;
        if (c < 0.5) continue;
        let s = c * 2 - d * 0.02 + power * d * 0.035;
        if (ai) {
          s += (q.x - p.x) * p.dir * 0.015;
          for (const o of G.teams[1 - p.team]) {
            const t = clamp(((o.x - p.x) * dx + (o.z - p.z) * dz) / (d * d), 0, 1);
            if (Math.hypot(p.x + dx * t - o.x, p.z + dz * t - o.z) < 2.2) { s -= 1.2; break; }
          }
        }
        if (s > bs) { bs = s; best = q; }
      }
      if (!best) { if (ai) return false; kick(p, ax, az, 18 + power * 10, 0.02 * clamp(1.45 - p.passing / 100, 0.35, 1.05), loft ? 7 + power * 4 : 0); return true; }
      const d = dist(p, best);
      const speed = clamp((d * 1.3 + 9) * (1 + power * 0.4) * (1 + (p.passing - 72) * 0.006), 14, 48);
      kick(p, best.x + best.vx * 0.3 - p.x, best.z + best.vz * 0.3 - p.z, speed, 0.03 * clamp(1.45 - p.passing / 100, 0.35, 1.05), loft ? 7 + power * 4 : 0);
      B.target = best; B.offside = isOffsideAtPass(p, best);
      return true;
    }

    function doThrough(p, ax, az, power, ai = false) {
      let length = Math.hypot(ax, az);
      if (length < 0.3) { ax = Math.cos(p.face); az = Math.sin(p.face); length = 1; }
      ax /= length; az /= length;
      let best = null, bestScore = -9;
      for (const teammate of G.teams[p.team]) {
        if (teammate === p || teammate.role === 'GK') continue;
        const dx = teammate.x - p.x, dz = teammate.z - p.z, distance = Math.hypot(dx, dz);
        if (distance < 6 || distance > 60) continue;
        const alignment = (dx * ax + dz * az) / distance;
        if (alignment < 0.35) continue;
        const score = alignment * 2 + (teammate.x - p.x) * p.dir * 0.003 - distance * 0.02 + power * distance * 0.035;
        if (score > bestScore) { bestScore = score; best = teammate; }
      }
      if (!best) {
        if (!ai) kick(p, ax, az, 20 + power * 14, 0.02 * clamp(1.45 - p.passing / 100, 0.35, 1.05));
        return !ai;
      }
      const lead = clamp(dist(p, best) * 0.4 + 3, 6, 15);
      const targetX = clamp(best.x + p.dir * lead * 0.8 + ax * lead * 0.2, -HL + 3, HL - 3);
      const targetZ = clamp(best.z + az * lead * 0.5, -HW + 3, HW - 3);
      const speed = clamp(Math.hypot(targetX - p.x, targetZ - p.z) * 1.25 + 8, 16, 46) * (1 + power * 0.25) * (1 + (p.passing - 72) * 0.005);
      kick(p, targetX - p.x, targetZ - p.z, speed, 0.02 * clamp(1.45 - p.passing / 100, 0.35, 1.05));
      B.target = best; B.offside = isOffsideAtPass(p, best); best.runT = 2.2; best.rx = targetX; best.rz = targetZ;
      return true;
    }

    function doCross(p, power) {
      const targetX = p.dir * (HL - 12), targetZ = -Math.sign(p.z || 1) * 8;
      const dx = targetX - p.x, dz = targetZ - p.z;
      const speed = clamp(Math.hypot(dx, dz) * 0.48 + 16, 22, 36) * (1 + power * 0.2);
      kick(p, dx, dz, speed, 0.02 * clamp(1.45 - p.passing / 100, 0.35, 1.05), 9 + power * 4);
      let receiver = null, nearest = 1e9;
      for (const teammate of G.teams[p.team]) {
        if (teammate === p) continue;
        const distance = Math.hypot(teammate.x - targetX, teammate.z - targetZ);
        if (distance < nearest) { nearest = distance; receiver = teammate; }
      }
      B.target = receiver; B.offside = receiver ? isOffsideAtPass(p, receiver) : false;
    }

    // PES tarzı şut: yön çubuğu direklere göre nişan alır (yardımlı), basılı tutma gücü belirler,
    // yukarı kaydırma (loft) falsolu/aşırtma şut verir. Fazla şarj (>%88) topu üste yollar.
    function aimAtGoal(p, ax, az, strength = 0.85) {
      const goalX = p.dir * HL, gdx = goalX - p.x, gdz = -p.z, gd = Math.hypot(gdx, gdz) || 1;
      const toGoal = (ax * gdx + az * gdz) / gd;
      if (toGoal > 0.35 && gd < 48 && ax * p.dir > 0.05) {
        const zHit = p.z + az * (gdx / ax);
        if (Math.abs(zHit) < GW + 7) {
          const tz = clamp(zHit, -(GW - 0.9), GW - 0.9), w = clamp((toGoal - 0.35) / 0.45, 0, 1) * strength;
          const nx = gdx, nz = tz - p.z, nl = Math.hypot(nx, nz) || 1;
          ax = ax * (1 - w) + nx / nl * w; az = az * (1 - w) + nz / nl * w;
        }
      }
      return [ax, az, gd];
    }

    function doShoot(p, charge, ai, loft = false, acro = false) {
      const goalX = p.dir * HL;
      let ax, az;
      if (ai) { ax = goalX - p.x; az = rand(-(GW - 0.8), GW - 0.8) - p.z; }
      else {
        const i = G.input[p.team]; ax = i.x; az = i.z;
        let m = Math.hypot(ax, az);
        if (m < 0.3) { ax = Math.cos(p.face); az = Math.sin(p.face); m = 1; }
        ax /= m; az /= m;
      }
      let gd;
      if (!ai) [ax, az, gd] = aimAtGoal(p, ax, az); else gd = Math.hypot(goalX - p.x, p.z);
      const air = loft;
      const over = Math.max(0, charge - 0.88) / 0.12;
      const shotPower = 1 + (p.shooting - 72) * 0.012 + (p.power - 72) * 0.008;
      const farPenalty = 1 + Math.max(0, gd - 26) / 55;
      const aimError = (0.02 + 0.04 * charge + 0.07 * over) * clamp(1.45 - p.shooting / 100, 0.35, 1.05) * farPenalty * (acro ? 1.5 : 1);
      const baseSpeed = air ? 21 + 14 * charge : 27 + 25 * charge;
      const curve = clamp(Math.cos(p.face) * az - Math.sin(p.face) * ax, -1, 1) * (0.7 + p.shooting / 100) * (air ? 1.8 : 1.2);
      const lift = air ? 5.5 + charge * 4.5 : 0.7 + charge * 1.7 + over * 6;
      kick(p, ax, az, baseSpeed * shotPower * (acro ? 1.08 : 1), aimError, lift, curve);
      p.shootCd = 1;
      if (acro) { p.acroT = 0.8; p.kickT = 0.5; emit('acro', { team: p.team, player: p.number }); }
    }

    // Havadaki/yerdeki serbest topa ilk vuruş (vole, röveşata): şut tuşuna basınca top yakındaysa
    function tryVolley(p) {
      if (B.owner || p.shootCd > 0 || p.noGrab > 0 || p.slideT > 0) return false;
      if (dist(p, B) > 2.7 || B.y > 3.1) return false;
      if (Math.hypot(B.vx, B.vz) > 38) return false;
      const high = B.y > 1.5;
      doShoot(p, high ? 0.82 : 0.7, false, false, high);
      return true;
    }

    // ---------- aut / taç / korner: parmakla düz çekilen vuruş ----------
    // Yön = parmağın çekildiği yön (tahta görünümünde), güç = çekme uzunluğu (0..1).
    // Taç: gerçekçi el atışı (9-22 m/s, kısa kavis). Aut: uzun top. Korner: ortalama.
    function launchRestart(p, kind, ax, az, power) {
      const m = Math.hypot(ax, az) || 1; ax /= m; az /= m;
      power = clamp(power, 0, 1);
      if (kind === 'throwin') {
        const inward = B.z > 0 ? -1 : 1;
        if (az * inward < 0.2) { az = inward * 0.2; const n = Math.hypot(ax, az); ax /= n; az /= n; }
        kick(p, ax, az, 9 + power * 13, 0, 4 + power * 2.5);
      } else if (kind === 'corner') {
        kick(p, ax, az, 17 + power * 17, 0.012, 7.5 + power * 4.5);
      } else { // goalkick / kaleci dağıtımı
        kick(p, ax, az, 14 + power * 24, 0.015, 5 + power * 8);
      }
    }

    // CPU ya da süre dolunca: otomatik vuruş
    function autoRestart(taker, kind) {
      if (kind === 'corner') {
        doPass(taker, taker.dir * (HL - 8) - taker.x, -taker.z, false, 0.45, true);
      } else if (kind === 'throwin') {
        const inward = B.z > 0 ? -1 : 1;
        let best = null, bd = 1e9;
        for (const q of G.teams[taker.team]) {
          if (q === taker || q.role === 'GK') continue;
          const d = dist(taker, q); if (d < 4 || d > 22) continue;
          if ((q.z - taker.z) * inward < 1) continue;
          const score = Math.abs(d - 11); if (score < bd) { bd = score; best = q; }
        }
        if (best) {
          const d = dist(taker, best);
          kick(taker, best.x - taker.x, best.z - taker.z, clamp(d * 0.9 + 5, 9, 22), 0.01, 4.2);
          B.target = best;
        } else launchRestart(taker, 'throwin', taker.dir * 0.4, inward, 0.35);
      } else {
        doPass(taker, taker.dir, 0, true, 0.6, true) || kick(taker, taker.dir, 0, 28, 0.05, 6);
      }
      B.offside = false;
      if (G.state !== 'play') G.state = 'play';
      G.aimKeeper = null;
      emit('restartEnd');
    }

    // Telefondan gelen "parmağı düz çek" vuruşu
    G.restartKick = function (t, ax, az, power) {
      if (!G.human[t]) return false;
      const taker = B.owner, kind = G.state;
      if (!taker || taker.team !== t) return false;
      const keeperHold = kind === 'play' && taker.role === 'GK' && G.aimKeeper === taker;
      if (!keeperHold && kind !== 'corner' && kind !== 'throwin' && kind !== 'goalkick') return false;
      if (Math.hypot(ax, az) < 0.2) return false;
      launchRestart(taker, keeperHold ? 'goalkick' : kind, ax, az, power);
      B.offside = false; G.aimKeeper = null;
      G.state = 'play'; emit('restartEnd');
      return true;
    };

    G.press = function (t, btn, down, options = {}) {
      const inp = G.input[t];
      if (!G.human[t]) return;
      if (G.state !== 'play') {
        if ((G.state === 'penalty' || G.state === 'freekick') && !down && btn === 'shoot') {
          const p = G.ctrl[t];
          if (p && B.owner === p) {
            const charge = clamp(Number(options.hold) || 0, 0, 1.2) / 1.2;
            doShoot(p, charge, false, !!options.loft);
            G.state = 'play'; emit('restartEnd'); emit('whistle');
          }
        }
        return;
      }
      if (btn === 'sprint') {
        inp.sprint = !!down;
        const carrier = G.ctrl[t];
        if (down && carrier && B.owner === carrier && carrier.stamina > 0.25) carrier.burstT = 0.6;
        return;
      }
      if (btn === 'pressure') { inp.pressure = !!down; return; }
      const p = G.ctrl[t];
      if (!p) return;
      if (btn === 'pass') {
        if (down || B.owner !== p) return;
        const power = clamp(Number(options.hold) || 0, 0, 1.2) / 1.2;
        const loft = !!options.loft || power > 0.42;
        if (loft && p.x * p.dir > 13 && Math.abs(p.z) > HW * 0.3) doCross(p, power);
        else doPass(p, inp.x, inp.z, false, power, loft);
      }
      else if (btn === 'through') { if (down || B.owner !== p) return; doThrough(p, inp.x, inp.z, clamp(Number(options.hold) || 0, 0, 1.2) / 1.2); }
      else if (btn === 'shoot') {
        if (down) { if (B.owner === p) inp.charge = 0; else tryVolley(p); }
        else { if (inp.charge >= 0 && B.owner === p) doShoot(p, inp.charge, false, !!options.loft); inp.charge = -1; }
      } else if (btn === 'slide') {
        if (down || p.slideCooldown > 0 || p.slideT > 0 || B.owner === p) return;
        let target = null, targetScore = 1e9;
        for (const opponent of G.teams[1 - t]) {
          const score = dist(p, opponent) - (B.owner === opponent ? 0.8 : 0);
          if (score < targetScore) { target = opponent; targetScore = score; }
        }
        if (!target || dist(p, target) > 5.2 || dist(p, B) > 6.2) return;
        const dx = (B.owner === target ? target.x : B.x) - p.x;
        const dz = (B.owner === target ? target.z : B.z) - p.z;
        const length = Math.hypot(dx, dz);
        if (length < 0.01) return;
        p.slidePower = clamp(Number(options.hold) || 0, 0, 1.2) / 1.2;
        p.slideDuration = 0.34 + p.slidePower * 0.2;
        p.slideT = p.slideDuration;
        p.slideCooldown = 0.75 + p.slidePower * 0.8;
        p.slideX = dx / length; p.slideZ = dz / length; p.slideResolved = false;
        emit('slide', { team: t, power: p.slidePower });
      } else if (btn === 'switch' && down) {
        let best = null, bd = 1e9;
        for (const q of G.teams[t]) {
          if (q === p) continue;
          const d = dist(q, B) + (q.role === 'GK' ? 6 : 0);
          if (d < bd) { bd = d; best = q; }
        }
        if (best) { G.ctrl[t] = best; G.autoLock[t] = 1; }
      }
    };

    // ---------- hareket ----------
    const accel = (p, dx, dz, dt, rate = 9) => { const k = Math.min(1, rate * dt); p.vx += (dx - p.vx) * k; p.vz += (dz - p.vz) * k; };
    const turn = (p, a, dt, rate) => { p.face += clamp(wrap(a - p.face), -rate * dt, rate * dt); p.face = wrap(p.face); };
    function moveTo(p, tx, tz, sp, dt) {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      const s = d < 2.5 ? sp * d / 2.5 : sp, k = d > 0.001 ? s / d : 0;
      accel(p, dx * k, dz * k, dt);
      if (d > 0.6) turn(p, Math.atan2(dz, dx), dt, 10);
    }

    function pickCtrl(t) {
      const o = B.owner;
      if (o && o.team === t) { G.ctrl[t] = o; return; }
      const cur = G.ctrl[t];
      if (cur && G.autoLock[t] > 0) return;
      let best = null, bd = 1e9;
      for (const p of G.teams[t]) {
        const d = dist(p, B) + (p.role === 'GK' ? 6 : 0);
        if (d < bd) { bd = d; best = p; }
      }
      if (cur && dist(cur, B) + (cur.role === 'GK' ? 6 : 0) <= bd + 2.5) return;
      G.ctrl[t] = best;
    }

    function chaserFor(t) {
      G.pressers[t] = [];
      if (G.human[t] && G.input[t].pressure && B.owner && B.owner.team !== t) {
        G.pressers[t] = G.teams[t].filter((p) => p.role !== 'GK' && G.ctrl[t] !== p)
          .sort((a, b) => dist(a, B.owner) - dist(b, B.owner)).slice(0, 2);
      }
      const previous = G.chaser[t];
      G.chaser[t] = null;
      if (B.owner && B.owner.team === t) return;
      let best = null, bd = 1e9;
      for (const p of G.teams[t]) {
        if (p.role === 'GK' || (G.human[t] && G.ctrl[t] === p)) continue;
        const d = dist(p, B);
        if (d < bd) { bd = d; best = p; }
      }
      if (previous && previous.role !== 'GK' && !(G.human[t] && G.ctrl[t] === previous) && dist(previous, B) <= bd + 1.2) best = previous;
      G.chaser[t] = best;
    }

    function humanStep(p, dt) {
      const inp = G.input[p.team], m = Math.hypot(inp.x, inp.z);
      let dx = 0, dz = 0;
      const chasesBall = inp.pressure && (!B.owner || B.owner.team !== p.team);
      const canSprint = inp.sprint && p.stamina > 0.08;
      const paceFactor = 0.82 + (p.pace / 100) * 0.46;
      const sp = 6.4 * paceFactor * (canSprint ? 1.42 : chasesBall ? 1.1 : 1) * (B.owner === p ? 0.92 : 1) * (inp.charge >= 0 ? 0.7 : 1) * (0.82 + 0.18 * p.stamina) * (p.burstT > 0 ? 1.15 : 1);
      p.stamina = clamp(p.stamina + (canSprint && m > 0.12 ? -0.1 : !inp.sprint ? 0.04 : 0) * dt, 0, 1);
      if (chasesBall) {
        const tx = B.x + B.vx * 0.18 - p.x, tz = B.z + B.vz * 0.18 - p.z;
        const d = Math.hypot(tx, tz);
        if (d > 0.12) { dx = tx / d * sp; dz = tz / d * sp; turn(p, Math.atan2(tz, tx), dt, 14); }
      } else if (m > 0.12) { const k = Math.min(m, 1) / m; dx = inp.x * k * sp; dz = inp.z * k * sp; }
      accel(p, dx, dz, dt, canSprint ? 5.2 : 8.5);
      if (!chasesBall && m > 0.12) turn(p, Math.atan2(inp.z, inp.x), dt, canSprint ? 8 : 13);
      else if (!chasesBall && m <= 0.12 && B.owner !== p) turn(p, Math.atan2(B.z - p.z, B.x - p.x), dt, 6);
      if (inp.charge >= 0) inp.charge = Math.min(1, inp.charge + dt / 0.9);
    }

    function aiStep(p, dt) {
      const dir = p.dir, own = B.owner, hasBall = own === p, teamHas = own && own.team === p.team;
      const pf = (0.84 + (p.pace / 100) * 0.38) / 1.14; // oyuncuya özel hız çarpanı
      let tx = p.x, tz = p.z, sp = 6.0;
      if (p.runT > 0 && !hasBall && p.role !== 'GK') { p.runT -= dt; moveTo(p, p.rx, p.rz, 7.6 * pf, dt); return; }
      if (p.role === 'GK') {
        const gx = -dir * HL;
        const away = Math.max(2, (B.x - gx) * dir);
        tx = gx + dir * clamp(1 + away * 0.06, 1.2, 4.2); tz = clamp(B.z * clamp(GW / Math.max(away, 8) * 1.6, 0.2, 0.55), -GW + 0.6, GW - 0.6); sp = 5.5;
        if (hasBall) {
          tx = p.x; tz = p.z; sp = 0;
          if (B.ownT > 0.9 && !doPass(p, dir, 0, true)) kick(p, dir, 0, 28, 0.05);
        } else if (B.vx * dir < -5) {
          const t = (gx - B.x) / B.vx;
          if (t < 1.6) {
            tz = clamp(B.z + B.vz * t, -GW - 2, GW + 2); tx = gx + dir * 1.4; sp = 8.5;
            // yan köşeye giden şutta kaleci yatay uçar
            const lat = tz - p.z;
            if (p.diveT <= 0 && !own && t > 0.05 && t < 0.7 && Math.abs(lat) > 0.9 && Math.hypot(B.vx, B.vz) > 9) {
              p.diveT = p.diveDur = 0.9; p.diveSide = Math.sign(lat) || 1; p.diveTilt = clamp(Math.abs(lat) / 2.4, 0.45, 1);
              const by = B.y + B.vy * t - 9.5 * t * t; p.diveLift = clamp((by - 0.5) / 2, 0, 0.9);
            }
            if (p.diveT > 0.15) sp = 12;
          }
        } else if (!own && B.y > 1 && B.vy < 0 && Math.abs(B.x - gx) < 18 && Math.abs(B.z) < 19) {
          const t = clamp((B.y - 1.2) / -B.vy, 0, 1.1);
          tx = gx + dir * clamp((B.x + B.vx * t - gx) * dir, 1.4, 14);
          tz = clamp(B.z + B.vz * t, -GW - 1.2, GW + 1.2); sp = 7;
        } else if (!own && Math.hypot(B.x - gx, B.z) < 15 && Math.hypot(B.vx, B.vz) < 9) { tx = B.x; tz = B.z; sp = 7.5; }
      } else if (hasBall) {
        const goalX = dir * HL, dg = Math.hypot(goalX - p.x, p.z);
        let near = 1e9;
        for (const o of G.teams[1 - p.team]) near = Math.min(near, dist(o, p));
        const shotWindow = dg < 17 || (dg < 25 && Math.abs(p.z) < 10);
        if (shotWindow && p.shootCd <= 0 && B.ownT > 0.45 && (near > 3.6 || dg < 11)) {
          doShoot(p, clamp((27 - dg) / 24 + (p.shooting - 70) / 250, 0.2, 0.9), true); return;
        }
        if (B.ownT > 0.45 + p.bias && (near < 4.5 || B.ownT > 2.3 + p.bias) && doPass(p, dir, 0, true)) return;
        tx = goalX; tz = clamp(p.z * 0.5, -12, 12); sp = 6.4;
      } else if (G.chaser[p.team] === p || G.pressers[p.team].includes(p)) {
        tx = B.x + B.vx * 0.25; tz = B.z + B.vz * 0.25; sp = 7.0;
      } else {
        const prog = B.x * dir, k = p.role === 'DF' ? 0.35 : p.role === 'MF' ? 0.55 : 0.75;
        const depth = teamHas ? p.role === 'DF' ? -7 : p.role === 'MF' ? 1.5 : 7 : 0;
        tx = clamp(p.hx + dir * (prog * k + depth), -HL + 4, HL - 4);
        tz = p.hz * 0.84 + B.z * 0.16;
      }
      if (p.role === 'GK') { const gl = -dir * HL, depth = clamp((tx - gl) * dir, 0.4, 15.5); tx = gl + dir * depth; tz = clamp(tz, -19, 19); }
      moveTo(p, tx, tz, p.role === 'GK' ? sp : sp * pf, dt);
      if (!hasBall) turn(p, Math.atan2(B.z - p.z, B.x - p.x), dt, 6);
    }

    function slideStep(p, dt) {
      const speed = (6.5 + p.slidePower * 6) * Math.max(0.3, p.slideT / p.slideDuration);
      p.vx = p.slideX * speed; p.vz = p.slideZ * speed;
      turn(p, Math.atan2(p.slideZ, p.slideX), dt, 24);
      p.slideT = Math.max(0, p.slideT - dt);
    }

    function updatePlayers(dt) {
      for (let t = 0; t < 2; t++) {
        G.autoLock[t] = Math.max(0, G.autoLock[t] - dt);
        if (G.human[t]) pickCtrl(t); else G.ctrl[t] = null;
        chaserFor(t);
      }
      for (const p of G.players) {
        p.px = p.x; p.pz = p.z; p.acroT = Math.max(0, (p.acroT || 0) - dt);
        p.noGrab -= dt; p.protect -= dt; p.shootCd -= dt; p.kickT = Math.max(0, p.kickT - dt); p.diveT = Math.max(0, p.diveT - dt);
        p.slideCooldown = Math.max(0, p.slideCooldown - dt); p.burstT = Math.max(0, p.burstT - dt);
        if (p.slideT > 0) slideStep(p, dt);
        else if (G.human[p.team] && G.ctrl[p.team] === p) humanStep(p, dt); else aiStep(p, dt);
        p.x = clamp(p.x + p.vx * dt, -HL - 1.5, HL + 1.5);
        p.z = clamp(p.z + p.vz * dt, -HW - 1.5, HW + 1.5);
        if (p.role === 'GK' && B.owner === p && inOwnBox(p, p.px, p.pz) && !inOwnBox(p, p.x, p.z)) {
          const gl = -p.dir * HL; // topu elindeyken ceza sahasından çıkamaz
          p.x = gl + p.dir * clamp((p.x - gl) * p.dir, 0.3, 16.2); p.z = clamp(p.z, -20, 20); p.vx = p.vz = 0;
        }
      }
      for (const tackler of G.players) {
        if (tackler.slideT <= 0 || tackler.slideResolved) continue;
        for (const opponent of G.teams[1 - tackler.team]) {
          if (dist(tackler, opponent) > 1.6) continue;
          tackler.slideResolved = true;
          if (tackler.slidePower >= 0.8) {
            tackler.slideT = 0; tackler.vx = tackler.vz = 0;
            const attackingTeam = B.owner && B.owner.team === tackler.team ? tackler.team : (B.owner ? B.owner.team : 1 - tackler.team);
            const foulSpotX = clamp(B.x, -HL + 2, HL - 2), foulSpotZ = clamp(B.z, -HW + 2, HW - 2);
            const isPenalty = (attackingTeam === 0 && B.x > HL - 18) || (attackingTeam === 1 && B.x < -HL + 18);
            if (isPenalty) G.awardPenalty(attackingTeam);
            else G.awardFreeKick(attackingTeam, foulSpotX, foulSpotZ);
            emit('foul', { team: opponent.team, player: opponent.number, restart: isPenalty ? 'penalty' : 'freekick' });
          } else if (B.owner === opponent || dist(opponent, B) < 2.3) {
            B.owner = null; B.target = null; B.x = opponent.x; B.y = BR; B.z = opponent.z;
            B.vx = tackler.slideX * (8 + tackler.slidePower * 12); B.vy = 0.8; B.vz = tackler.slideZ * (8 + tackler.slidePower * 12);
            B.ownT = 0; B.last = tackler.team; opponent.noGrab = 0.5; tackler.noGrab = 0.25;
            emit('tackle', { team: tackler.team });
          }
          break;
        }
      }
      for (let i = 0; i < G.players.length; i++) for (let j = i + 1; j < G.players.length; j++) {
        const a = G.players[i], b = G.players[j], d = dist(a, b);
        if (d < 1.2 && d > 0.001) { const k = (1.2 - d) / 2 / d; a.x += (a.x - b.x) * k; a.z += (a.z - b.z) * k; b.x -= (a.x - b.x) * k; b.z -= (a.z - b.z) * k; }
      }
      const o = B.owner;
      if (o && o.role === 'GK' && G.human[o.team] && G.ctrl[o.team] === o && B.ownT > (G.aimKeeper === o ? 6 : 2.6)) doPass(o, o.dir, 0, true) || kick(o, o.dir, 0, 28, 0.05);
    }

    // ---------- top ----------
    function nearestOf(list, x, z, noGK) {
      let best = null, bd = 1e9;
      for (const p of list) { if (noGK && p.role === 'GK') continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
      return best;
    }
    function goal(att) {
      G.score[att]++; G.state = 'goal'; G.stateT = 3.4; G.conceded = 1 - att;
      B.owner = null; B.target = null; B.vx *= 0.3; B.vz *= 0.3;
      emit('goal', { team: att });
    }
    function checkBounds() {
      if (Math.abs(B.x) > HL) {
        const side = B.x > 0 ? 1 : -1, att = side === 1 ? 0 : 1, def = 1 - att;
        if (Math.hypot(B.vx, B.vz) > 6 && B.y < 2.8 && (Math.abs(Math.abs(B.z) - GW) < 0.2 || (Math.abs(B.z) < GW && B.y >= 2.15))) {
          B.x = side * (HL - 0.3); B.vx = -B.vx * 0.45; B.vz *= 0.6; if (B.vy > 0) B.vy = -B.vy * 0.4; emit('post'); return;
        }
        if (Math.abs(B.z) < GW && B.y < 2.15) return goal(att);
        if (B.last === att) G.awardGoalKick(def, side);
        else G.awardCorner(att, side, B.z);
      } else if (Math.abs(B.z) > HW) {
        const sz = B.z > 0 ? 1 : -1, team = 1 - B.last, x = clamp(B.x, -HL + 3, HL - 3);
        G.awardThrowIn(team, x, sz * HW);
      }
    }

    // Kaleci müdahalesi: sadece kendi ceza sahasında elle oynar. Şutun hızı, mesafe ve kaleci
    // statına göre tutar, yumruklar/çıkarır ya da kaçırır.
    function keeperContact(spd) {
      for (const gk of [G.teams[0][0], G.teams[1][0]]) {
        if (gk.noGrab > 0 || B.y > 3.3 || !inOwnBox(gk, B.x, B.z) || !inOwnBox(gk, gk.x, gk.z)) continue;
        const dh = Math.hypot(gk.x - B.x, gk.z - B.z);
        const diving = gk.diveT > 0.15 && gk.diveT < gk.diveDur * 0.85;
        const reach = diving ? 3.0 + (gk.diveLift || 0) * 0.5 : B.y > 1.6 ? 2.3 : 1.9;
        if (dh > reach || !(B.vx * gk.dir < -1 || spd < 3)) continue;
        const hold = () => { B.owner = gk; B.target = null; B.y = 1.2; B.vx = B.vy = B.vz = 0; B.spin = 0; B.ownT = 0; gk.protect = 0.65; B.last = gk.team; if (G.human[gk.team]) { G.aimKeeper = gk; emit('gkhold', { team: gk.team }); } };
        if (spd < 3) { hold(); emit('save', { team: gk.team, caught: true }); break; }
        if (!diving && spd > 8) {
          gk.diveT = gk.diveDur = 0.9; gk.diveSide = Math.sign(B.z - gk.z) || 1;
          gk.diveTilt = clamp(Math.abs(B.z - gk.z) / 2.4, 0.2, 1); gk.diveLift = clamp((B.y - 0.8) / 2.6, 0.2, 1);
        }
        const chance = clamp(0.93 - Math.max(0, spd - 12) * 0.017 - (dh / reach) * 0.22 + (gk.defending - 72) * 0.004, 0.18, 0.96);
        if (Math.random() < chance) {
          if (spd < 15 + (gk.defending - 70) * 0.15 && B.y < 2.6) { hold(); emit('save', { team: gk.team, high: B.y > 1.2, caught: true }); }
          else { // yumruk / çıkarma: top yana ve ileri sekerek kaleden uzaklaşır
            const side = Math.sign(B.z - gk.z) || (B.z >= 0 ? 1 : -1);
            B.vx = gk.dir * rand(6, 11); B.vz = side * rand(5, 12); B.vy = rand(1.5, 4.5); B.spin = 0;
            B.target = null; B.owner = null; B.last = gk.team; gk.noGrab = 0.6;
            emit('save', { team: gk.team, high: B.y > 1.2, caught: false });
          }
        } else gk.noGrab = 0.45; // kaçırdı: top geçer
        break;
      }
    }

    function ballStep(dt, detect) {
      const o = B.owner;
      if (o) {
        B.ownT += dt; B.last = o.team;
        B.target = null;
        const speed = Math.hypot(o.vx, o.vz), human = G.human[o.team] && G.ctrl[o.team] === o, input = G.input[o.team];
        const sprinting = human && input.sprint && o.stamina > 0.08, closeControl = human && !sprinting && Math.hypot(input.x, input.z) < 0.5;
        o.touchPhase += dt * (2.2 + speed * 0.5);
        const touch = Math.abs(Math.sin(o.touchPhase));
        const amplitude = (o.burstT > 0 ? 2.6 : sprinting ? 1.8 : closeControl ? 0.08 : 0.6) * Math.min(1, speed / 6);
        const lead = 0.8 + touch * amplitude, blend = Math.min(1, 22 * dt);
        B.x += (o.x + Math.cos(o.face) * lead - B.x) * blend;
        B.z += (o.z + Math.sin(o.face) * lead - B.z) * blend;
        B.y = o.role === 'GK' && inOwnBox(o, o.x, o.z) ? 1.2 : BR; B.vx = o.vx; B.vy = 0; B.vz = o.vz;
        if (o.protect <= 0) for (const opp of G.teams[1 - o.team]) {
          const pressure = G.human[opp.team] ? G.ctrl[opp.team] === opp && G.input[opp.team].pressure : true;
          const exposed = Math.max(0, lead - 1.0);
          const shoulderContact = dist(opp, o) < 1.4 && dist(opp, B) < 1.9;
          const defensiveSkill = clamp(0.85 + (opp.defending + opp.power - o.pace - o.power) / 400, 0.55, 1.25);
          const contestOdds = (G.human[opp.team] ? 1.1 : 0.7) * (0.35 + exposed * 2.6) * (shoulderContact ? 2.2 : 1) * defensiveSkill * 2 * dt;
          if (opp.noGrab <= 0 && pressure && (dist(opp, B) < 1.5 || shoulderContact) && Math.random() < contestOdds) {
            B.owner = opp; B.target = null; B.ownT = 0; B.last = opp.team; opp.protect = 0.35; o.noGrab = 0.8;
            emit(shoulderContact ? 'shoulder' : 'steal', { team: opp.team }); break;
          }
        }
      } else {
        B.vx += -B.spin * B.vz * 0.045 * dt;
        B.vz += B.spin * B.vx * 0.045 * dt;
        B.x += B.vx * dt; B.z += B.vz * dt;
        B.y += B.vy * dt; B.vy -= 19 * dt;
        if (B.y < BR) { B.y = BR; B.vy = B.vy < -1.2 ? -B.vy * 0.32 : 0; }
        const f = Math.exp(-(B.y > 0.7 ? 0.25 : 0.8) * dt); B.vx *= f; B.vz *= f;
        B.spin *= Math.exp(-1.25 * dt);
        const spd = Math.hypot(B.vx, B.vz);
        if (spd < 0.3) B.vx = B.vz = 0;
        if (!detect) {
          if (Math.abs(B.x) > HL + 2.4) { B.x = Math.sign(B.x) * (HL + 2.4); B.vx *= -0.2; }
          if (Math.abs(B.z) > GW) { B.z = Math.sign(B.z) * GW; B.vz *= -0.3; }
          return;
        }
        if (!B.owner) keeperContact(spd);
        if (!B.owner && B.target && B.y < 1.2 && B.target.noGrab <= 0 && dist(B.target, B) < 1.6 && spd < 40) {
          const receiver = B.target; B.last = receiver.team; receiver.runT = 0;
          if (B.offside) {
            const spotX = receiver.x, spotZ = receiver.z;
            G.awardFreeKick(1 - receiver.team, spotX, spotZ, null, 'offside');
            return;
          }
          if (spd > 30 && Math.random() < 0.45) {
            B.vx *= 0.3; B.vz = B.vz * 0.3 + rand(-3, 3); receiver.noGrab = 0.35; B.target = null;
          } else {
            B.owner = receiver; B.y = BR; B.vy = 0; B.ownT = 0; receiver.protect = 0.3; B.target = null;
          }
        }
        if (!B.owner && spd >= 26) {
          for (const p of G.teams[1 - B.last]) {
            if (B.y > 1.45) continue;
            if (p.noGrab <= 0 && p.role !== 'GK' && dist(p, B) < 1.0) { B.vx *= 0.35; B.vz = B.vz * 0.35 + rand(-8, 8); B.target = null; B.last = p.team; p.noGrab = 0.3; break; }
          }
        } else if (!B.owner) {
          let best = null, bd = 1.35;
          for (const p of G.players) {
            if (B.y > 1.0 || p.noGrab > 0 || spd > 20 || G.human[p.team] && G.ctrl[p.team] !== p && B.target !== p) continue;
            const d = dist(p, B); if (d < bd) { bd = d; best = p; }
          }
          if (best) { B.owner = best; B.target = null; B.y = BR; B.vy = 0; B.ownT = 0; best.protect = 0.25; B.last = best.team; }
        }
      }
      if (detect) checkBounds();
    }

    // ---------- ana döngü ----------
    G.update = function (dt) {
      dt = Math.min(dt, 0.05);
      if (G.state !== 'play') G.players.forEach((p) => { p.diveT = Math.max(0, p.diveT - dt); });
      if (G.state === 'kickoff') {
        G.stateT -= dt;
        if (G.stateT <= 0) { G.state = 'play'; emit('whistle'); }
        return;
      }
      if (G.state === 'penalty' || G.state === 'freekick') {
        G.stateT -= dt;
        G.players.forEach((p) => { p.vx = p.vz = 0; });
        if (G.stateT <= 0) { G.state = 'play'; emit('restartEnd'); emit('whistle'); }
        return;
      }
      if (G.state === 'corner' || G.state === 'throwin' || G.state === 'goalkick') {
        G.players.forEach((p) => { p.vx = p.vz = 0; });
        G.stateT -= dt; G.stateAge += dt;
        const taker = B.owner;
        if (taker && (!G.human[taker.team] || G.stateT <= 0)) autoRestart(taker, G.state);
        return;
      }
      if (G.state === 'goal') {
        G.stateT -= dt;
        G.players.forEach((p) => { p.vx = p.vz = 0; });
        ballStep(dt, false);
        if (G.stateT <= 0) placeKickoff(G.conceded);
        return;
      }
      if (G.state !== 'play') return;
      G.time -= dt;
      if (G.time <= 0) { G.time = 0; G.state = 'end'; B.owner = null; emit('end', { score: G.score.slice() }); return; }
      updatePlayers(dt);
      ballStep(dt, true);
      if (G.aimKeeper && B.owner !== G.aimKeeper) { G.aimKeeper = null; emit('restartEnd'); }
    };

    return G;
  }

  // ---------- penaltı atışları (saf mantık) ----------
  // Koordinatlar şutçu bakışı: ax -1..1 kale genişliği (sağ=+), ay 0..1 yer..üst direk. Güç 0 (yeşil) .. 1 (kırmızı).
  function resolvePenalty(shot, keep, shooter, keeper, rnd) {
    rnd = rnd || Math.random;
    const sp = clamp(+shot.power || 0, 0, 1), kp = clamp(+keep.power || 0, 0, 1);
    const g = () => (rnd() + rnd() + rnd() - 1.5) * 2;
    const sig = (0.04 + 0.2 * sp * sp) * clamp(1.45 - ((shooter && shooter.shooting) || 75) / 100, 0.35, 1.05);
    const tx = clamp(+shot.ax || 0, -1.3, 1.3) + g() * sig, ty = Math.max(0, clamp(+shot.ay || 0, 0, 1.3) + g() * sig * 0.8);
    const tb = 0.95 - 0.55 * sp;
    const D = { x: clamp(+keep.ax || 0, -1, 1), y: clamp(+keep.ay || 0, 0, 1) }, C = { x: 0, y: 0.35 };
    const speed = 1.5 + 3 * kp, d = Math.hypot(D.x - C.x, D.y - C.y);
    const k = d > 0.001 ? Math.min(1, speed * Math.max(0.1, tb - 0.12) / d) : 0;
    const K = { x: C.x + (D.x - C.x) * k, y: C.y + (D.y - C.y) * k };
    const rs = clamp(0.38 + (((keeper && keeper.defending) || 75) - 75) * 0.004, 0.3, 0.5);
    let result;
    if (Math.abs(tx) > 1.12 || ty > 1.1) result = 'miss';
    else if (Math.abs(tx) > 1 || ty > 1) result = 'post';
    else result = Math.hypot(K.x - tx, K.y - ty) <= rs ? 'save' : 'goal';
    return { result, tx, ty, tb, K, D, dur: Math.max(0.2, d * k / speed) };
  }

  function createShootout(rnd) {
    rnd = rnd || Math.random;
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const S = { score: [0, 0], kicks: [[], []], n: 0, done: false, winner: null, order: [0, 1].map(() => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) };
    S.current = () => { const team = S.n % 2, round = Math.floor(S.n / 2); return { team, keeperTeam: 1 - team, idx: S.order[team][round % 10], round, n: S.n }; };
    S.record = (result) => {
      const t = S.n % 2, scored = result === 'goal';
      if (scored) S.score[t]++;
      S.kicks[t].push(scored ? 'g' : 'm'); S.n++;
      const a = S.kicks[0].length, b = S.kicks[1].length;
      if (a <= 5 && b <= 5 && (S.score[0] > S.score[1] + (5 - b) || S.score[1] > S.score[0] + (5 - a))) S.done = true;
      else if (a === b && a >= 5 && S.score[0] !== S.score[1]) S.done = true;
      if (S.done) S.winner = S.score[0] > S.score[1] ? 0 : 1;
      return S.done;
    };
    return S;
  }

  const api = { createGame, resolvePenalty, createShootout };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FafiGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
