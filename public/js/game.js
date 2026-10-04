// Fafi 27 - oyun mantığı (çizimden ve ağdan bağımsız)
// Koordinatlar: x = saha uzunluğu (-50..50), z = genişlik (-32..32). Takım 0 sağa (+x), takım 1 sola saldırır.
(function (root) {
  'use strict';
  const L = 100, W = 64, HL = L / 2, HW = W / 2, GW = 3.7;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  function createGame(cfg, onEvent) {
    const emit = (t, d) => onEvent && onEvent(t, d || {});
    const B = { x: 0, y: 0.48, z: 0, vx: 0, vy: 0, vz: 0, owner: null, target: null, last: 0, ownT: 0 };
    const G = {
      L, W, HL, HW, GW, ball: B, players: [], teams: [[], []], score: [0, 0], time: 0,
      state: 'idle', stateT: 0, human: [false, false], ctrl: [null, null], chaser: [null, null],
      input: [{ x: 0, z: 0, charge: -1, sprint: false, pressure: false }, { x: 0, z: 0, charge: -1, sprint: false, pressure: false }], autoLock: [0, 0], conceded: 0, pressers: [[], []]
    };

    function mkPlayers() {
      G.players = []; G.teams = [[], []];
      for (let t = 0; t < 2; t++) {
        const dir = t === 0 ? 1 : -1;
        cfg.formation.forEach((f, i) => {
            const identity = (cfg.teams[t].players || [])[i] || {};
            const p = { team: t, idx: i, role: f.role, name: identity.name || 'Oyuncu ' + (i + 1), number: identity.number || i + 1, dir, hx: f.x * HL * dir, hz: f.z * HW * dir, x: 0, z: 0, vx: 0, vz: 0,
            face: t === 0 ? 0 : Math.PI, noGrab: 0, protect: 0, bias: Math.random() * 1.5, shootCd: 0, kickT: 0, kickSide: i % 2, diveT: 0, diveSide: 1,
            slideT: 0, slideDuration: 0, slideCooldown: 0, slidePower: 0, slideX: 0, slideZ: 0, slideResolved: false,
            stamina: 1, burstT: 0, touchPhase: 0, runT: 0, rx: 0, rz: 0 };
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
      B.owner = k; B.target = null; B.x = 0; B.y = 0.48; B.z = 0; B.vx = B.vy = B.vz = 0; B.ownT = 0; B.last = kt;
      G.input.forEach((i) => { i.charge = -1; i.sprint = false; i.pressure = false; });
      G.ctrl = [null, null];
      G.state = 'kickoff'; G.stateT = 1.5;
      emit('kickoff');
    }

    G.start = function (minutes, human) {
      G.score = [0, 0]; G.time = minutes * 60; G.human = human || [true, true];
      mkPlayers(); placeKickoff(0);
    };
    G.setMove = (t, x, z) => { G.input[t].x = x; G.input[t].z = z; };

    // ---------- vuruşlar ----------
    function kick(p, dx, dz, speed, jitter, lift = 0) {
      let a = Math.atan2(dz, dx) + (jitter ? rand(-jitter, jitter) : 0);
      B.vx = Math.cos(a) * speed; B.vy = lift; B.vz = Math.sin(a) * speed;
      B.owner = null; B.target = null; B.last = p.team; p.noGrab = 0.5; p.kickT = 0.42;
      emit('kick', { team: p.team, speed });
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
        let s = c * 2 - d * 0.02;
        if (ai) {
          s += (q.x - p.x) * p.dir * 0.015;
          for (const o of G.teams[1 - p.team]) {
            const t = clamp(((o.x - p.x) * dx + (o.z - p.z) * dz) / (d * d), 0, 1);
            if (Math.hypot(p.x + dx * t - o.x, p.z + dz * t - o.z) < 2.2) { s -= 1.2; break; }
          }
        }
        if (s > bs) { bs = s; best = q; }
      }
      if (!best) { if (ai) return false; kick(p, ax, az, 18 + power * 10, 0.02, loft ? 7 + power * 4 : 0); return true; }
      const d = dist(p, best);
      const speed = clamp((d * 1.3 + 9) * (1 + power * 0.4), 14, 48);
      kick(p, best.x + best.vx * 0.3 - p.x, best.z + best.vz * 0.3 - p.z, speed, 0.03, loft ? 7 + power * 4 : 0);
      B.target = best;
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
        const score = alignment * 2 + (teammate.x - p.x) * p.dir * 0.02 - distance * 0.01;
        if (score > bestScore) { bestScore = score; best = teammate; }
      }
      if (!best) {
        if (!ai) kick(p, ax, az, 20 + power * 14, 0.02);
        return !ai;
      }
      const lead = clamp(dist(p, best) * 0.4 + 3, 6, 15);
      const targetX = clamp(best.x + p.dir * lead * 0.8 + ax * lead * 0.2, -HL + 3, HL - 3);
      const targetZ = clamp(best.z + az * lead * 0.5, -HW + 3, HW - 3);
      const speed = clamp(Math.hypot(targetX - p.x, targetZ - p.z) * 1.25 + 8, 16, 46) * (1 + power * 0.25);
      kick(p, targetX - p.x, targetZ - p.z, speed, 0.02);
      B.target = best; best.runT = 2.2; best.rx = targetX; best.rz = targetZ;
      return true;
    }

    function doCross(p, power) {
      const targetX = p.dir * (HL - 12), targetZ = -Math.sign(p.z || 1) * 8;
      const dx = targetX - p.x, dz = targetZ - p.z;
      const speed = clamp(Math.hypot(dx, dz) * 0.48 + 16, 22, 36) * (1 + power * 0.2);
      kick(p, dx, dz, speed, 0.02, 9 + power * 4);
      let receiver = null, nearest = 1e9;
      for (const teammate of G.teams[p.team]) {
        if (teammate === p) continue;
        const distance = Math.hypot(teammate.x - targetX, teammate.z - targetZ);
        if (distance < nearest) { nearest = distance; receiver = teammate; }
      }
      B.target = receiver;
    }

    function doShoot(p, charge, ai, loft = false) {
      const goalX = p.dir * HL;
      let ax, az;
      if (ai) { ax = goalX - p.x; az = rand(-2.8, 2.8) - p.z; }
      else {
        const i = G.input[p.team]; ax = i.x; az = i.z;
        let m = Math.hypot(ax, az);
        if (m < 0.3) { ax = Math.cos(p.face); az = Math.sin(p.face); m = 1; }
        ax /= m; az /= m;
        const gx = goalX - p.x, gz = -p.z, gn = Math.hypot(gx, gz) || 1;
        if ((ax * gx + az * gz) / gn > 0.6) { ax = ax * 0.3 + (gx / gn) * 0.7; az = az * 0.3 + (gz / gn) * 0.7; }
      }
      const air = loft || (!ai && charge > 0.5);
      kick(p, ax, az, air ? 20 + 14 * charge : 24 + 22 * charge, 0.03 + 0.06 * charge, air ? 4 + charge * 7 : 0);
      p.shootCd = 1;
    }

    G.press = function (t, btn, down, options = {}) {
      if (G.state !== 'play') return;
      const inp = G.input[t];
      if (!G.human[t]) return;
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
        if (down) { if (B.owner === p) inp.charge = 0; }
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
      G.chaser[t] = null;
      if (B.owner && B.owner.team === t) return;
      let best = 1e9;
      for (const p of G.teams[t]) {
        if (p.role === 'GK' || (G.human[t] && G.ctrl[t] === p)) continue;
        const d = dist(p, B);
        if (d < best) { best = d; G.chaser[t] = p; }
      }
    }

    function humanStep(p, dt) {
      const inp = G.input[p.team], m = Math.hypot(inp.x, inp.z);
      let dx = 0, dz = 0;
      const chasesBall = inp.pressure && (!B.owner || B.owner.team !== p.team);
      const canSprint = inp.sprint && p.stamina > 0.08;
      const sp = 12.5 * (canSprint ? 1.45 : chasesBall ? 1.15 : 1) * (B.owner === p ? 0.92 : 1) * (inp.charge >= 0 ? 0.7 : 1) * (0.82 + 0.18 * p.stamina) * (p.burstT > 0 ? 1.18 : 1);
      p.stamina = clamp(p.stamina + (canSprint && m > 0.12 ? -0.1 : !inp.sprint ? 0.04 : 0) * dt, 0, 1);
      if (chasesBall) {
        const tx = B.x + B.vx * 0.18 - p.x, tz = B.z + B.vz * 0.18 - p.z;
        const d = Math.hypot(tx, tz);
        if (d > 0.12) { dx = tx / d * sp; dz = tz / d * sp; turn(p, Math.atan2(tz, tx), dt, 14); }
      } else if (m > 0.12) { const k = Math.min(m, 1) / m; dx = inp.x * k * sp; dz = inp.z * k * sp; }
      accel(p, dx, dz, dt, canSprint ? 5.2 : 8.5);
      if (!chasesBall && m > 0.12) turn(p, Math.atan2(inp.z, inp.x), dt, canSprint ? 8 : 13);
      if (inp.charge >= 0) inp.charge = Math.min(1, inp.charge + dt / 0.9);
    }

    function aiStep(p, dt) {
      const dir = p.dir, own = B.owner, hasBall = own === p, teamHas = own && own.team === p.team;
      let tx = p.x, tz = p.z, sp = 9.4;
      if (p.runT > 0 && !hasBall && p.role !== 'GK') { p.runT -= dt; moveTo(p, p.rx, p.rz, 11.8, dt); return; }
      if (p.role === 'GK') {
        const gx = -dir * HL;
        tx = gx + dir * 2; tz = clamp(B.z * 0.3, -GW + 0.7, GW - 0.7); sp = 8;
        if (hasBall) {
          tx = p.x; tz = p.z; sp = 0;
          if (B.ownT > 0.9 && !doPass(p, dir, 0, true)) kick(p, dir, 0, 28, 0.05);
        } else if (B.vx * dir < -5) {
          const t = (gx - B.x) / B.vx;
          if (t < 1.6) { tz = clamp(B.z + B.vz * t, -GW - 1.5, GW + 1.5); tx = gx + dir * 1.4; sp = 10.5; }
        } else if (!own && Math.hypot(B.x - gx, B.z) < 15 && Math.hypot(B.vx, B.vz) < 9) { tx = B.x; tz = B.z; sp = 10; }
      } else if (hasBall) {
        const goalX = dir * HL, dg = Math.hypot(goalX - p.x, p.z);
        let near = 1e9;
        for (const o of G.teams[1 - p.team]) near = Math.min(near, dist(o, p));
        if (dg < 27 && p.shootCd <= 0 && B.ownT > 0.35 && Math.random() < 3 * dt) { doShoot(p, 0.55 + Math.random() * 0.4, true); return; }
        if (B.ownT > 0.4 + p.bias && (near < 4 || Math.random() < 0.8 * dt) && doPass(p, dir, 0, true)) return;
        tx = goalX; tz = clamp(p.z * 0.5, -12, 12); sp = 9.8;
      } else if (G.chaser[p.team] === p || G.pressers[p.team].includes(p)) {
        tx = B.x + B.vx * 0.25; tz = B.z + B.vz * 0.25; sp = 10.6;
      } else {
        const prog = B.x * dir, k = p.role === 'DF' ? 0.35 : p.role === 'MF' ? 0.55 : 0.75;
        tx = clamp(p.hx + dir * (prog * k + (teamHas ? 6 : 0)), -HL + 4, HL - 4);
        tz = p.hz * 0.9 + B.z * 0.25;
      }
      moveTo(p, tx, tz, sp, dt);
    }

    function slideStep(p, dt) {
      const speed = (9 + p.slidePower * 9) * Math.max(0.3, p.slideT / p.slideDuration);
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
        p.noGrab -= dt; p.protect -= dt; p.shootCd -= dt; p.kickT = Math.max(0, p.kickT - dt); p.diveT = Math.max(0, p.diveT - dt);
        p.slideCooldown = Math.max(0, p.slideCooldown - dt); p.burstT = Math.max(0, p.burstT - dt);
        if (p.slideT > 0) slideStep(p, dt);
        else if (G.human[p.team] && G.ctrl[p.team] === p) humanStep(p, dt); else aiStep(p, dt);
        p.x = clamp(p.x + p.vx * dt, -HL - 1.5, HL + 1.5);
        p.z = clamp(p.z + p.vz * dt, -HW - 1.5, HW + 1.5);
      }
      for (const tackler of G.players) {
        if (tackler.slideT <= 0 || tackler.slideResolved) continue;
        for (const opponent of G.teams[1 - tackler.team]) {
          if (dist(tackler, opponent) > 1.6) continue;
          tackler.slideResolved = true;
          if (tackler.slidePower >= 0.8) {
            const restartX = clamp(B.x, -HL + 2, HL - 2), restartZ = clamp(B.z, -HW + 2, HW - 2);
            tackler.slideT = 0; tackler.vx = tackler.vz = 0;
            placeRestart(opponent, restartX, restartZ, Math.atan2(tackler.z - opponent.z, tackler.x - opponent.x));
            emit('foul', { team: opponent.team, player: opponent.number });
          } else if (B.owner === opponent || dist(opponent, B) < 2.3) {
            B.owner = null; B.target = null; B.x = opponent.x; B.y = 0.48; B.z = opponent.z;
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
      if (o && o.role === 'GK' && G.human[o.team] && G.ctrl[o.team] === o && B.ownT > 2.6) doPass(o, o.dir, 0, true) || kick(o, o.dir, 0, 28, 0.05);
    }

    // ---------- top ----------
    function placeRestart(p, x, z, face) {
      p.face = face; p.x = x - Math.cos(face) * 0.95; p.z = z - Math.sin(face) * 0.95; p.vx = p.vz = 0;
      B.owner = p; B.target = null; B.ownT = 0; p.protect = 0.8; B.vx = B.vy = B.vz = 0; B.x = x; B.y = 0.48; B.z = z; B.last = p.team;
      for (const q of G.players) if (q.team !== p.team) q.noGrab = Math.max(q.noGrab, 1.2);
      emit('restart');
    }
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
        if (Math.abs(B.z) < GW && B.y < 2.5) return goal(att);
        if (B.last === att) placeRestart(G.teams[def][0], side * (HL - 6), 0, side === 1 ? Math.PI : 0);
        else {
          const zc = (B.z > 0 ? 1 : -1) * (HW - 0.6);
          placeRestart(nearestOf(G.teams[att], side * HL, zc, true), side * (HL - 0.6), zc, Math.atan2(-zc, -side * HL));
        }
      } else if (Math.abs(B.z) > HW) {
        const sz = B.z > 0 ? 1 : -1, team = 1 - B.last, x = clamp(B.x, -HL + 3, HL - 3);
        placeRestart(nearestOf(G.teams[team], x, sz * HW, false), x, sz * (HW - 0.3), -sz * Math.PI / 2);
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
        const amplitude = (o.burstT > 0 ? 2.6 : sprinting ? 1.8 : closeControl ? 0.08 : 0.6) * Math.min(1, speed / 9);
        const lead = 0.8 + touch * amplitude, blend = Math.min(1, 22 * dt);
        B.x += (o.x + Math.cos(o.face) * lead - B.x) * blend;
        B.z += (o.z + Math.sin(o.face) * lead - B.z) * blend;
        B.y = 0.48; B.vx = o.vx; B.vy = 0; B.vz = o.vz;
        if (o.protect <= 0) for (const opp of G.teams[1 - o.team]) {
          const pressure = G.human[opp.team] ? G.ctrl[opp.team] === opp && G.input[opp.team].pressure : true;
          const exposed = Math.max(0, lead - 1.0);
          if (opp.noGrab <= 0 && pressure && dist(opp, B) < 1.5 && Math.random() < (G.human[opp.team] ? 1.1 : 0.7) * (0.35 + exposed * 2.6) * 2 * dt) {
            B.owner = opp; B.target = null; B.ownT = 0; opp.protect = 0.35; o.noGrab = 0.8; emit('steal'); break;
          }
        }
      } else {
        B.x += B.vx * dt; B.z += B.vz * dt;
        B.y += B.vy * dt; B.vy -= 19 * dt;
        if (B.y < 0.48) { B.y = 0.48; B.vy = B.vy < -1.2 ? -B.vy * 0.32 : 0; }
        const f = Math.exp(-0.8 * dt); B.vx *= f; B.vz *= f;
        const spd = Math.hypot(B.vx, B.vz);
        if (spd < 0.3) B.vx = B.vz = 0;
        if (!detect) {
          if (Math.abs(B.x) > HL + 2.4) { B.x = Math.sign(B.x) * (HL + 2.4); B.vx *= -0.2; }
          if (Math.abs(B.z) > GW) { B.z = Math.sign(B.z) * GW; B.vz *= -0.3; }
          return;
        }
        for (const gk of [G.teams[0][0], G.teams[1][0]]) {
          const goalX = -gk.dir * HL, inBox = Math.abs(B.x - goalX) < 18 && Math.abs(B.z) < 19;
          const reach = Math.hypot(gk.x - B.x, gk.z - B.z);
          if (B.y > 0.95 && B.y < 4.6 && inBox && reach < 3.4 && B.vx * gk.dir < -1.5 && gk.noGrab <= 0) {
            gk.diveT = 0.58; gk.diveSide = Math.sign(B.z - gk.z) || 1;
            if (Math.random() < clamp(0.92 - reach * 0.18, 0.35, 0.78)) {
              B.owner = gk; B.target = null; B.y = 0.48; B.vy = 0; B.ownT = 0; gk.protect = 0.65; B.last = gk.team;
            } else {
              B.vx = gk.dir * rand(8, 13); B.vz = rand(-12, 12); B.vy = Math.max(0, B.vy * 0.4); gk.noGrab = 0.7; B.last = gk.team;
            }
            emit('save', { team: gk.team, high: true, caught: B.owner === gk });
            break;
          }
        }
        if (!B.owner) for (const gk of [G.teams[0][0], G.teams[1][0]]) {
          if (B.y > 2.3 || gk.noGrab > 0 || dist(gk, B) > 1.8 || B.vx * gk.dir >= 0 && spd > 3) continue;
          if (spd < 28) { B.owner = gk; B.target = null; B.ownT = 0; gk.protect = 0.4; B.last = gk.team; emit('save'); break; }
          B.vx = gk.dir * rand(10, 16); B.vz = rand(-12, 12); gk.noGrab = 0.5; B.last = gk.team; emit('save'); break;
        }
        if (!B.owner && B.target && B.y < 1.2 && B.target.noGrab <= 0 && dist(B.target, B) < 1.6 && spd < 40) {
          const receiver = B.target; B.last = receiver.team; receiver.runT = 0;
          if (spd > 30 && Math.random() < 0.45) {
            B.vx *= 0.3; B.vz = B.vz * 0.3 + rand(-3, 3); receiver.noGrab = 0.35; B.target = null;
          } else {
            B.owner = receiver; B.y = 0.48; B.vy = 0; B.ownT = 0; receiver.protect = 0.3; B.target = null;
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
          if (best) { B.owner = best; B.target = null; B.y = 0.48; B.vy = 0; B.ownT = 0; best.protect = 0.25; B.last = best.team; }
        }
      }
      if (detect) checkBounds();
    }

    // ---------- ana döngü ----------
    G.update = function (dt) {
      dt = Math.min(dt, 0.05);
      if (G.state === 'kickoff') {
        G.stateT -= dt;
        if (G.stateT <= 0) { G.state = 'play'; emit('whistle'); }
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
    };

    return G;
  }

  const api = { createGame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FafiGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
