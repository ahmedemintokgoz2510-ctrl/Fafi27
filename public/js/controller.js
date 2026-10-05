// Fafi 27 - telefon (gamepad) tarafı
(function () {
  'use strict';
  const CFG = window.FAFI, $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let room = (params.get('room') || '').toUpperCase(), slot = null, myTeam = null, phase = 'join', sprintEnabled = false, restartKind = null;
  const socket = io({ transports: ['websocket', 'polling'] });
  const buttonClick = new Audio('/assets/sounds/button-click.mp3');
  buttonClick.preload = 'auto'; buttonClick.volume = 0.3;
  function playButtonClick() {
    const sound = buttonClick.cloneNode(); sound.volume = 0.3; sound.play().catch(() => {});
  }
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest && event.target.closest('button, .card')) playButtonClick();
  });

  function show(id) {
    ['join', 'wait', 'pick', 'end'].forEach((s) => $(s).classList.toggle('on', s === id));
    $('pad').classList.toggle('on', id === 'pad'); $('pen').classList.remove('on');
  }
  function wait(title, msg) { $('waitTitle').textContent = title; $('waitMsg').textContent = msg || ''; show('wait'); }

  // ---------- bağlanma ----------
  function join() {
    if (!room) return show('join');
    wait('Bağlanılıyor');
    socket.emit('ctrl:join', { code: room }, (r) => {
      if (!r || !r.ok) { $('joinMsg').textContent = (r && r.error) || 'Bağlanılamadı'; room = ''; return show('join'); }
      slot = r.slot; wait('Bağlandı', 'Oyuncu ' + (slot + 1) + ' olarak katıldın. Tahtadan devam ediliyor.');
    });
  }
  socket.on('connect', () => { if (room) join(); });
  $('joinBtn').onclick = () => { room = $('code').value.trim().toUpperCase(); join(); };
  if (!room) show('join');

  // ---------- takım seçimi ----------
  function drawCards(taken) {
    const box = $('cards'); box.innerHTML = '';
    CFG.teams.forEach((t, i) => {
      const c = document.createElement('div');
      const lost = taken && taken[1 - slot] === i;
      c.className = 'card' + (myTeam === i ? ' mine' : '') + (lost ? ' taken' : '');
      c.innerHTML = (t.logo ? '<img src="' + t.logo + '" alt="">' : '<div class="sw" style="background:' + t.color + '"></div>') + '<b>' + t.name + '</b>';
      c.onclick = () => { if (!lost) { $('pickMsg').textContent = ''; socket.emit('c2h', { t: 'pick', team: i }); } };
      box.appendChild(c);
    });
    $('pickMsg').textContent = myTeam !== null ? 'Rakibin seçimi bekleniyor' : '';
  }

  // ---------- tahtadan gelen mesajlar ----------
  socket.on('h2c', (m) => {
    if (m.t === 'phase') {
      phase = m.phase; myTeam = m.team === undefined ? null : m.team;
      if (m.phase === 'pick') { show('pick'); drawCards(m.taken); }
      else if (m.phase === 'play') openPad();
      else if (m.phase === 'pen') { myTeam = m.team === undefined ? null : m.team; openPen(); }
      else if (m.phase === 'end') {
        const [a, b] = m.score || [0, 0];
        $('endTitle').textContent = a === b ? 'Berabere' : (a > b ? 0 : 1) === myTeam ? 'Kazandın' : 'Kaybettin';
        $('endScore').textContent = CFG.teams[0].name + ' ' + a + ' - ' + b + ' ' + CFG.teams[1].name;
        show('end');
      }
    } else if (m.t === 'pen') { penMsg(m);
    } else if (m.t === 'taken') {
      if (phase === 'pick') { myTeam = m.taken[slot]; drawCards(m.taken); }
    } else if (m.t === 'pickFail') { $('pickMsg').textContent = 'Bu takım seçildi, diğerini seç'; }
    else if (m.t === 'restart') {
      if (m.team === myTeam) restartKind = m.kind;
      else if (m.live) return;                     // kaleci topu tuttu: rakip normal oynamaya devam eder
      else restartKind = 'defend';
      $('hint').textContent = restartKind === 'defend' ? 'SAVUNMA' : 'HEDEFİ SEÇ';
      if (AIM_KINDS[restartKind]) openAim(restartKind); else closeAim();
    } else if (m.t === 'restartEnd') {
      restartKind = null; $('hint').textContent = 'HAREKET'; sx = sy = 0; closeAim();
      socket.emit('c2h', { t: 'mv', x: 0, y: 0 });
    } else if (m.t === 'vib' && navigator.vibrate) navigator.vibrate(m.ms);
    else if (m.t === 'hostLeft') { phase = 'join'; wait('Bağlantı koptu', 'Tahtadaki oyun kapandı. QR kodu yeniden okut.'); }
  });
  $('again').onclick = () => socket.emit('c2h', { t: 'rematch' });

  // ---------- gamepad ----------
  function openPad() {
    const t = CFG.teams[myTeam] || CFG.teams[0];
    restartKind = null; $('hint').textContent = 'HAREKET'; closeAim();
    document.documentElement.style.setProperty('--team', t.color);
    $('teamName').textContent = t.name + ' · v3';
    setSprintState(false, false);
    show('pad');
    restoreControlLayout();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  }

  function setSprintState(enabled, notify) {
    sprintEnabled = enabled;
    $('bSprint').classList.toggle('active', enabled);
    $('bSprint').setAttribute('aria-pressed', String(enabled));
    if (notify) socket.emit('c2h', { t: 'btn', b: 'sprint', d: enabled });
  }

  const R = 60, left = $('left'), base = $('base'), knob = $('knob');
  let stickId = null, ox = 0, oy = 0, vx = 0, vy = 0, sx = 0, sy = 0;
  left.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId; left.setPointerCapture(stickId);
    const r = left.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
    base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.style.bottom = 'auto'; base.style.margin = '-75px 0 0 -75px'; base.classList.add('active'); $('hint').style.display = 'none';
    move(e);
  });
  left.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) move(e); });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null; vx = vy = 0; base.classList.remove('active');
    base.style.removeProperty('left'); base.style.removeProperty('top'); base.style.removeProperty('bottom'); base.style.removeProperty('margin');
    knob.style.transform = ''; $('hint').style.display = '';
    sx = sy = 0;
    if (!restartKind) socket.emit('c2h', { t: 'mv', x: 0, y: 0 });
  };
  left.addEventListener('pointerup', endStick); left.addEventListener('pointercancel', endStick);
  function move(e) {
    const r = left.getBoundingClientRect();
    let dx = e.clientX - r.left - ox, dy = e.clientY - r.top - oy;
    const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    vx = dx / R; vy = dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  setInterval(() => {
    if (phase !== 'play' || stickId === null) return;
    if (Math.abs(vx - sx) > 0.02 || Math.abs(vy - sy) > 0.02) {
      sx = vx; sy = vy; socket.emit('c2h', { t: 'mv', x: +vx.toFixed(2), y: +vy.toFixed(2) });
    }
  }, 33);

  // ---------- aut / taç / korner modu ----------
  // Gamepad yerine tam ekran nişan alanı: parmağı atılacak yöne düz çek, uzunluk = güç, bırak = at.
  const AIM_KINDS = {
    goalkick: { title: 'AUT', sub: 'Nereye atacaksan parmağını o yöne düz çek, bırakınca kaleci atar.' },
    throwin: { title: 'TAÇ', sub: 'Atacağın yöne parmağını çek. Uzun çek = uzağa, kısa çek = yakına.' },
    corner: { title: 'KORNER', sub: 'Ortalayacağın yöne parmağını çek. Uzun çek = sert orta.' }
  };
  const aimCv = $('aimCv'), ax2 = aimCv.getContext('2d');
  const AIM_MIN = 28;                 // bundan kısa çekiş "iptal" sayılır
  const A = { on: false, pid: null, x0: 0, y0: 0, x1: 0, y1: 0, sent: false, raf: 0 };
  const aimMax = () => Math.min(innerWidth, innerHeight) * 0.62;
  function aimSize() { const r = Math.min(devicePixelRatio || 1, 2); aimCv.width = innerWidth * r; aimCv.height = innerHeight * r; ax2.setTransform(r, 0, 0, r, 0, 0); }
  addEventListener('resize', aimSize);
  function openAim(kind) {
    const k = AIM_KINDS[kind]; if (!k) return;
    $('aimTitle').textContent = k.title; $('aimSub').textContent = k.sub;
    A.on = true; A.pid = null; A.sent = false; $('aimPowerFill').style.width = '0';
    stickId = null; vx = vy = 0; base.classList.remove('active');
    $('pad').classList.add('restart'); aimSize();
    if (navigator.vibrate) navigator.vibrate(40);
    if (!A.raf) A.raf = requestAnimationFrame(aimDraw);
  }
  function closeAim() {
    A.on = false; A.pid = null; $('pad').classList.remove('restart');
    ax2.clearRect(0, 0, innerWidth, innerHeight);
  }
  const aimVec = () => {
    const dx = A.x1 - A.x0, dy = A.y1 - A.y0, len = Math.hypot(dx, dy);
    return { dx, dy, len, power: Math.min(1, len / aimMax()) };
  };
  $('aim').addEventListener('pointerdown', (e) => {
    if (!A.on || A.sent || A.pid !== null) return;
    A.pid = e.pointerId; $('aim').setPointerCapture(A.pid);
    A.x0 = A.x1 = e.clientX; A.y0 = A.y1 = e.clientY;
  });
  $('aim').addEventListener('pointermove', (e) => {
    if (e.pointerId !== A.pid) return;
    A.x1 = e.clientX; A.y1 = e.clientY;
    $('aimPowerFill').style.width = Math.round(aimVec().power * 100) + '%';
  });
  function aimRelease(e) {
    if (e.pointerId !== A.pid) return;
    A.pid = null;
    const v = aimVec();
    if (v.len < AIM_MIN) { $('aimPowerFill').style.width = '0'; return; }   // çok kısa: tekrar çek
    A.sent = true;
    socket.emit('c2h', { t: 'aim', x: +(v.dx / v.len).toFixed(3), y: +(v.dy / v.len).toFixed(3), p: +v.power.toFixed(3) });
    if (navigator.vibrate) navigator.vibrate(30);
  }
  $('aim').addEventListener('pointerup', aimRelease);
  $('aim').addEventListener('pointercancel', aimRelease);
  function aimDraw() {
    A.raf = requestAnimationFrame(aimDraw);
    if (!A.on) return;
    const c = ax2; c.clearRect(0, 0, innerWidth, innerHeight);
    if (A.pid === null && !A.sent) return;
    const v = aimVec(); if (v.len < 4) return;
    const ux = v.dx / v.len, uy = v.dy / v.len, ok = v.len >= AIM_MIN;
    const col = A.sent ? '#ece8dc' : ok ? '#f5d183' : 'rgba(236,232,220,.4)';
    c.lineCap = 'round'; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 6;
    c.beginPath(); c.arc(A.x0, A.y0, 14, 0, 7); c.globalAlpha = .35; c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.moveTo(A.x0, A.y0); c.lineTo(A.x1, A.y1); c.stroke();
    const ah = 22; c.beginPath();
    c.moveTo(A.x1, A.y1);
    c.lineTo(A.x1 - ux * ah - uy * ah * 0.55, A.y1 - uy * ah + ux * ah * 0.55);
    c.lineTo(A.x1 - ux * ah + uy * ah * 0.55, A.y1 - uy * ah - ux * ah * 0.55);
    c.closePath(); c.fill();
  }

  // tuşlar
  const activeButtonReleases = new Map();
  const layoutKey = 'fafi27-control-layout-v1';
  const layoutButtonIds = ['bShoot', 'bPass', 'bThrough', 'bSwitch', 'bSprint', 'bPressure', 'bSlide'];
  let layoutEditing = false, draggedControl = null, dragPointer = null, dragOffsetX = 0, dragOffsetY = 0;
  let controlPositions = {};

  function setControlPosition(el, x, y) {
    const rect = el.getBoundingClientRect();
    const px = Math.max(rect.width / 2 + 8, Math.min(innerWidth - rect.width / 2 - 8, x));
    const py = Math.max(rect.height / 2 + 8, Math.min(innerHeight - rect.height / 2 - 8, y));
    el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.left = (px / innerWidth * 100) + '%'; el.style.top = (py / innerHeight * 100) + '%';
    el.style.transform = 'translate(-50%, -50%)';
    controlPositions[el.id] = { x: px / innerWidth, y: py / innerHeight };
  }

  function restoreControlLayout() {
    try {
      const stored = JSON.parse(localStorage.getItem(layoutKey) || '{}');
      layoutButtonIds.forEach((id) => {
        const position = stored[id];
        if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
          setControlPosition($(id), position.x * innerWidth, position.y * innerHeight);
        }
      });
    } catch (e) { controlPositions = {}; }
  }

  function beginControlDrag(e, el) {
    e.preventDefault(); e.stopPropagation();
    const rect = el.getBoundingClientRect();
    draggedControl = el; dragPointer = e.pointerId;
    dragOffsetX = e.clientX - (rect.left + rect.width / 2);
    dragOffsetY = e.clientY - (rect.top + rect.height / 2);
    el.setPointerCapture(e.pointerId);
  }

  document.addEventListener('pointermove', (e) => {
    if (!layoutEditing || !draggedControl || e.pointerId !== dragPointer) return;
    e.preventDefault();
    setControlPosition(draggedControl, e.clientX - dragOffsetX, e.clientY - dragOffsetY);
  }, { passive: false });
  document.addEventListener('pointerup', (e) => {
    if (e.pointerId !== dragPointer) return;
    draggedControl = null; dragPointer = null;
  });
  document.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== dragPointer) return;
    draggedControl = null; dragPointer = null;
  });

  $('layoutToggle').addEventListener('click', () => {
    layoutEditing = !layoutEditing;
    $('pad').classList.toggle('editing', layoutEditing);
    $('layoutToggle').textContent = layoutEditing ? 'BİTTİ' : 'DÜZEN';
    $('layoutToggle').setAttribute('aria-label', layoutEditing ? 'Konumları kaydet ve çık' : 'Buton konumlarını düzenle');
    if (!layoutEditing) {
      try { localStorage.setItem(layoutKey, JSON.stringify(controlPositions)); } catch (e) {}
    }
  });
  $('layoutReset').addEventListener('click', () => {
    controlPositions = {};
    try { localStorage.removeItem(layoutKey); } catch (e) {}
    layoutButtonIds.forEach((id) => {
      const el = $(id);
      ['left', 'top', 'right', 'bottom', 'transform'].forEach((property) => el.style.removeProperty(property));
    });
  });

  function bindBtn(id, name) {
    const el = $(id); let pid = null, startedAt = 0, startY = 0, loft = false, chargeRafId = 0;
    const fill = name === 'shoot' ? $('chargeFill') : name === 'pass' ? $('passChargeFill') : name === 'through' ? $('throughChargeFill') : name === 'slide' ? $('slideChargeFill') : null;
    function updateCharge() {
      if (pid === null || !fill) return;
      fill.style.width = Math.min(1, (performance.now() - startedAt) / 1200) * 100 + '%';
      chargeRafId = requestAnimationFrame(updateCharge);
    }
    function release(e) {
      if (e.pointerId !== pid) return;
      const releasedPointer = pid;
      pid = null; activeButtonReleases.delete(releasedPointer); el.classList.remove('on', 'loft');
      const hold = Math.min(1.2, Math.max(0, (performance.now() - startedAt) / 1000));
      socket.emit('c2h', { t: 'btn', b: name, d: false, hold, loft });
      if (chargeRafId) cancelAnimationFrame(chargeRafId);
      if (fill) fill.style.width = '0';
      loft = false;
    }
    el.addEventListener('pointerdown', (e) => {
      if (layoutEditing) { beginControlDrag(e, el); return; }
      if (pid !== null) return; pid = e.pointerId; el.setPointerCapture(pid); el.classList.add('on');
      startedAt = performance.now(); startY = e.clientY; loft = false;
      activeButtonReleases.set(pid, release);
      socket.emit('c2h', { t: 'btn', b: name, d: true });
      if (navigator.vibrate) navigator.vibrate(12);
      if (fill) updateCharge();
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || (name !== 'shoot' && name !== 'pass')) return;
      loft = startY - e.clientY > Math.max(42, innerHeight * 0.09);
      el.classList.toggle('loft', loft);
    });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }
  bindBtn('bShoot', 'shoot'); bindBtn('bPass', 'pass'); bindBtn('bThrough', 'through'); bindBtn('bSwitch', 'switch');
  bindBtn('bPressure', 'pressure'); bindBtn('bSlide', 'slide');

  const sprintButton = $('bSprint'); let sprintPointer = null;
  sprintButton.addEventListener('pointerdown', (e) => {
    if (layoutEditing) { beginControlDrag(e, sprintButton); return; }
    if (sprintPointer !== null) return;
    sprintPointer = e.pointerId; sprintButton.setPointerCapture(sprintPointer);
    setSprintState(!sprintEnabled, true);
    if (navigator.vibrate) navigator.vibrate(12);
  });
  const releaseSprint = (e) => { if (e.pointerId === sprintPointer) sprintPointer = null; };
  sprintButton.addEventListener('pointerup', releaseSprint);
  sprintButton.addEventListener('pointercancel', releaseSprint);
  const releaseHeldButtons = () => activeButtonReleases.forEach((release, pointerId) => release({ pointerId }));
  window.addEventListener('blur', releaseHeldButtons);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseHeldButtons(); });

  // ---------- penaltı modu ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pc = $('penCv'), px = pc.getContext('2d');
  const P = { step: 'wait', role: 'shoot', power: 0, ax: 0, ay: 0, has: false, t0: 0, drag: false, res: '' };
  const penPower = (now) => 1 - Math.abs(((now - P.t0) / 750) % 2 - 1);   // 0 yeşil .. 1 kırmızı, gidip gelir
  function penSize() { const r = Math.min(devicePixelRatio || 1, 2); pc.width = innerWidth * r; pc.height = innerHeight * r; px.setTransform(r, 0, 0, r, 0, 0); }
  addEventListener('resize', penSize);
  function geo() {
    const W = innerWidth, H = innerHeight, gh = Math.min(H * 0.36, W * 0.17), gy = H * 0.22;
    return { W, H, gh, gw: gh * 3, gx: W / 2 - gh * 1.5, gy, gb: gy + gh, by: H - 40, bx: W * 0.06, bw: W * 0.56, bh: 22 };
  }
  function penUi() {
    const sh = P.role === 'shoot', show1 = { gate: 'penGate', power: 'penLock', aim: 'penReady' }[P.step];
    ['penGate', 'penLock', 'penReady'].forEach((id) => { $(id).style.display = id === show1 && (id !== 'penReady' || P.has) ? 'block' : 'none'; });
    $('penMsg').textContent = ({
      wait: 'Bekleniyor…',
      gate: sh ? 'Sıra sende, şutçusun. Hazır olunca ekranı aç.' : 'Rakip penaltı atacak, kalecisin. Hazır olunca ekranı aç.',
      power: sh ? 'Çubuğa dokunarak gücü sabitle. Kırmızı: sert ama riskli.' : 'Çubuğa dokunarak gücü sabitle. Kırmızı: çok hızlı atlarsın.',
      aim: sh ? 'Parmağını sürükle: topun gideceği yeri seç, sonra HAZIR.' : 'Parmağını sürükle: atlayacağın yeri seç, sonra HAZIR.',
      sent: 'Rakip bekleniyor…', watch: ''
    })[P.step] || '';
  }
  function penMsg(m) {
    if (m.score) $('penScore').textContent = m.score;
    if (m.s === 'start') { Object.assign(P, { role: m.role, step: 'gate', has: false, res: '' }); $('penWho').textContent = m.top || ''; }
    else if (m.s === 'go') { P.step = 'watch'; P.res = 'Atış!'; }
    else if (m.s === 'result') {
      P.step = 'watch'; P.res = { goal: 'GOL!', save: 'KURTARILDI!', post: 'DİREK!', miss: 'DIŞARI!' }[m.result] || '';
      if (navigator.vibrate) navigator.vibrate(m.result === 'goal' ? [120, 60, 120] : 60);
    }
    penUi();
  }
  function openPen() {
    const t = CFG.teams[myTeam] || CFG.teams[0];
    document.documentElement.style.setProperty('--team', t.color);
    P.step = 'wait'; show('pen'); $('pen').classList.add('on'); penSize(); penUi();
  }
  function lockPower() { P.power = penPower(performance.now()); P.step = 'aim'; penUi(); if (navigator.vibrate) navigator.vibrate(15); }
  function aimFrom(e) {
    const g = geo(); if (e.clientY > g.by - 16) return;
    const sh = P.role === 'shoot';
    P.ax = clamp((e.clientX - (g.gx + g.gw / 2)) / (g.gw / 2), sh ? -1.3 : -1, sh ? 1.3 : 1);
    P.ay = clamp((g.gb - e.clientY) / g.gh, 0, sh ? 1.3 : 1);
    if (!P.has) { P.has = true; penUi(); }
  }
  pc.addEventListener('pointerdown', (e) => {
    if (P.step === 'power') return lockPower();
    if (P.step === 'aim') { P.drag = true; pc.setPointerCapture(e.pointerId); aimFrom(e); }
  });
  pc.addEventListener('pointermove', (e) => { if (P.drag) aimFrom(e); });
  pc.addEventListener('pointerup', () => { P.drag = false; }); pc.addEventListener('pointercancel', () => { P.drag = false; });
  $('penGate').onclick = () => { P.step = 'power'; P.t0 = performance.now(); penUi(); };
  $('penLock').onclick = lockPower;
  $('penReady').onclick = () => {
    if (!P.has || P.step !== 'aim') return;
    P.step = 'sent'; penUi();
    socket.emit('c2h', { t: 'penReady', power: +P.power.toFixed(3), ax: +P.ax.toFixed(3), ay: +P.ay.toFixed(3) });
  };
  function penDraw(now) {
    requestAnimationFrame(penDraw);
    if (!$('pen').classList.contains('on')) return;
    const g = geo(), c = px, cx = g.gx + g.gw / 2, sh = P.role === 'shoot';
    c.clearRect(0, 0, g.W, g.H);
    c.fillStyle = '#12261a'; c.fillRect(0, g.gb, g.W, g.H - g.gb);
    c.strokeStyle = 'rgba(236,232,220,.12)'; c.lineWidth = 1; c.beginPath();
    for (let i = 1; i < 16; i++) { c.moveTo(g.gx + g.gw * i / 16, g.gy); c.lineTo(g.gx + g.gw * i / 16, g.gb); }
    for (let i = 1; i < 5; i++) { c.moveTo(g.gx, g.gy + g.gh * i / 5); c.lineTo(g.gx + g.gw, g.gy + g.gh * i / 5); }
    c.stroke();
    c.strokeStyle = '#ece8dc'; c.lineWidth = 5; c.beginPath(); c.moveTo(g.gx, g.gb); c.lineTo(g.gx, g.gy); c.lineTo(g.gx + g.gw, g.gy); c.lineTo(g.gx + g.gw, g.gb); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(g.gx - 20, g.gb); c.lineTo(g.gx + g.gw + 20, g.gb); c.stroke();
    const kw = g.gh * 0.3, kh = g.gh * 0.62;
    const keeper = (x, a) => {
      c.globalAlpha = a; c.fillStyle = '#d4ae48'; c.fillRect(x - kw / 2, g.gb - kh, kw, kh * 0.62);
      c.fillStyle = '#273442'; c.fillRect(x - kw / 2, g.gb - kh * 0.38, kw, kh * 0.38);
      c.fillStyle = '#d9b595'; c.beginPath(); c.arc(x, g.gb - kh - kw * 0.28, kw * 0.3, 0, 7); c.fill();
      c.strokeStyle = '#d4ae48'; c.lineWidth = kw * 0.2; c.beginPath();
      c.moveTo(x - kw / 2, g.gb - kh * 0.95); c.lineTo(x - kw * 1.2, g.gb - kh * 1.2); c.moveTo(x + kw / 2, g.gb - kh * 0.95); c.lineTo(x + kw * 1.2, g.gb - kh * 1.2); c.stroke();
      c.globalAlpha = 1;
    };
    keeper(cx, 1);
    const tx = cx + P.ax * g.gw / 2, ty = g.gb - P.ay * g.gh, bx = cx, by = g.gb + (g.by - g.gb) * 0.5;
    if (P.has && (P.step === 'aim' || P.step === 'sent')) {
      c.strokeStyle = '#bfa56a'; c.lineWidth = 3; c.setLineDash([9, 7]); c.beginPath();
      if (sh) { c.moveTo(bx, by); c.lineTo(tx, ty); } else { keeper(tx, 0.45); c.moveTo(cx, g.gb - kh / 2); c.lineTo(tx, ty); }
      c.stroke(); c.setLineDash([]); c.beginPath(); c.arc(tx, ty, 11, 0, 7); c.stroke();
    }
    if (sh) {
      c.fillStyle = '#f4f2ea'; c.beginPath(); c.arc(bx, by, 11, 0, 7); c.fill();
      c.fillStyle = '#202327'; c.beginPath(); c.arc(bx, by, 4, 0, 7); c.fill();
    }
    const grad = c.createLinearGradient(g.bx, 0, g.bx + g.bw, 0);
    grad.addColorStop(0, '#4f9a5b'); grad.addColorStop(0.55, '#c9a24f'); grad.addColorStop(1, '#b3483f');
    c.fillStyle = grad; c.fillRect(g.bx, g.by, g.bw, g.bh);
    c.strokeStyle = 'rgba(236,232,220,.5)'; c.lineWidth = 1; c.strokeRect(g.bx, g.by, g.bw, g.bh);
    if (P.step === 'power' || P.step === 'aim' || P.step === 'sent' || P.step === 'watch') {
      const u = P.step === 'power' ? penPower(now) : P.power;
      c.fillStyle = '#ece8dc'; c.fillRect(g.bx + u * g.bw - 3, g.by - 6, 6, g.bh + 12);
    }
    if (P.step === 'watch' && P.res) {
      c.fillStyle = '#ece8dc'; c.textAlign = 'center'; c.font = '700 ' + Math.round(g.H * 0.16) + 'px Barlow Condensed, Arial Narrow, sans-serif';
      c.fillText(P.res, g.W / 2, g.H * 0.66); c.textAlign = 'start';
    }
  }
  requestAnimationFrame(penDraw);

  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
})();
