// Fafi 27 - oda ve mesaj aktarım sunucusu (oyun mantığı tahtada çalışır)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000 });

// Telefon/tahta eski dosyayı önbellekten açmasın: her seferinde sunucuya sor.
app.use(express.static(__dirname + '/public', { etag: true, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));

const rooms = {}; // kod -> { host: socketId, slots: [socketId|null, socketId|null] }
const makeCode = () => {
  let c;
  do { c = Math.random().toString(36).slice(2, 6).toUpperCase(); } while (rooms[c]);
  return c;
};

io.on('connection', (s) => {
  s.on('host:create', (cb) => {
    const code = makeCode();
    rooms[code] = { host: s.id, slots: [null, null] };
    s.data = { role: 'host', code };
    s.join(code);
    cb && cb({ code });
  });

  s.on('ctrl:join', (d, cb) => {
    const code = String((d && d.code) || '').toUpperCase();
    const r = rooms[code];
    if (!r) return cb && cb({ ok: false, error: 'Oda bulunamadı' });
    const slot = r.slots.indexOf(null);
    if (slot < 0) return cb && cb({ ok: false, error: 'Oda dolu' });
    r.slots[slot] = s.id;
    s.data = { role: 'ctrl', code, slot };
    s.join(code);
    io.to(r.host).emit('slot:joined', { slot });
    cb && cb({ ok: true, slot });
  });

  // telefon -> tahta
  s.on('c2h', (m) => {
    const { role, code, slot } = s.data || {};
    const r = rooms[code];
    if (role === 'ctrl' && r) io.to(r.host).emit('c2h', Object.assign({ slot }, m));
  });

  // tahta -> telefon (slot yoksa ikisine birden)
  s.on('h2c', (d) => {
    const { role, code } = s.data || {};
    const r = rooms[code];
    if (role !== 'host' || !r || !d) return;
    const targets = d.slot === null || d.slot === undefined ? r.slots : [r.slots[d.slot]];
    targets.forEach((id) => id && io.to(id).emit('h2c', d.msg));
  });

  s.on('disconnect', () => {
    const { role, code, slot } = s.data || {};
    const r = rooms[code];
    if (!r) return;
    if (role === 'host') {
      r.slots.forEach((id) => id && io.to(id).emit('h2c', { t: 'hostLeft' }));
      delete rooms[code];
    } else if (role === 'ctrl' && r.slots[slot] === s.id) {
      r.slots[slot] = null;
      io.to(r.host).emit('slot:left', { slot });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Fafi 27 çalışıyor: http://localhost:' + PORT));
