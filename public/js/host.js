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
  let mode = 'match', shoot = null;   // mode: match | pen (penaltı atışları)
  let game = FafiGame.createGame(CFG, onGameEvent);
  game.start(minutes, [false, false]);   // menü arkasında duran önizleme

  // ---------- ses (dosya yoksa WebAudio fallback kullanır) ----------
  const audio = {};
  const SOUND_FILES = { whistle: 'whistle.mp3', crowd: 'crowd.mp3', goal: 'goal.mp3', kick: 'kick.mp3' };
  let audioCtx = null;
  function ensureAudioCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }
  function fallbackTone(freq, duration, type = 'triangle', gainValue = 0.05, sweep = 0) {
    const ctx = ensureAudioCtx();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + duration);
  }
  function fallbackSfx(kind) {
    if (kind === 'whistle') { fallbackTone(900, 0.18, 'square', 0.04, 280); setTimeout(() => fallbackTone(1200, 0.14, 'square', 0.03, 220), 55); }
    else if (kind === 'kick') { fallbackTone(180, 0.11, 'sawtooth', 0.04, -70); }
    else if (kind === 'goal') { fallbackTone(290, 0.22, 'triangle', 0.08, 160); setTimeout(() => fallbackTone(440, 0.28, 'triangle', 0.08, 180), 90); }
  }
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
    const a = audio[k]; if (muted) return;
    if (a && !a.bad) {
      try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
      return;
    }
    fallbackSfx(k);
  }
  function crowd(on) {
    const a = audio.crowd; if (muted) return;
    if (!a || a.bad) return;
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
  scene.fog = new THREE.Fog('#0f1a14', 150, 260);
  const cam = new THREE.PerspectiveCamera(46, 1, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a2e, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-20, 60, 30); scene.add(sun);

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
  // Hazır saha dokusu (football_court.glb içinden). Çizgiler dokunun %92.6 x %94'ünü kaplar;
  // plane o oranda büyütülür ki çizgiler oyunun gerçek saha sınırına (L x W) otursun.
  const pitchMat = new THREE.MeshLambertMaterial({ map: pitchTexture() });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(L / 0.926, W / 0.94), pitchMat);
  pitch.rotation.x = -Math.PI / 2; scene.add(pitch);
  new THREE.TextureLoader().load('assets/pitch.png', (tex) => {
    tex.anisotropy = 8; pitchMat.map = tex; pitchMat.color.set(0xffffff); pitchMat.needsUpdate = true;
  }, undefined, () => console.warn('Saha dokusu yüklenemedi: assets/pitch.png'));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshLambertMaterial({ color: '#1b3324' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  const seatColors = ['#263644', '#344857', '#3f4d58', '#594743'].map((color) => new THREE.MeshLambertMaterial({ color }));
  for (let row = 0; row < 7; row++) {
    const height = 0.52, y = 0.42 + row * 0.62, offset = 3.8 + row * 1.65, material = seatColors[row % seatColors.length];
    [-1, 1].forEach((side) => {
      const longStand = new THREE.Mesh(new THREE.BoxGeometry(L + 18, height, 1.45), material);
      longStand.position.set(0, y, side * (W / 2 + offset)); scene.add(longStand);
      const endStand = new THREE.Mesh(new THREE.BoxGeometry(1.45, height, W + 18), material);
      endStand.position.set(side * (L / 2 + offset), y, 0); scene.add(endStand);
    });
  }
  const crowdFiles = ['male-cheering.glb', 'female-cheering.glb', 'male-standing.glb', 'female-standing.glb', 'male-waving.glb', 'female-waving.glb'];
  Promise.all(crowdFiles.map((file) => new Promise((resolve) => {
    new THREE.GLTFLoader().load('assets/models/crowd/' + file, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
  }))).then((crowdModels) => {
    const crowd = crowdModels.filter(Boolean);
    if (!crowd.length) return;
    const shirtColors = ['#b25c4b', '#6488a0', '#d0ac5e', '#587d61', '#8c718d', '#bcc4c5'];
    const trouserColors = ['#48515a', '#5a4e46', '#485b53'];
    const variants = crowd.map((model, variantIndex) => {
      model.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const visibleMaterials = materials.map((material) => {
          const color = material.color ? material.color.clone() : new THREE.Color('#777777');
          if (object.name === 'Shirt') color.set(shirtColors[variantIndex]);
          else if (object.name === 'Pants') color.set(trouserColors[variantIndex % trouserColors.length]);
          else if (object.name === 'Shoes') color.set('#46484a');
          return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        });
        object.material = Array.isArray(object.material) ? visibleMaterials : visibleMaterials[0];
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      return { model, bounds, center, scale: 2.55 / size.y };
    });
    const placements = [];
    [2, 4, 6].forEach((row) => {
      const y = 0.42 + row * 0.62 + 0.26, offset = W / 2 + 3.8 + row * 1.65;
      [-1, 1].forEach((side) => {
        [-43, -26, -9, 9, 26, 43].forEach((x, index) => {
          placements.push({ x: x + row * 0.45, y, z: side * offset, rotation: side < 0 ? Math.PI : 0, variant: row + index });
        });
      });
    });
    placements.forEach((spot, index) => {
      const { model, bounds, center, scale } = variants[(spot.variant + index) % variants.length];
      const person = model.clone(true);
      person.scale.setScalar(scale);
      person.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const seat = new THREE.Group();
      seat.position.set(spot.x, spot.y, spot.z); seat.rotation.y = spot.rotation;
      seat.add(person); scene.add(seat);
    });
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

  // Keep player geometry articulated so movement is visible at board scale.
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const shadowGeo = new THREE.CircleGeometry(0.72, 20), shadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.26 });
  function capsuleMesh(radius, cylinderHeight, material, segments) {
    const capsule = new THREE.Group();
    capsule.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, cylinderHeight, segments), material));
    [-1, 1].forEach((direction) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(6, segments - 2)), material);
      cap.position.y = direction * cylinderHeight / 2; capsule.add(cap);
    });
    return capsule;
  }
  // Oyuncu boyu ~2 birim (1 birim = 1 m); top oyuncuya göre orantılı küçük.
  const PLAYER_SCALE = 0.84; // ~2.05 m boy (kale 2.4 m)
  function makePlayerMesh(team, player) {
    const t = CFG.teams[team], g = new THREE.Group(), body = new THREE.Group();
    const role = player.role;
    g.scale.setScalar(PLAYER_SCALE); g.rotation.order = 'YXZ';
    const kit = role === 'GK' ? '#d4ae48' : t.color;
    const skin = player.appearance?.skin || ['#d9a884', '#b77e5d', '#8b5e46', '#e2bd9c', '#c79572', '#704a35', '#e0bc9d', '#966448'][(player.number + team * 3) % 8];
    const shortsColor = role === 'GK' ? '#273442' : (t.shortsColor || t.color);
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.9, metalness: 0.03 });
    const kitMat = new THREE.MeshStandardMaterial({ color: kit, roughness: 0.78, metalness: 0.12 });
    const shortMat = new THREE.MeshStandardMaterial({ color: shortsColor, roughness: 0.85, metalness: 0.1 });
    const trimMat = new THREE.MeshStandardMaterial({ color: t.color2, roughness: 0.7, metalness: 0.18 });
    const bootMat = new THREE.MeshStandardMaterial({ color: '#1f2428', roughness: 0.68, metalness: 0.22 });
    const hairColors = ['#302a27', '#211d1b', '#5a3c2d', '#382c25'];
    const hairColor = player.appearance?.hair || hairColors[(player.number + team) % hairColors.length];

    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.31, 0.42, 12), shortMat); pelvis.position.y = 0.78; body.add(pelvis);
    const torso = capsuleMesh(0.32, 1.06, kitMat, 12); torso.position.y = 1.56; body.add(torso);
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.27, 10), kitMat); waist.position.y = 1.0; body.add(waist);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10), skinMat); neck.position.y = 2.35; body.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 20), skinMat); head.position.y = 2.76; body.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9, metalness: 0.05 }));
    hair.position.y = 2.93; body.add(hair);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), new THREE.MeshStandardMaterial({ color: '#1e1a18', roughness: 0.9 }));
    brow.position.set(0, 2.8, 0.23); body.add(brow);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat); ear.position.set(0, 2.74, side * 0.25); body.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.047, 10, 8), new THREE.MeshStandardMaterial({ color: '#1a1d1d', roughness: 0.7, metalness: 0.2 }));
      eye.position.set(side * 0.12, 2.78, 0.21); eye.scale.set(0.55, 0.8, 0.7); body.add(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), skinMat);
      cheek.position.set(side * 0.18, 2.64, 0.18); cheek.scale.set(0.7, 0.7, 0.7); body.add(cheek);
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), skinMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.64, 0.25); body.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: '#6d483f', roughness: 0.8 })); mouth.position.set(0, 2.54, 0.24); body.add(mouth);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 18), trimMat); collar.position.set(0.02, 2.03, 0); collar.rotation.y = Math.PI / 2; body.add(collar);
    [-0.16, 0, 0.16].forEach((z) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.08), trimMat);
      stripe.position.set(0.26, 1.55, z); body.add(stripe);
    });

    const legs = [], arms = [], lowerLegs = [];
    [-1, 1].forEach((side) => {
      const leg = new THREE.Group(); leg.position.set(side * 0.17, 0.48, 0); body.add(leg);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.52, 10), role === 'GK' ? shortMat : kitMat); thigh.position.y = -0.25; leg.add(thigh);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat); knee.position.y = -0.52; leg.add(knee);
      const shin = new THREE.Group(); shin.position.y = -0.54; leg.add(shin);
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.44, 10), skinMat); calf.position.y = -0.2; shin.add(calf);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 10), trimMat); sock.position.y = -0.38; shin.add(sock);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.18), bootMat); boot.position.set(0.08, -0.47, 0); shin.add(boot);
      legs.push(leg); lowerLegs.push(shin);

      const arm = new THREE.Group(); arm.position.set(side * 0.48, 1.8, 0); body.add(arm);
      const upperArm = capsuleMesh(0.1, 0.44, kitMat, 10); upperArm.position.y = -0.22; arm.add(upperArm);
      const forearm = new THREE.Group(); forearm.position.y = -0.5; arm.add(forearm);
      const forearmMesh = capsuleMesh(0.085, 0.38, skinMat, 10); forearmMesh.position.y = -0.2; forearm.add(forearmMesh);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), skinMat); hand.position.y = -0.43; forearm.add(hand);
      arms.push(arm);
    });
    g.add(body); g.userData.body = body;
    g.userData.limbs = { legs, arms, lowerLegs };
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center'; ctx.font = 'bold 68px Arial'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,14,11,.96)';
    const labelText = '#' + player.number + ' ' + player.name;
    ctx.strokeText(labelText, 256, 72, 500); ctx.fillStyle = '#f1eee6'; ctx.fillText(labelText, 256, 72, 500);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false, depthWrite: false }));
    label.position.y = 3.05; label.scale.set(4.2 / PLAYER_SCALE * 0.85, 1.0 / PLAYER_SCALE * 0.85, 1); label.visible = true; g.add(label);
    g.userData.nameLabel = label;
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; g.add(sh);
    scene.add(g); return g;
  }
  const meshes = game.players.map((p) => makePlayerMesh(p.team, p));
  const characterAnimation = new Array(game.players.length).fill(null);
  const diveEnv = new Array(game.players.length).fill(0);
  const getBone = (actor, names) => {
    for (const name of names) {
      const bone = actor.getObjectByName(name);
      if (bone) return bone;
    }
    return null;
  };
  const loadPlayerModel = (index = 0) => {
    const candidates = ['assets/models/casual-human.glb', 'assets/models/animated-human.glb'];
    const url = candidates[index];
    if (!url) {
      console.warn('No animated human model was found; falling back to primitive capsule players.');
      return;
    }
    new THREE.GLTFLoader().load(url, (gltf) => {
      const sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
      const sourceHeight = sourceBounds.getSize(new THREE.Vector3()).y || 1;
      const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
      const scale = 2.35 / sourceHeight;
      const clip = (suffix) => {
        const target = suffix.toLowerCase();
        return gltf.animations.find((animation) => {
          const name = (animation.name || '').toLowerCase();
          return name.includes(target) || name.endsWith('|' + target) || name.endsWith('/' + target);
        });
      };
      const clips = { idle: clip('Idle'), run: clip('Run'), jump: clip('Jump') };

      meshes.forEach((mesh, i) => {
        const player = game.players[i], team = CFG.teams[player.team];
        const actor = THREE.SkeletonUtils.clone(gltf.scene);
        actor.scale.setScalar(scale * 1.05); actor.rotation.y = Math.PI / 2;
        actor.position.set(-sourceCenter.x * scale, -sourceBounds.min.y * scale, -sourceCenter.z * scale);
        actor.traverse((object) => {
          if (!object.isSkinnedMesh) return;
          object.frustumCulled = false;
          const material = object.material && object.material.clone ? object.material.clone() : object.material;
          if (material && material.color) {
            const skinTone = player.appearance?.skin || ['#d8ad90', '#bd896a', '#986c53', '#e0bc9c', '#c79572', '#704a35', '#e0bc9d', '#966448'][(player.number + player.team * 3) % 8];
            if (material.name === 'Skin' || material.name === 'Face') material.color.set(skinTone);
            else if (material.name === 'Hair') material.color.set(player.appearance?.hair || ['#302a27', '#211d1b', '#5a3c2d', '#382c25'][(player.number + player.team) % 4]);
            else if (material.name === 'Shirt') material.color.set(team.color);
            else if (material.name === 'Pants') material.color.set(team.shortsColor || team.color);
            material.roughness = 0.88;
            material.metalness = 0.03;
            material.clearcoat = 0.12;
          }
          object.material = material;
        });

        const spine = getBone(actor, ['Spine1', 'Spine', 'Spine_01', 'Torso', 'Abdomen']);
        const hips = getBone(actor, ['Hips', 'Pelvis']);
        const head = getBone(actor, ['Head', 'HeadTop_End', 'Neck']);
        const leftLeg = getBone(actor, ['LeftUpLeg', 'LeftLeg', 'LeftUpperLeg', 'UpperLegL']);
        const rightLeg = getBone(actor, ['RightUpLeg', 'RightLeg', 'RightUpperLeg', 'UpperLegR']);
        const leftFoot = getBone(actor, ['LeftFoot', 'LeftToeBase', 'FootL']);
        const rightFoot = getBone(actor, ['RightFoot', 'RightToeBase', 'FootR']);
        const leftArm = getBone(actor, ['LeftArm', 'LeftUpperArm', 'UpperArmL']);
        const rightArm = getBone(actor, ['RightArm', 'RightUpperArm', 'UpperArmR']);
        const leftLower = getBone(actor, ['LowerArmL', 'LeftForeArm']), rightLower = getBone(actor, ['LowerArmR', 'RightForeArm']);
        if (head && url.includes('casual-human.glb')) head.scale.setScalar(0.84);
        if (spine) {
          const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0135, 0.037, 16), mat(player.role === 'GK' ? '#d4ae48' : team.color));
          shirt.position.y = 0.003; spine.add(shirt);
          const trim = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.001, 6, 16), mat(team.color2));
          trim.position.y = 0.019; spine.add(trim);
          [-1, 1].forEach((side) => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.032, 0.0007), mat(team.color2));
            stripe.position.set(side * 0.004, 0.003, 0.010); spine.add(stripe);
          });
        }
        if (hips) {
          const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.021, 14), mat(player.role === 'GK' ? '#273442' : (team.shortsColor || team.color)));
          shorts.position.y = -0.006; hips.add(shorts);
        }
        if (head) {
          const hair = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(['#302a27', '#211d1b', '#5a3c2d', '#382c25'][player.idx % 4]));
          hair.position.y = 0.001; head.add(hair);
          [-1, 1].forEach((side) => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0008, 8, 6), mat('#211d1b'));
            eye.position.set(side * 0.0018, 0.0006, 0.005); head.add(eye);
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 8, 6), mat('#bd896a'));
            ear.position.set(side * 0.0048, 0, 0); head.add(ear);
          });
          const nose = new THREE.Mesh(new THREE.SphereGeometry(0.001, 8, 6), mat('#bd896a'));
          nose.position.set(0, 0, 0.006); head.add(nose);
        }
        [leftFoot, rightFoot].forEach((foot) => {
          if (!foot) return;
          const boot = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0025, 0.012), mat('#202327'));
          boot.position.z = 0.003; foot.add(boot);
        });

        const mixer = new THREE.AnimationMixer(actor);
        const idle = clips.idle && mixer.clipAction(clips.idle), run = clips.run && mixer.clipAction(clips.run), jump = clips.jump && mixer.clipAction(clips.jump);
        [idle, run, jump].forEach((action) => { if (action) action.play(); });
        if (idle) idle.setEffectiveWeight(1);
        if (run) run.setEffectiveWeight(0);
        if (jump) jump.setEffectiveWeight(0);
        mesh.userData.body.visible = false; mesh.add(actor);
        characterAnimation[i] = { actor, mixer, idle, run, jump, leftLeg, rightLeg, leftArm, rightArm, leftLower, rightLower };
      });
    }, undefined, (error) => {
      if (index < candidates.length - 1) loadPlayerModel(index + 1);
      else console.error('Animated human model failed to load', error);
    });
  };
  loadPlayerModel();
  const rings = [0, 1].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.2, 28), new THREE.MeshBasicMaterial({ color: '#ece8dc', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.y = 0.06; r.visible = false; scene.add(r); return r;
  });
  const ballMesh = new THREE.Group(), ballRadius = game.BR;
  ballMesh.add(new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 20, 16), mat('#f4f2ea')));
  const phi = (1 + Math.sqrt(5)) / 2;
  const panelDirections = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
  panelDirections.forEach((values) => {
    const direction = new THREE.Vector3(...values).normalize();
    const panel = new THREE.Mesh(new THREE.CircleGeometry(0.15 * ballRadius / 0.48, 5), mat('#202327'));
    panel.position.copy(direction).multiplyScalar(ballRadius + 0.006);
    panel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); ballMesh.add(panel);
  });
  scene.add(ballMesh);
  const ballShadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.24 });
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(ballRadius * 1.1, 18), ballShadowMat); ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = 0.03; scene.add(ballShadow);
  const ballMarker = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32), new THREE.MeshBasicMaterial({ color: '#ffd34f', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  ballMarker.rotation.x = -Math.PI / 2; ballMarker.position.y = 0.045; scene.add(ballMarker);

  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // Kaleci dalışı: kollar vücudun "yukarı" yönüne (uçuş yönüne) düz uzanır.
  const _Y = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _id = new THREE.Quaternion(), _hand = new THREE.Vector3();
  function reachArms(m, a, w) {
    m.updateMatrixWorld(true); m.getWorldQuaternion(_q1);
    [[a.leftArm, a.leftLower, -1], [a.rightArm, a.rightLower, 1]].forEach((it) => {
      const arm = it[0], lower = it[1];
      if (!arm || !arm.parent) return;
      _v.set(0.12, 1, it[2] * 0.14).normalize().applyQuaternion(_q1);
      arm.parent.getWorldQuaternion(_q2).invert(); _v.applyQuaternion(_q2);
      _q2.setFromUnitVectors(_Y, _v); arm.quaternion.slerp(_q2, w);
      if (lower) lower.quaternion.slerp(_id, w);
    });
  }
  let holdW = 0;
  let camX = 0, camY = 34, camZ = 50, orbit = 0, tAnim = 0;
  function frame(dt) {
    tAnim += dt;
    const B = game.ball;
    game.players.forEach((p, i) => {
      const m = meshes[i], sp = Math.hypot(p.vx, p.vz);
      const dur = p.diveDur || 0.9, pr = p.diveT > 0 ? 1 - p.diveT / dur : 0;
      const e0 = p.role === 'GK' && p.diveT > 0 ? clamp(Math.min(pr / 0.2, (1 - pr) / 0.3, 1), 0, 1) : 0;
      const dive = e0 * e0 * (3 - 2 * e0); diveEnv[i] = dive;
      const slide = p.slideT > 0 ? Math.sin((1 - p.slideT / p.slideDuration) * Math.PI) : 0;
      const tr = p.diveTilt === undefined ? 1 : p.diveTilt, lift = p.diveLift || 0, tilt = dive * tr * 1.45, cH = 1.5;
      const side = (Math.cos(p.face) >= 0 ? 1 : -1) * (p.diveSide >= 0 ? 1 : -1);
      const hc = cH + dive * ((1 - tr) * (0.35 + lift * 0.8) + tr * (0.5 + lift * 1.1 - cH));
      const zOff = side * (dive * tr * 0.5 - cH * Math.sin(tilt));
      m.position.set(p.x - zOff * Math.sin(p.face), hc - cH * Math.cos(tilt) - slide * 0.14, p.z + zOff * Math.cos(p.face));
      m.rotation.y = -p.face; m.rotation.x = side * tilt;
      if (p.acroT > 0) { const ac = Math.sin((1 - p.acroT / 0.8) * Math.PI); m.position.y += ac * 1.1; m.rotation.z = ac * 1.35; } else m.rotation.z = 0;
      const run = Math.min(1, sp / 3.6), stride = Math.sin(tAnim * (8 + run * 5) + i * 0.8) * run;
      const limbs = m.userData.limbs;
      const kick = p.kickT > 0 ? Math.sin((1 - p.kickT / 0.42) * Math.PI) : 0, kickingLeg = p.kickSide;
      limbs.legs[0].rotation.z = stride * 0.72 + (kickingLeg === 0 ? kick * 1.45 : 0);
      limbs.legs[1].rotation.z = -stride * 0.72 + (kickingLeg === 1 ? kick * 1.45 : 0);
      limbs.lowerLegs[0].rotation.z = Math.max(0, -stride) * 0.95 + (kickingLeg === 0 ? kick * 0.9 : 0);
      limbs.lowerLegs[1].rotation.z = Math.max(0, stride) * 0.95 + (kickingLeg === 1 ? kick * 0.9 : 0);
      limbs.arms[0].rotation.z = -stride * 0.52 - (kickingLeg === 1 ? kick * 0.28 : 0);
      limbs.arms[1].rotation.z = stride * 0.52 - (kickingLeg === 0 ? kick * 0.28 : 0);
      m.userData.body.rotation.z = -0.06 * run + kick * 0.11 - slide * 0.8;
      m.userData.body.rotation.x = 0;
      if (p.role === 'GK') { limbs.arms[0].rotation.z -= dive * 0.65; limbs.arms[1].rotation.z += dive * 0.65; }
      m.userData.body.position.y = Math.sin(tAnim * 2 + i) * 0.012;
      const animation = characterAnimation[i];
      if (animation) {
        const motion = Math.min(1, sp / 3.2), jumping = p.role === 'GK' ? dive * 0.7 : 0;
        if (animation.idle) animation.idle.setEffectiveWeight((1 - Math.max(motion, slide)) * (1 - jumping));
        if (animation.run) { animation.run.setEffectiveWeight(Math.max(motion, slide * 0.8) * (1 - jumping)); animation.run.setEffectiveTimeScale(clamp(0.7 + sp * 0.16, 0.7, 2.2)); }
        if (animation.jump) animation.jump.setEffectiveWeight(jumping);
        animation.actor.rotation.z = -slide * 0.8;
        animation.mixer.update(dt);
        const armLift = game.state === 'throwin' && B.owner === p ? 1.05 : p.role === 'GK' && B.owner === p && game.state !== 'goalkick' ? 0.55 : 0;
        if (animation.leftArm) animation.leftArm.rotation.z -= armLift;
        if (animation.rightArm) animation.rightArm.rotation.z += armLift;
        const kickLeg = p.kickSide === 0 ? animation.leftLeg : animation.rightLeg;
        if (kickLeg && kick > 0) kickLeg.rotation.x += kick * 1.2;
        if (dive > 0.02) reachArms(m, animation, dive);
      }
      const labelNearPlay = Math.hypot(p.x - B.x, p.z - B.z) < 17;
      const isControlled = game.human[p.team] && game.ctrl[p.team] === p;
      m.userData.nameLabel.visible = !(shoot && shoot.k) && (labelNearPlay || isControlled);
    });
    rings.forEach((r, t) => {
      const c = playing && game.human[t] ? game.ctrl[t] : null;
      r.visible = !!c; if (c) r.position.set(c.x, 0.06, c.z);
    });
    ballMesh.position.set(B.x, B.y, B.z); ballMesh.rotation.z -= B.vx * dt / ballRadius; ballMesh.rotation.x += B.vz * dt / ballRadius;
    const holder = B.owner && B.owner.role === 'GK' ? B.owner : (shoot && shoot.k && shoot.k.hold ? shoot.k.keeper : null);
    const hi = holder ? game.players.indexOf(holder) : -1;
    holdW += ((hi >= 0 ? diveEnv[hi] : 0) - holdW) * Math.min(1, 16 * dt);
    if (hi >= 0 && holdW > 0.01) {   // dalışta top kalecinin avuçlarında
      meshes[hi].updateMatrixWorld(true); meshes[hi].localToWorld(_hand.set(0.1, 2.75, 0));
      ballMesh.position.set(B.x + (_hand.x - B.x) * holdW, B.y + (_hand.y - B.y) * holdW, B.z + (_hand.z - B.z) * holdW);
    }
    ballShadow.position.x = B.x; ballShadow.position.z = B.z;
    ballShadow.scale.setScalar(1 + Math.max(0, B.y - ballRadius) * 0.25);
    ballShadowMat.opacity = clamp(0.24 - Math.max(0, B.y - ballRadius) * 0.025, 0.06, 0.24);
    if (!playing || phase === 'end') {
      if (cam.fov !== 58) { cam.fov = 58; cam.updateProjectionMatrix(); }
      orbit += dt * 0.1;
      cam.position.set(Math.sin(orbit) * 36, 58, 52 + Math.cos(orbit) * 4); cam.lookAt(0, 0, 0);
    } else if (shoot && shoot.k) {
      if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
      const d = shoot.k.dir; cam.position.set(shoot.k.spotX - d * 9.5, 4.4, 0); cam.lookAt(d * (L / 2 - 6), 1.4, 0);
    } else if (game.state === 'corner') {
      if (cam.fov !== 48) { cam.fov = 48; cam.updateProjectionMatrix(); }
      const sideX = B.x < 0 ? -1 : 1, sideZ = B.z < 0 ? -1 : 1;
      camX += (B.x + sideX * 7 - camX) * Math.min(1, 2.2 * dt);
      camY += (17 - camY) * Math.min(1, 1.8 * dt);
      camZ += (B.z + sideZ * 10 - camZ) * Math.min(1, 2.2 * dt);
      cam.position.set(camX, camY, camZ); cam.lookAt(B.x - sideX * 5, 1, 0);
    } else {
      if (cam.fov !== 46) { cam.fov = 46; cam.updateProjectionMatrix(); }
      camX += (clamp(B.x * 0.85, -26, 26) - camX) * Math.min(1, 2.5 * dt);
      const nearGoal = clamp((Math.abs(B.x) - 26) / 20, 0, 1);
      camY += (34 - 8 * nearGoal - camY) * Math.min(1, 1.6 * dt);
      camZ += (50 - 11 * nearGoal - camZ) * Math.min(1, 1.6 * dt);
      cam.position.set(camX, camY, camZ); cam.lookAt(camX, 0, 2);
    }
    ballMarker.position.x = B.x; ballMarker.position.z = B.z;
    const markerPulse = 1 + Math.sin(tAnim * 5) * 0.06; ballMarker.scale.set(markerPulse, markerPulse, 1);
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
    const s = Math.ceil(game.time), c = shoot ? 'PEN' : String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (c !== lastClock) { lastClock = c; $('clock').textContent = c; }
    const sc = game.score.join('-'); if (sc !== lastScore) { lastScore = sc; $('sc0').textContent = game.score[0]; $('sc1').textContent = game.score[1]; }
    [0, 1].forEach((t) => {
      const player = game.human[t] ? game.ctrl[t] : null;
      $('active' + t).textContent = player ? '#' + player.number + ' ' + player.name + ' · Kondisyon %' + Math.round(player.stamina * 100) : '';
    });
  }
  let bannerTimer;
  function banner(html, ms, cls) {
    const b = $('banner'); b.innerHTML = html; b.classList.toggle('goal', cls === 'goal'); b.classList.add('on');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), ms || 1600);
  }
  function screen(id) { ['menu', 'lobby', 'end'].forEach((s) => $(s).classList.toggle('on', s === id)); }

  // ---------- ağ ----------
  const send = (slot, msg) => socket.emit('h2c', { slot, msg });
  const both = (msg) => socket.emit('h2c', { slot: null, msg });
  function phaseMsg(slot) {
    const t = slotTeam[slot];
    if (phase === 'match' && shoot) return { t: 'phase', phase: 'pen', team: t };
    if (phase === 'match') return { t: 'phase', phase: 'play', team: t };
    if (phase === 'end') return { t: 'phase', phase: 'end', team: t, score: game.score };
    return { t: 'phase', phase: 'pick', team: t, taken: slotTeam };
  }
  socket.on('slot:joined', (d) => {
    joined[d.slot] = true;
    if (phase === 'match') updateHumans();
    refreshLobby(); send(d.slot, phaseMsg(d.slot));
    if (shoot) setTimeout(() => penPrompt(d.slot), 300);
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
      if (slotTeam[0] !== null && slotTeam[1] !== null && joined[0] && joined[1]) setTimeout(beginMode, 900);
    } else if (m.t === 'mv' && playing && t !== null) game.setMove(t, clamp(+m.x || 0, -1, 1), clamp(+m.y || 0, -1, 1));
    else if (m.t === 'btn' && playing && t !== null) game.press(t, m.b, !!m.d, m);
    else if (m.t === 'aim' && playing && t !== null) game.restartKick(t, clamp(+m.x || 0, -1, 1), clamp(+m.y || 0, -1, 1), clamp(+m.p || 0, 0, 1));
    else if (m.t === 'penReady' && shoot && shoot.k && shoot.st === 'aim' && t !== null) {
      shoot.in[t === shoot.k.c.team ? 0 : 1] = { power: +m.power, ax: +m.ax, ay: +m.ay };
      if (shoot.in[0] && shoot.in[1]) {
        const k = shoot.k;
        k.R = FafiGame.resolvePenalty(shoot.in[0], shoot.in[1], k.shooter, k.keeper);
        shoot.st = 'run'; shoot.t = 0; both({ t: 'pen', s: 'go' }); snd('whistle');
      }
    } else if (m.t === 'rematch' && phase === 'end') beginMode();
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
    shoot = null; DOTS.classList.remove('on');
    game.start(minutes, game.human);
    lastClock = lastScore = ''; setTeamsHud();
    screen(null); $('hud').classList.add('on'); $('sndHud').classList.add('on');
    [0, 1].forEach((s) => send(s, { t: 'phase', phase: 'play', team: slotTeam[s] }));
    crowd(true); snd('whistle');
  }
  function onGameEvent(type, d) {
    if (['penalty', 'freekick', 'corner', 'throwin', 'goalkick'].includes(type)) both({ t: 'restart', kind: type, team: d.team });
    else if (type === 'gkhold') both({ t: 'restart', kind: 'goalkick', team: d.team, live: true });
    else if (type === 'restartEnd') both({ t: 'restartEnd' });
    if (type === 'kickoff' && playing) banner(game.score[0] + ' - ' + game.score[1], 1200);
    else if (type === 'whistle') snd('whistle');
    else if (type === 'kick') snd('kick');
    else if (type === 'post') { snd('kick'); both({ t: 'vib', ms: 70 }); }
    else if (type === 'acro') { both({ t: 'vib', ms: [60, 40, 90] }); }
    else if (type === 'tackle') { snd('kick'); both({ t: 'vib', ms: 45 }); }
    else if (type === 'shoulder') { snd('kick'); both({ t: 'vib', ms: 55 }); }
    else if (type === 'save') { snd('kick'); if (d.caught) both({ t: 'vib', ms: 45 }); }
    else if (type === 'penalty') { banner('PENALTİ!<small>' + CFG.teams[d.team].name + '</small>', 2200); snd('whistle'); both({ t: 'vib', ms: 180 }); }
    else if (type === 'freekick') { banner('SERBEST VURUŞ!<small>' + CFG.teams[d.team].name + '</small>', 2200); snd('whistle'); both({ t: 'vib', ms: 170 }); }
    else if (type === 'corner') { banner('KORNER!<small>' + CFG.teams[d.team].name + '</small>', 1800); snd('whistle'); both({ t: 'vib', ms: 100 }); }
    else if (type === 'throwin') { banner('TAÇ ATIŞI<small>' + CFG.teams[d.team].name + '</small>', 1500); snd('whistle'); }
    else if (type === 'goalkick') { banner('AUT<small>' + CFG.teams[d.team].name + ' · kaleci atıyor</small>', 1500); snd('whistle'); }
    else if (type === 'foul') { banner('FAUL!<small>' + CFG.teams[d.team].name + '</small>', 1800); snd('whistle'); both({ t: 'vib', ms: 130 }); }
    else if (type === 'offside') { banner('OFSAYT!<small>Serbest vuruş</small>', 1800); snd('whistle'); both({ t: 'vib', ms: 120 }); }
    else if (type === 'goal') {
      banner('GOL!<small>' + CFG.teams[d.team].name + '</small>', 2400, 'goal'); snd('goal');
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

  // ---------- penaltı atışları ----------
  const HL = L / 2, PGW = 3.0, DOTS = $('penDots');
  const RES_TXT = { goal: 'GOL!', save: 'KURTARDI!', post: 'DİREK!', miss: 'DIŞARI!' };
  function beginMode() { if (mode === 'pen') startShootout(); else startMatch(); }
  function scoreTxt() { const S = shoot.S; return CFG.teams[0].short + ' ' + S.score[0] + ' - ' + S.score[1] + ' ' + CFG.teams[1].short; }
  function dots() {
    const S = shoot.S, n = Math.max(5, S.kicks[0].length, S.kicks[1].length);
    DOTS.innerHTML = [0, 1].map((t) => '<div><b>' + CFG.teams[t].short + '</b>' + Array.from({ length: n }, (_, i) => {
      const r = S.kicks[t][i]; return '<i class="' + (r === 'g' ? 'g' : r ? 'm' : '') + '">' + (r === 'g' ? '●' : r ? '✕' : '○') + '</i>';
    }).join('') + '</div>').join('');
  }
  function penPrompt(slot) {
    const k = shoot && shoot.k; if (!k || shoot.st !== 'aim' || slotTeam[slot] === null) return;
    const side = slotTeam[slot] === k.c.team ? 0 : 1; if (shoot.in[side]) return;
    send(slot, { t: 'pen', s: 'start', role: side === 0 ? 'shoot' : 'keep', top: '#' + k.shooter.number + ' ' + k.shooter.name + (side === 0 ? ' (sen)' : ' şut çekiyor'), score: scoreTxt() });
  }
  function startShootout() {
    if (phase !== 'lobby' && phase !== 'end') return;
    phase = 'match'; playing = true; updateHumans();
    game.start(minutes, [false, false]);
    shoot = { S: FafiGame.createShootout(), st: 'intro', t: 0, k: null, in: [null, null] };
    game.score = shoot.S.score; lastClock = lastScore = ''; setTeamsHud();
    screen(null); $('hud').classList.add('on'); $('sndHud').classList.add('on'); DOTS.classList.add('on'); dots();
    [0, 1].forEach((s) => send(s, { t: 'phase', phase: 'pen', team: slotTeam[s] }));
    crowd(true); snd('whistle'); banner('PENALTI ATIŞLARI<small>5 atış · eşitlikte seri sürer</small>', 2300);
  }
  function nextKick() {
    const S = shoot.S, c = S.current(), dir = c.team === 0 ? 1 : -1;
    const shooter = game.teams[c.team][c.idx], keeper = game.teams[c.keeperTeam][0], spotX = dir * (HL - 11);
    game.players.forEach((p, i) => {
      const a = i / game.players.length * Math.PI * 2;
      p.x = Math.cos(a) * 9.5; p.z = Math.sin(a) * 9.5; p.vx = p.vz = 0; p.face = a + Math.PI; p.kickT = p.diveT = p.slideT = 0;
    });
    shooter.x = spotX - dir * 3.6; shooter.z = 1.8; shooter.face = dir === 1 ? 0 : Math.PI; shooter.kickSide = 1;
    keeper.x = dir * (HL - 0.8); keeper.z = 0; keeper.face = dir === 1 ? Math.PI : 0;
    const B = game.ball; B.owner = null; B.x = spotX; B.y = game.BR; B.z = 0; B.vx = B.vy = B.vz = 0;
    shoot.k = { c, dir, shooter, keeper, spotX, R: null, kicked: false, dived: false, fin: false, bv: null, t1: 0 };
    shoot.in = [null, null]; shoot.st = 'aim'; shoot.t = 0;
    banner('#' + shooter.number + ' ' + shooter.name + '<small>' + CFG.teams[c.team].name + ' · ' + (S.n + 1) + '. atış</small>', 1800);
    dots(); [0, 1].forEach(penPrompt);
  }
  function ballFree(dt) {
    const k = shoot.k, B = game.ball, v = k && k.bv; if (!v) return;
    B.x += v.x * dt; B.z += v.z * dt; B.y += v.y * dt; v.y -= 19 * dt;
    if (B.y < game.BR) { B.y = game.BR; v.y = v.y < -1.5 ? -v.y * 0.3 : 0; }
    const f = Math.exp(-1.6 * dt); v.x *= f; v.z *= f;
    const lim = HL + (k.R.result === 'miss' ? 8 : 2.2); if (Math.abs(B.x) > lim) { B.x = Math.sign(B.x) * lim; v.x = 0; }
    B.vx = v.x; B.vz = v.z;
  }
  function keeperStep(k) {
    const gk = k.keeper, R = k.R;
    if (k.t1 > 0 && !k.dived) {
      k.dived = true;
      if (Math.hypot(R.K.x, R.K.y - 0.35) > 0.2) {
        gk.diveDur = Math.max(1.1, R.dur + 0.75); gk.diveT = gk.diveDur; gk.diveSide = Math.sign(R.K.x * k.dir) || 1;
        gk.diveTilt = clamp(Math.abs(R.K.x) / 0.5, 0, 1); gk.diveLift = clamp(R.K.y / 0.9, 0, 1);
      }
    }
    if (k.dived) gk.z = k.dir * R.K.x * PGW * clamp((k.t1 - 0.1) / R.dur, 0, 1);
  }
  function shootStep(dt) {
    const s = shoot; s.t += dt;
    if (s.st === 'intro') { if (s.t > 2.4) nextKick(); return; }
    const k = s.k; if (!k) return;
    game.players.forEach((p) => { p.kickT = Math.max(0, p.kickT - dt); p.diveT = Math.max(0, p.diveT - dt); });
    const B = game.ball;
    if (s.st === 'result') {
      k.t1 += dt; keeperStep(k); ballFree(dt);
      if (k.hold) { const g = k.keeper; B.x = g.x + Math.cos(g.face) * 0.8; B.y = 1.2; B.z = g.z + Math.sin(g.face) * 0.8; B.vx = B.vz = B.vy = 0; }
      if (s.t > 2.8) { if (s.S.done) { s.k = null; onGameEvent('end', { score: s.S.score.slice() }); } else nextKick(); }
      return;
    }
    if (s.st !== 'run') return;
    const T = s.t, R = k.R, sh = k.shooter, dir = k.dir;
    sh.vx = T > 0.4 && T < 1.05 ? dir * 3.4 : 0; sh.x += sh.vx * dt; sh.z = 1.8 - 1.35 * clamp((T - 0.4) / 0.65, 0, 1);
    if (!k.kicked && T >= 0.9) { k.kicked = true; sh.kickT = 0.42; snd('kick'); }
    k.t1 = T - 1.1; keeperStep(k);
    if (k.t1 <= 0) return;
    const u = clamp(k.t1 / R.tb, 0, 1), ex = dir * HL, ey = 0.5 + R.ty * 1.4, ez = dir * R.tx * PGW;
    B.x = k.spotX + (ex - k.spotX) * u; B.z = ez * u;
    B.y = game.BR + (ey - game.BR) * u + 0.4 * Math.sin(Math.PI * u) * Math.min(1, R.ty * 2);
    B.vx = (ex - k.spotX) / R.tb; B.vz = ez / R.tb;
    if (u < 1) return;
    const r = R.result, vx = B.vx, vz = B.vz;
    k.bv = r === 'goal' ? { x: vx * 0.22, y: 0, z: vz * 0.15 }
      : r === 'miss' ? { x: vx * 0.5, y: 2, z: vz * 0.4 }
      : r === 'save' ? { x: -dir * 3, y: 3.5, z: (Math.random() - 0.5) * 8 }
      : { x: -dir * 7, y: 3.5, z: Math.sign(R.tx || 1) * dir * 2 };
    if (r === 'save') { k.hold = true; k.bv = null; }
    s.st = 'result'; s.t = 0; s.S.record(r);
    banner(RES_TXT[r] + '<small>' + scoreTxt() + '</small>', 2400);
    if (r === 'goal') { snd('goal'); both({ t: 'vib', ms: [200, 80, 200] }); } else { snd('kick'); both({ t: 'vib', ms: 90 }); }
    both({ t: 'pen', s: 'result', result: r, score: scoreTxt() }); dots();
  }

  // ---------- düğmeler ----------
  // Tek dokunuşta aç: hem pointerup hem click dinlenir, çift tetiklenmeyi zaman koruması engeller.
  let lastOpen = 0;
  const bindMenu = (id, m) => {
    const go = () => { const n = Date.now(); if (n - lastOpen < 800 || phase === 'lobby') return; lastOpen = n; mode = m; openLobby(); };
    $(id).addEventListener('pointerup', go); $(id).addEventListener('click', go);
  };
  bindMenu('playBtn', 'match'); bindMenu('penModeBtn', 'pen');
  $('sndBtn').onclick = () => { loadAudio(); setMuted(!muted); };
  $('sndHud').onclick = () => setMuted(!muted);
  $('lobbyBack').onclick = $('toMenu').onclick = () => location.reload();
  $('rematch').onclick = () => { screen(null); beginMode(); };
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
    if (playing && phase !== 'end') { if (shoot) shootStep(dt); else game.update(dt); hudTick(); }
    frame(dt); renderer.render(scene, cam);
    requestAnimationFrame(loop);
  })(last);
})();
