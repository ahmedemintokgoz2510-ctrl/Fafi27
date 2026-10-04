// Fafi 27 - telefon (gamepad) tarafı
(function () {
  'use strict';
  const CFG = window.FAFI, $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let room = (params.get('room') || '').toUpperCase(), slot = null, myTeam = null, phase = 'join', sprintEnabled = false;
  const socket = io({ transports: ['websocket', 'polling'] });

  function show(id) {
    ['join', 'wait', 'pick', 'end'].forEach((s) => $(s).classList.toggle('on', s === id));
    $('pad').classList.toggle('on', id === 'pad');
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
      else if (m.phase === 'end') {
        const [a, b] = m.score || [0, 0];
        $('endTitle').textContent = a === b ? 'Berabere' : (a > b ? 0 : 1) === myTeam ? 'Kazandın' : 'Kaybettin';
        $('endScore').textContent = CFG.teams[0].name + ' ' + a + ' - ' + b + ' ' + CFG.teams[1].name;
        show('end');
      }
    } else if (m.t === 'taken') {
      if (phase === 'pick') { myTeam = m.taken[slot]; drawCards(m.taken); }
    } else if (m.t === 'pickFail') { $('pickMsg').textContent = 'Bu takım seçildi, diğerini seç'; }
    else if (m.t === 'vib' && navigator.vibrate) navigator.vibrate(m.ms);
    else if (m.t === 'hostLeft') { phase = 'join'; wait('Bağlantı koptu', 'Tahtadaki oyun kapandı. QR kodu yeniden okut.'); }
  });
  $('again').onclick = () => socket.emit('c2h', { t: 'rematch' });

  // ---------- gamepad ----------
  function openPad() {
    const t = CFG.teams[myTeam] || CFG.teams[0];
    document.documentElement.style.setProperty('--team', t.color);
    $('teamName').textContent = t.name;
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
    sx = sy = 0; socket.emit('c2h', { t: 'mv', x: 0, y: 0 });
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
      sx = vx; sy = vy; socket.volatile.emit('c2h', { t: 'mv', x: +vx.toFixed(2), y: +vy.toFixed(2) });
    }
  }, 33);

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
    const fill = name === 'shoot' ? $('chargeFill') : name === 'pass' ? $('passChargeFill') : name === 'slide' ? $('slideChargeFill') : null;
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

  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
})();
