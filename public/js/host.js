// Fafi 27 - tahta (host) tarafı: çizim, arayüz akışı, ağ, ses
(function () {
  'use strict';
  const CFG = window.FAFI, $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L = 100, W = 64;

  // ---------- durum ----------
  const socket = io({ transports: ['websocket', 'polling'] });
  let phase = 'menu';            // menu | lobby | match | end
  let room = null, minutes = CFG.durations[1] || 5, muted = false, playing = false;
  const joined = [false, false], slotTeam = [null, null];
  let game = FafiGame.createGame(CFG, onGameEvent);
  game.start(minutes, [false, false]);   // menü arkasında duran önizleme

  // ---------- ses (dosya yoksa sessizce atlanır) ----------
  const audio = {};
  const SOUND_FILES = { whistle: 'whistle.mp3', crowd: 'crowd.mp3', goal: 'goal.mp3', kick: 'kick.mp3' };
  function loadAudio() {
    if (audio.loaded) return; audio.loaded = true;
    Object.keys(SOUND_FILES).forEach((k) => {
      const a = new Audio('assets/sounds/' + SOUND_FILES[k]);
      a.preload = 'auto'; a.onerror = () => { a.bad = true; };
      if (k === 'crowd') { a.loop = true; a.volume = 0.35; }
      audio[k] = a;
    });
  }
  function snd(k) {
    const a = audio[k]; if (muted || !a || a.bad) return;
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
  }
  function crowd(on) {
    const a = audio.crowd; if (!a || a.bad) return;
    if (on && !muted) a.play().catch(() => {}); else a.pause();
  }
  function setMuted(m) {
    muted = m;
    const label = 'Ses: ' + (m ? 'Kapalı' : 'Açık');
    $('sndBtn').textContent = label; $('sndHud').textContent = label;
    crowd(phase === 'match');
  }

  // ---------- three.js sahnesi ----------
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f1a14');
  scene.fog = new THREE.Fog('#0f1a14', 90, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a2e, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(-20, 60, 30); scene.add(sun);

  function pitchTexture() {
    const S = 10, c = document.createElement('canvas'); c.width = L * S; c.height = W * S;
    const g = c.getContext('2d');
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#2f6a3d' : '#2a6237'; g.fillRect(i * 10 * S, 0, 10 * S, W * S); }
    g.strokeStyle = 'rgba(240,238,228,.9)'; g.lineWidth = 2.2; g.fillStyle = 'rgba(240,238,228,.9)';
    const X = (x) => (x + L / 2) * S, Z = (z) => (z + W / 2) * S;
    g.strokeRect(X(-L / 2) + 1, Z(-W / 2) + 1, L * S - 2, W * S - 2);
    g.beginPath(); g.moveTo(X(0), Z(-W / 2)); g.lineTo(X(0), Z(W / 2)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 9 * S, 0, 7); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 0.5 * S, 0, 7); g.fill();
    [-1, 1].forEach((s) => {
      const gx = s * L / 2;
      g.strokeRect(Math.min(X(gx), X(gx - s * 16)), Z(-20), 16 * S, 40 * S);
      g.strokeRect(Math.min(X(gx), X(gx - s * 5.5)), Z(-9), 5.5 * S, 18 * S);
      g.beginPath(); g.arc(X(gx - s * 11), Z(0), 0.5 * S, 0, 7); g.fill();
      g.beginPath(); g.arc(X(gx - s * 11), Z(0), 9 * S, s === 1 ? Math.PI * 0.69 : -Math.PI * 0.31, s === 1 ? Math.PI * 1.31 : Math.PI * 0.31); g.stroke();
    });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshLambertMaterial({ map: pitchTexture() }));
  pitch.rotation.x = -Math.PI / 2; scene.add(pitch);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshLambertMaterial({ color: '#1b3324' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

  const assetLoader = new THREE.GLTFLoader();
  assetLoader.load('assets/models/soccer-field.glb', (gltf) => {
    const field = gltf.scene, sx = L / 1.4, sz = W / 0.67;
    field.scale.set(sx, 1, sz);
    field.position.set(-0.0106868 * sx, 0.05, -0.01438485 * sz);
    field.traverse((o) => { if (o.isMesh && o.material.name === 'mat9') o.material.color.set('#2c663c'); });
    scene.add(field); pitch.visible = false;
  });
  assetLoader.load('assets/models/football-stadium.glb', (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      if (materials.some((m) => ['20690a', '052b00', '959595', '203256', '040404', '000000'].includes(m.color && m.color.getHexString()))) o.visible = false;
    });
    const stadium = new THREE.Group();
    gltf.scene.rotation.y = Math.PI / 2; gltf.scene.scale.setScalar(1.15); stadium.add(gltf.scene);
    stadium.updateMatrixWorld(true);
    stadium.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const geometry = o.geometry, position = geometry.attributes.position, index = geometry.index;
      const attributes = geometry.attributes, kept = Object.fromEntries(Object.keys(attributes).map((key) => [key, []]));
      const vertexCount = index ? index.count : position.count, point = new THREE.Vector3();
      for (let i = 0; i < vertexCount; i += 3) {
        let x = 0, z = 0;
        for (let j = 0; j < 3; j++) {
          const vertex = index ? index.getX(i + j) : i + j;
          point.fromBufferAttribute(position, vertex).applyMatrix4(o.matrixWorld); x += point.x / 3; z += point.z / 3;
        }
        if (Math.abs(x) <= L / 2 + 5 && Math.abs(z) <= W / 2 + 5) continue;
        for (let j = 0; j < 3; j++) {
          const vertex = index ? index.getX(i + j) : i + j;
          Object.keys(attributes).forEach((key) => {
            const attribute = attributes[key], start = vertex * attribute.itemSize;
            kept[key].push(...attribute.array.slice(start, start + attribute.itemSize));
          });
        }
      }
      const trimmed = new THREE.BufferGeometry();
      Object.keys(attributes).forEach((key) => {
        const attribute = attributes[key];
        trimmed.setAttribute(key, new THREE.BufferAttribute(new attribute.array.constructor(kept[key]), attribute.itemSize, attribute.normalized));
      });
      trimmed.computeBoundingSphere(); geometry.dispose(); o.geometry = trimmed;
    });
    const bounds = new THREE.Box3().setFromObject(stadium), center = bounds.getCenter(new THREE.Vector3());
    stadium.position.set(-center.x, -bounds.min.y, -center.z); scene.add(stadium);
  });

  const white = new THREE.MeshLambertMaterial({ color: '#f1eee6' });
  const netMat = new THREE.MeshBasicMaterial({ color: '#f1eee6', transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  [-1, 1].forEach((s) => {
    const gx = s * L / 2, gw = game.GW || 3.7, h = 2.4, dpt = 2.4;
    [-1, 1].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, h, 8), white); p.position.set(gx, h / 2, z * gw); scene.add(p); });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, gw * 2, 8), white);
    bar.rotation.x = Math.PI / 2; bar.position.set(gx, h, 0); scene.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, h), netMat); back.rotation.y = Math.PI / 2; back.position.set(gx + s * dpt, h / 2, 0); scene.add(back);
    [-1, 1].forEach((z) => { const sd = new THREE.Mesh(new THREE.PlaneGeometry(dpt, h), netMat); sd.position.set(gx + s * dpt / 2, h / 2, z * gw); scene.add(sd); });
  });
  [-1, 1].forEach((s) => { // reklam panoları
    const b = new THREE.Mesh(new THREE.BoxGeometry(L + 6, 1, 0.4), new THREE.MeshLambertMaterial({ color: '#16221b' }));
    b.position.set(0, 0.5, s * (W / 2 + 2.2)); scene.add(b);
  });

  // oyuncu görseli: ileride 3D model koymak için sadece bu fonksiyonu değiştir
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const shadowGeo = new THREE.CircleGeometry(0.8, 16), shadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28 });
  function makePlayerMesh(team, player) {
    const t = CFG.teams[team], g = new THREE.Group(), body = new THREE.Group(), fallback = new THREE.Group();
    const role = player.role;
    const kit = role === 'GK' ? '#c4b25c' : t.color;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.5, 12), mat(kit)); torso.position.y = 1.0; fallback.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), mat('#d4aa88')); head.position.y = 2.0; fallback.add(head);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.6), mat(t.color2)); chest.position.set(0.45, 1.25, 0); fallback.add(chest);
    body.add(fallback);
    g.add(body); g.userData.body = body;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(12,20,15,.88)'; ctx.fillRect(4, 4, 504, 88);
    ctx.strokeStyle = t.color2; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 504, 88);
    ctx.fillStyle = '#f1eee6'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center';
    ctx.fillText(player.number + '  ' + player.name, 256, 61, 480);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
    label.position.y = 3.25; label.scale.set(5.2, 0.98, 1); label.visible = false; g.add(label);
    g.userData.nameLabel = label;
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    scene.add(g); return g;
  }
  const meshes = game.players.map((p) => makePlayerMesh(p.team, p));
  assetLoader.load('assets/models/footballer.glb', (gltf) => {
    const template = gltf.scene, bounds = new THREE.Box3().setFromObject(template);
    const height = bounds.getSize(new THREE.Vector3()).y, scale = 2.25 / height;
    meshes.forEach((mesh, i) => {
      const player = game.players[i], actor = template.clone(true), team = CFG.teams[player.team];
      actor.scale.setScalar(scale); actor.position.y = height * scale / 2; actor.rotation.y = Math.PI / 2;
      actor.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        if (o.material.name === 'mat16') o.material.color.set(player.role === 'GK' ? '#c4b25c' : team.color);
      });
      mesh.userData.body.children[0].visible = false;
      mesh.userData.body.add(actor);
    });
  });
  const rings = [0, 1].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.2, 28), new THREE.MeshBasicMaterial({ color: '#ece8dc', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.y = 0.06; r.visible = false; scene.add(r); return r;
  });
  const ballMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshLambertMaterial({ color: '#f4f2ea' }));
  scene.add(ballMesh);
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), shadowMat); ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = 0.03; scene.add(ballShadow);

  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let camX = 0, orbit = 0, tAnim = 0;
  function frame(dt) {
    tAnim += dt;
    const B = game.ball;
    game.players.forEach((p, i) => {
      const m = meshes[i], sp = Math.hypot(p.vx, p.vz);
      m.position.set(p.x, 0, p.z); m.rotation.y = -p.face;
      m.userData.body.position.y = Math.abs(Math.sin(tAnim * 11 + i)) * 0.14 * Math.min(1, sp / 8);
      m.userData.nameLabel.visible = playing && game.human[p.team] && game.ctrl[p.team] === p;
    });
    rings.forEach((r, t) => {
      const c = playing && game.human[t] ? game.ctrl[t] : null;
      r.visible = !!c; if (c) r.position.set(c.x, 0.06, c.z);
    });
    ballMesh.position.set(B.x, 0.5, B.z); ballMesh.rotation.z -= B.vx * dt / 0.5; ballMesh.rotation.x += B.vz * dt / 0.5;
    ballShadow.position.x = B.x; ballShadow.position.z = B.z;
    if (!playing || phase === 'end') {
      orbit += dt * 0.1;
      cam.position.set(Math.sin(orbit) * 44, 30, 54 + Math.cos(orbit) * 6); cam.lookAt(0, 0, 4);
    } else {
      camX += (clamp(B.x * 0.8, -20, 20) - camX) * Math.min(1, 2.5 * dt);
      cam.position.set(camX, 46, 30); cam.lookAt(camX, 0, 2);
    }
  }

  // ---------- HUD ----------
  function setTeamsHud() {
    [0, 1].forEach((t) => {
      const T = CFG.teams[t];
      $('tn' + t).textContent = T.name; $('bar' + t).style.background = T.color;
      const lg = $('logo' + t); if (T.logo) { lg.src = T.logo; lg.hidden = false; } else lg.hidden = true;
    });
  }
  let lastClock = '', lastScore = '';
  function hudTick() {
    const s = Math.ceil(game.time), c = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (c !== lastClock) { lastClock = c; $('clock').textContent = c; }
    const sc = game.score.join('-'); if (sc !== lastScore) { lastScore = sc; $('sc0').textContent = game.score[0]; $('sc1').textContent = game.score[1]; }
    [0, 1].forEach((t) => {
      const player = game.human[t] ? game.ctrl[t] : null;
      $('active' + t).textContent = player ? '#' + player.number + ' ' + player.name : '';
    });
  }
  let bannerTimer;
  function banner(html, ms) {
    const b = $('banner'); b.innerHTML = html; b.classList.add('on');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), ms || 1600);
  }
  function screen(id) { ['menu', 'lobby', 'end'].forEach((s) => $(s).classList.toggle('on', s === id)); }

  // ---------- ağ ----------
  const send = (slot, msg) => socket.emit('h2c', { slot, msg });
  const both = (msg) => socket.emit('h2c', { slot: null, msg });
  function phaseMsg(slot) {
    const t = slotTeam[slot];
    if (phase === 'match') return { t: 'phase', phase: 'play', team: t };
    if (phase === 'end') return { t: 'phase', phase: 'end', team: t, score: game.score };
    return { t: 'phase', phase: 'pick', team: t, taken: slotTeam };
  }
  socket.on('slot:joined', (d) => {
    joined[d.slot] = true;
    if (phase === 'match') updateHumans();
    refreshLobby(); send(d.slot, phaseMsg(d.slot));
  });
  socket.on('slot:left', (d) => {
    joined[d.slot] = false;
    if (phase === 'lobby') { slotTeam[d.slot] = null; both({ t: 'taken', taken: slotTeam }); }
    if (phase === 'match') updateHumans();
    refreshLobby();
  });
  socket.on('c2h', (m) => {
    const t = slotTeam[m.slot];
    if (m.t === 'pick' && phase === 'lobby') {
      if (slotTeam[1 - m.slot] === m.team) return send(m.slot, { t: 'pickFail' });
      slotTeam[m.slot] = m.team; both({ t: 'taken', taken: slotTeam }); refreshLobby();
      if (slotTeam[0] !== null && slotTeam[1] !== null && joined[0] && joined[1]) setTimeout(startMatch, 900);
    } else if (m.t === 'mv' && playing && t !== null) game.setMove(t, clamp(+m.x || 0, -1, 1), clamp(+m.y || 0, -1, 1));
    else if (m.t === 'btn' && playing && t !== null) game.press(t, m.b, !!m.d);
    else if (m.t === 'rematch' && phase === 'end') startMatch();
  });
  socket.on('connect', () => { if (room) location.reload(); }); // sunucu yeniden bağlanırsa oda kaybolur

  function updateHumans() {
    game.human = [false, false];
    [0, 1].forEach((s) => { if (slotTeam[s] !== null && joined[s]) game.human[slotTeam[s]] = true; });
  }
  function refreshLobby() {
    [0, 1].forEach((s) => {
      const el = $('slot' + s), t = slotTeam[s];
      el.classList.toggle('in', joined[s]);
      el.querySelector('small').innerHTML = !joined[s] ? 'Bekleniyor'
        : t === null ? 'Takım seçiyor' : '<span class="chip" style="background:' + CFG.teams[t].color + '"></span>' + CFG.teams[t].name;
    });
  }

  // ---------- akış ----------
  function openLobby() {
    loadAudio();
    socket.emit('host:create', (r) => {
      room = r.code; phase = 'lobby';
      const base = new URLSearchParams(location.search).get('base') || location.origin;
      const url = base + '/controller.html?room=' + room;
      $('qr').innerHTML = ''; new QRCode($('qr'), { text: url, width: 250, height: 250, colorDark: '#10201a', colorLight: '#ece8dc' });
      $('roomCode').textContent = room;
      $('lobbyUrl').textContent = /localhost|127\.0\.0\.1/.test(base) ? 'Telefon localhost\'a ulaşamaz: sayfayı Render adresiyle ya da ?base=http://BİLGİSAYAR-IP:3000 ile aç.' : url;
      refreshLobby(); screen('lobby');
    });
  }
  function startMatch() {
    if (phase !== 'lobby' && phase !== 'end') return;
    phase = 'match'; playing = true; updateHumans();
    game.start(minutes, game.human);
    lastClock = lastScore = ''; setTeamsHud();
    screen(null); $('hud').classList.add('on'); $('sndHud').classList.add('on');
    [0, 1].forEach((s) => send(s, { t: 'phase', phase: 'play', team: slotTeam[s] }));
    crowd(true); snd('whistle');
  }
  function onGameEvent(type, d) {
    if (type === 'kickoff' && playing) banner(game.score[0] + ' - ' + game.score[1], 1200);
    else if (type === 'whistle') snd('whistle');
    else if (type === 'kick') snd('kick');
    else if (type === 'goal') {
      banner('GOL!<small>' + CFG.teams[d.team].name + '</small>', 3000); snd('goal');
      both({ t: 'vib', ms: [220, 80, 220] });
    } else if (type === 'end') {
      phase = 'end'; playing = true; snd('whistle'); crowd(false);
      const [a, b] = d.score;
      $('endTitle').textContent = a === b ? 'Berabere' : CFG.teams[a > b ? 0 : 1].name + ' kazandı';
      $('endScore').textContent = CFG.teams[0].name + '  ' + a + ' - ' + b + '  ' + CFG.teams[1].name;
      setTimeout(() => { screen('end'); }, 1200);
      [0, 1].forEach((s) => send(s, { t: 'phase', phase: 'end', team: slotTeam[s], score: d.score }));
    }
  }

  // ---------- düğmeler ----------
  $('playBtn').onclick = openLobby;
  $('sndBtn').onclick = () => { loadAudio(); setMuted(!muted); };
  $('sndHud').onclick = () => setMuted(!muted);
  $('lobbyBack').onclick = $('toMenu').onclick = () => location.reload();
  $('rematch').onclick = () => { screen(null); startMatch(); };
  const durBox = $('durs');
  CFG.durations.forEach((m) => {
    const b = document.createElement('button'); b.textContent = m + ' dk'; b.className = m === minutes ? 'sel' : '';
    b.onclick = () => { minutes = m; [...durBox.children].forEach((x) => x.classList.toggle('sel', x === b)); game.start(minutes, [false, false]); };
    durBox.appendChild(b);
  });
  setTeamsHud();

  // ---------- döngü ----------
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (playing && phase !== 'end') { game.update(dt); hudTick(); }
    frame(dt); renderer.render(scene, cam);
    requestAnimationFrame(loop);
  })(last);
})();
