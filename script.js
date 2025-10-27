// ---------- script.js aggiornato: single-play audio, radio link no-stop bgMusic,
// particles safe, maggior fluttuazione, video volume aumentato ----------

// ---------- Variabili DOM ----------
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');
const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo'); // elemento video reale
const demoVideo = document.getElementById('demoVideo'); // a-video entity
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');
const qr = document.getElementById('qrCode');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

// Mappa per tracciare audio in riproduzione (impedisce più istanze)
const playingAudio = {}; // playingAudio[id] = Audio object

// Imposta volume molto alto per il video (quando parte)
try { if (holoVideo) holoVideo.volume = 1.0; } catch (e) { /* ignore */ }

// ----------------- COMPONENTE A-FRAME: face-camera -----------------
AFRAME.registerComponent('face-camera', {
  schema: {
    mode: { type: 'string', default: 'y' }, // 'y' or 'free'
    flip: { type: 'boolean', default: false },
    lockX: { type: 'boolean', default: true },
    lockZ: { type: 'boolean', default: true }
  },
  init: function () {
    this.cameraEl = document.querySelector('#camera');
    this.applyDoubleSideOnce();
    if (this.data.flip) this.applyFlipOnce();
  },
  applyDoubleSideOnce: function() {
    const mesh = this.el.getObject3D && this.el.getObject3D('mesh');
    if (!mesh) {
      setTimeout(()=>this.applyDoubleSideOnce(), 120);
      return;
    }
    try {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
      } else if (mesh.material) {
        mesh.material.side = THREE.DoubleSide;
        mesh.material.needsUpdate = true;
      }
    } catch (e) { /* ignore */ }
  },
  applyFlipOnce: function() {
    const sAttr = this.el.getAttribute('scale') || '1 1 1';
    const parts = (typeof sAttr === 'string' ? sAttr.split(' ') : [sAttr.x, sAttr.y, sAttr.z]);
    const sx = -Math.abs(parseFloat(parts[0] || 1));
    const sy = parseFloat(parts[1] || 1);
    const sz = parseFloat(parts[2] || 1);
    this.el.setAttribute('scale', `${sx} ${sy} ${sz}`);
  },
  tick: (function () {
    const itemPos = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    return function () {
      const camEl = this.cameraEl;
      if (!camEl || !camEl.object3D) return;
      if (!this.el.object3D) return;

      this.el.object3D.getWorldPosition(itemPos);
      camEl.object3D.getWorldPosition(camPos);

      if (this.data.mode === 'free') {
        this.el.object3D.lookAt(camPos);
        if (this.data.lockX || this.data.lockZ) {
          const ry = this.el.object3D.rotation.y;
          const rx = this.data.lockX ? 0 : this.el.object3D.rotation.x;
          const rz = this.data.lockZ ? 0 : this.el.object3D.rotation.z;
          this.el.object3D.rotation.set(rx, ry, rz);
        }
      } else {
        const dx = camPos.x - itemPos.x;
        const dz = camPos.z - itemPos.z;
        const angle = Math.atan2(dx, dz);
        this.el.object3D.rotation.set(0, angle + Math.PI, 0);
      }
    };
  })()
});

// ----------------- Funzioni principali dell'esperienza -----------------

startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch (e) { /* autoplay blocked */ }
  startOverlay.style.display = 'none';
  try { await startCameraWithRetries(); } catch (e) { alert('Impossibile avviare la fotocamera.'); return; }

  qr.setAttribute('position', '0 1.2 -1.5'); qr.setAttribute('scale', '1.3 1.3 1');
  demoVideo.setAttribute('position', '0 1.2 -1.5');
  replayLogo.setAttribute('position', '-0.9 1.2 -1.5'); whatsappLogo.setAttribute('position', '0.9 1.2 -1.5');
  replayLogo.setAttribute('visible', false); whatsappLogo.setAttribute('visible', false);
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  distributeItemsCircle(2.0, 2.2);
  createParticles(48); // più particelle ma leggere
  createSmoke(28);
  animateLight();
  setupInteractions();

  // Applica face-camera (Y-only) con flip a TUTTI gli item
  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('face-camera', 'mode: y; flip: true; lockX: true; lockZ: true');
    // Aggiungi leggera rotazione continua e pulsazione (usando nomi distinti per evitare conflitti)
    // rotazione lenta Y
    el.setAttribute('animation__rotate', `property: rotation; to: 0 ${ (Math.random()*30 - 15).toFixed(2) } 0; dur:${8000 + Math.random()*6000}; dir:alternate; loop:true; easing:linear`);
    // oscillazione verticale più ampia
    const amp = 0.18 + Math.random()*0.15; // aumentata ampiezza rispetto a prima
    const dur = 1200 + Math.random()*1200;
    const pos = el.getAttribute('position') || '0 1.6 -1.5';
    // manteniamo l'asse X/Z fissi ma animiamo Y
    // assegniamo animazione con nome specifico
    el.setAttribute('animation__float', `property: position; to: ${pos.split(' ')[0]} ${(parseFloat(pos.split(' ')[1]) + amp).toFixed(3)} ${pos.split(' ')[2]}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
  });
});

// ---------- CAMERA ----------
async function startCameraWithRetries() {
  cameraStreamEl.setAttribute('playsinline', ''); cameraStreamEl.setAttribute('webkit-playsinline', '');
  cameraStreamEl.setAttribute('autoplay', ''); cameraStreamEl.setAttribute('muted', ''); cameraStreamEl.setAttribute('crossorigin', 'anonymous');
  cameraStreamEl.style.objectFit = 'cover';
  const attempts = [{ video: { facingMode: { ideal: 'environment' } }, audio: false }, { video: { facingMode: 'environment' }, audio: false }, { video: true, audio: false }];
  let lastErr = null, stream = null;
  for (const c of attempts) {
    try { stream = await navigator.mediaDevices.getUserMedia(c); if (stream) break; } catch (e) { lastErr = e; await wait(180); }
  }
  if (!stream) throw lastErr || new Error('Nessuno stream');
  cameraStreamEl.srcObject = stream; cameraStreamEl.muted = true; cameraStreamEl.playsInline = true;
  try { const p = cameraStreamEl.play(); if (p && p.then) await p } catch (e) { /* ignore */ }
  await new Promise(r => { let done = false; function onPlay() { if (done) return; done = true; cameraStreamEl.removeEventListener('playing', onPlay); r(); } cameraStreamEl.addEventListener('playing', onPlay); setTimeout(() => { if (!done) { done = true; cameraStreamEl.removeEventListener('playing', onPlay); r(); } }, 1800); });
  document.getElementById('cameraSky').setAttribute('material', 'shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(document.getElementById('cameraSky'), 1400, 80);
}

function forceSkyTextureUpdate(skyEl, d = 1400, i = 80) {
  const start = Date.now(); const tid = setInterval(() => {
    try { const mesh = skyEl.getObject3D('mesh'); if (mesh && mesh.material && mesh.material.map) { mesh.material.map.needsUpdate = true; mesh.material.needsUpdate = true; } } catch (e) { }
    if (Date.now() - start > d) clearInterval(tid);
  }, i);
}

// ---------- ITEMS SU CERCHIO, ANIMAZIONI ----------
function distributeItemsCircle(radius = 2.0, height = 2.2) {
  const count = itemIds.length;
  const angleStep = (2 * Math.PI) / count;
  itemIds.forEach((id, i) => {
    const el = document.getElementById(id); if (!el) return;
    const angle = i * angleStep + (Math.random() * 0.2 - 0.1);
    const x = radius * Math.cos(angle), z = radius * Math.sin(angle), y = height;
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '0.98 0.98 0.98');

    el.classList.add('clickable');

    // Fluttuazione maggiore: amp e durata più variabili
    const amp = 0.18 + Math.random() * 0.15;
    const dur = 1000 + Math.random() * 2000;
    el.setAttribute('animation__float', `property: position; to: ${x.toFixed(3)} ${(y + amp).toFixed(3)} ${z.toFixed(3)}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);

    // oscillazione leggera su scala per effetto "respiro"
    const scaleAmp = 0.03 + Math.random()*0.03;
    const scaleDur = 900 + Math.random()*1600;
    el.setAttribute('animation__pulse', `property: scale; to: ${(0.98+scaleAmp).toFixed(3)} ${(0.98+scaleAmp).toFixed(3)} 1; dur:${scaleDur}; dir:alternate; loop:true; easing:easeInOutSine`);
  });
}

// ---------- PARTICLES, FUMO, LUCE ----------
function createParticles(count = 32) {
  const root = document.getElementById('particles');
  while (root.firstChild) root.removeChild(root.firstChild);
  for (let i = 0; i < count; i++) {
    const s = document.createElement('a-sphere');
    const px = (Math.random() * 2 - 1) * 3;
    const py = Math.random() * 2 + 0.2; // leggermente più basso
    const pz = (Math.random() * 2 - 1) * 3;
    s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius', (0.03 + Math.random() * 0.06).toFixed(3)); // un po' più grandi
    s.setAttribute('color', '#ff2b2b');
    // animazione con nome specifico per evitare conflitti
    const tx = px + (Math.random() * 1.2 - 0.6);
    const ty = py + (Math.random() * 1.2 - 0.3);
    const tz = pz + (Math.random() * 1.2 - 0.6);
    const dur = 1200 + Math.random() * 2600;
    s.setAttribute('animation__move', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
    s.setAttribute('opacity', 0.95 - Math.random()*0.5);
    root.appendChild(s);
  }
}

function createSmoke(count = 20) {
  const root = document.getElementById('particles');
  for (let i = 0; i < count; i++) {
    const e = document.createElement('a-cylinder');
    const px = (Math.random() * 2 - 1) * 3;
    const py = 0.2 + Math.random() * 1.6;
    const pz = (Math.random() * 2 - 1) * 3;
    e.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    e.setAttribute('radius', 0.03 + Math.random()*0.02);
    e.setAttribute('height', 0.6 + Math.random() * 0.8);
    e.setAttribute('color', '#ff1111');
    e.setAttribute('opacity', 0.35 + Math.random()*0.25);
    const dur = 1400 + Math.random() * 2200;
    e.setAttribute('animation__rise', `property: position; to: ${px.toFixed(3)} ${(py + 0.6 + Math.random()*0.6).toFixed(3)} ${pz.toFixed(3)}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
    root.appendChild(e);
  }
}

function animateLight() {
  const light = document.getElementById('pulseLight');
  light.setAttribute('animation', 'property: intensity; to:1.4; dur:1000; dir:alternate; loop:true; easing:easeInOutSine');
}

// ---------- INTERAZIONI (video, audio, click) ----------
function setupInteractions() {
  // Ora radio è link diretto; altri audio locali gestiti da playingAudio
  const audioMap = { 'Fantacalcio': 'fantacalcio.mp3', 'Dj': 'dj.mp3' };
  const linkMap = {
    'DonBosco': 'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble': 'https://www.instagram.com/etnaensemble/',
    'Catania': 'https://www.instagram.com/officialcataniafc/',
    'Eduverse': 'https://www.instagram.com/eduverse___/',
    'Radio': 'https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa?si=043e9baf88924a82',
    'Tromba': 'https://youtu.be/AMK10N6wwHM',
    'Ballerino': 'https://youtu.be/JS_BY3LRBqw'
  };

  preserveVideoAspect();

  // QR -> mostra video e mette in pausa bgMusic (salvando tempo)
  qr.addEventListener('click', async () => {
    qr.setAttribute('visible', false); demoVideo.setAttribute('visible', true);
    try {
      // Assicuriamoci che il video abbia volume alto
      try { holoVideo.volume = 1.0; } catch (e) {}
      await holoVideo.play();
      bgSavedTime = bgMusic.currentTime;
      bgMusic.pause();
    } catch (e) {
      videoTapOverlay.style.display = 'flex';
    }
  });

  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try { holoVideo.volume = 1.0; await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch (e) { alert('Impossibile avviare il video'); }
  });

  // Quando il video finisce: mostra loghi e riavvia bgMusic
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible', false);
    replayLogo.setAttribute('visible', true);
    whatsappLogo.setAttribute('visible', true);
    replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch (e) { }
  });

  // Replay e whatsapp (stesso comportamento)
  replayLogo.addEventListener('click', async () => {
    if (!replayLogo.getAttribute('visible')) return;
    replayLogo.setAttribute('visible', false); whatsappLogo.setAttribute('visible', false);
    replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible', true);
    try { holoVideo.volume = 1.0; await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch (e) { videoTapOverlay.style.display = 'flex'; }
  });
  whatsappLogo.addEventListener('click', () => {
    if (!whatsappLogo.getAttribute('visible')) return;
    window.open('https://wa.me/1234567890', '_blank');
  });

  // Item click handling
  itemIds.forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('click', () => {
      // If linkMap contains id -> open link (Radio included)
      if (linkMap[id]) {
        window.open(linkMap[id], '_blank');
        return;
      }
      // Otherwise check audioMap for local mp3s
      if (audioMap[id]) {
        // se già in riproduzione ignoriamo click
        if (playingAudio[id]) return;
        try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch (e) { }
        const a = new Audio(audioMap[id]);
        a.preload = 'auto';
        a.play().catch(()=>{/* autoplay policy might block until user gesture */});
        playingAudio[id] = a;
        a.addEventListener('ended', () => {
          try { delete playingAudio[id]; bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch (e) { delete playingAudio[id]; }
        });
        a.addEventListener('error', () => { try { delete playingAudio[id]; bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch (e) { delete playingAudio[id]; } });
        return;
      }
      // Fallback generico
      window.open('https://instagram.com', '_blank');
    });
  });
}

// Mantieni l'aspect ratio del video olografico
function preserveVideoAspect() {
  const src = holoVideo.querySelector('source') ? holoVideo.querySelector('source').src : holoVideo.src;
  if (!src) return;
  const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = src; probe.muted = true; probe.playsInline = true;
  probe.addEventListener('loadedmetadata', () => {
    const w = probe.videoWidth, h = probe.videoHeight;
    if (w && h) {
      const aspect = w / h, baseH = 1.0; const sx = baseH * aspect, sy = baseH;
      demoVideo.setAttribute('scale', `${sx} ${sy} 1`);
    }
  });
  probe.load();
}

// ---------- Pulizia eventi on unload ----------
window.addEventListener('beforeunload', () => {
  try { bgMusic.pause(); } catch (e) { }
  try { holoVideo.pause(); } catch (e) { }
  // stop any playing audios
  Object.keys(playingAudio).forEach(k => { try { playingAudio[k].pause(); } catch(e){} });
});